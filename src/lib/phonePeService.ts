// Real Server-Side PhonePe Payment Gateway Service
// All signing, merchant credentials, and verification remain strictly server-side (Supabase Edge Functions).
import { supabase } from "@/integrations/supabase/client";

export interface PhonePePaymentRequest {
    purpose: 'cart_checkout' | 'cart_checkout_now' | 'wallet_topup' | 'wallet_recharge';
    amount?: number;
    items?: Array<{ id: string; quantity: number }>;
    deliveryDate?: string;
    redirectUrl?: string;
}

export interface PhonePePaymentResponse {
    success: boolean;
    merchantTransactionId?: string;
    paymentUrl?: string;
    code?: string;
    message?: string;
    amount?: number;
}

export interface PaymentStatusResponse {
    status: 'pending' | 'paid' | 'failed' | 'not_configured';
    success: boolean;
    merchantTransactionId?: string;
    verifiedSource?: 'database' | 'phonepe_gateway';
    message?: string;
    notConfigured?: boolean;
}

class PhonePeService {
    /**
     * Initiate a payment via secure server-side Edge Function.
     * The Edge Function calculates and validates the authoritative amount from public.products.
     */
    async initiatePayment(request: PhonePePaymentRequest): Promise<PhonePePaymentResponse> {
        try {
            const { data, error } = await supabase.functions.invoke('phonepe-initiate', {
                body: {
                    purpose: request.purpose,
                    items: request.items,
                    amount: request.amount,
                    deliveryDate: request.deliveryDate,
                    redirectUrl: request.redirectUrl || `${window.location.origin}/payment/success`,
                },
            });

            if (error) {
                return {
                    success: false,
                    code: 'INVOCATION_ERROR',
                    message: error.message || 'Failed to connect to payment server.',
                };
            }

            return data as PhonePePaymentResponse;
        } catch (err: unknown) {
            console.error('PhonePe initiate error:', err);
            const msg = err instanceof Error ? err.message : 'Payment initiation failed';
            return {
                success: false,
                code: 'NETWORK_ERROR',
                message: msg,
            };
        }
    }

    /**
     * Check payment status authoritatively from server-side Edge Function.
     * Checks database order payment_status first, then verifies with PhonePe API if still pending.
     */
    async checkPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
        try {
            const { data, error } = await supabase.functions.invoke('phonepe-status', {
                body: { txnId: transactionId },
            });

            if (error) {
                // If Edge Function is unavailable or throws, check database directly via client RLS
                const { data: dbOrders } = await supabase
                    .from('orders')
                    .select('payment_status, status')
                    .ilike('notes', `%${transactionId}%`);

                if (dbOrders && dbOrders.length > 0) {
                    const isAllPaid = dbOrders.every(o => o.payment_status === 'paid');
                    const isAnyFailed = dbOrders.some(o => o.payment_status === 'failed');

                    if (isAllPaid) {
                        return { status: 'paid', success: true, merchantTransactionId: transactionId, verifiedSource: 'database' };
                    }
                    if (isAnyFailed) {
                        return { status: 'failed', success: false, merchantTransactionId: transactionId, verifiedSource: 'database' };
                    }
                }

                return {
                    status: 'pending',
                    success: false,
                    merchantTransactionId: transactionId,
                    message: error.message,
                };
            }

            return data as PaymentStatusResponse;
        } catch (err: unknown) {
            console.error('PhonePe check status error:', err);
            return {
                status: 'pending',
                success: false,
                merchantTransactionId: transactionId,
                message: err instanceof Error ? err.message : 'Status check failed',
            };
        }
    }

    /**
     * Get supported payment channels powered by PhonePe
     */
    getSupportedPaymentMethods(): string[] {
        return ['UPI', 'Credit Card', 'Debit Card', 'Net Banking'];
    }
}

// Export singleton instance
export const phonePeService = new PhonePeService();
