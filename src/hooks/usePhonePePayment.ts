import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { phonePeService, PhonePePaymentRequest } from "@/lib/phonePeService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useInitiatePhonePePayment() {
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (request: Omit<PhonePePaymentRequest, 'userId' | 'userName'>) => {
            if (!user?.id) throw new Error("Not authenticated");

            const paymentRequest: PhonePePaymentRequest = {
                ...request,
                userId: user.id,
                userName: user.user_metadata?.full_name || user.email || 'User',
                userEmail: user.email,
            };

            const response = await phonePeService.initiatePayment(paymentRequest);

            if (!response.success) {
                throw new Error(response.message || "Failed to initiate payment");
            }

            return response;
        },
    });
}

export function useCheckPaymentStatus(transactionId: string | null) {
    return useQuery({
        queryKey: ["payment-status", transactionId],
        queryFn: async () => {
            if (!transactionId) return null;
            return await phonePeService.checkPaymentStatus(transactionId);
        },
        enabled: !!transactionId,
        refetchInterval: (query) => {
            // Stop refetching if payment is completed (success or failed)
            const data = query.state.data;
            if (data?.status === 'success' || data?.status === 'failed') {
                return false;
            }
            // Refetch every 2 seconds while pending
            return 2000;
        },
    });
}

export function useCompletePhonePePayment() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({
            transactionId,
            amount,
            purpose,
            deliveryId,
        }: {
            transactionId: string;
            amount: number;
            purpose: string;
            deliveryId?: string;
        }) => {
            if (!user?.id) throw new Error("Not authenticated");

            // Check payment status
            const status = await phonePeService.checkPaymentStatus(transactionId);

            if (status.status !== 'success') {
                throw new Error("Payment not successful");
            }

            // Update wallet if purpose is wallet_recharge or delivery payment or cart_checkout
            // Update wallet if purpose is wallet_recharge or delivery payment or cart_checkout
            if (purpose === 'wallet_recharge' || purpose === 'delivery' || purpose === 'cart_checkout' || purpose === 'cart_checkout_now') {
                // Get wallet
                const { data: wallet, error: walletError } = await supabase
                    .from("wallets")
                    .select("id, balance")
                    .eq("user_id", user.id)
                    .single();

                if (walletError) throw walletError;

                // Update wallet balance
                const { error: updateError } = await supabase
                    .from("wallets")
                    .update({ balance: wallet.balance + amount })
                    .eq("id", wallet.id);

                if (updateError) throw updateError;

                // Record transaction
                await supabase
                    .from("wallet_transactions")
                    .insert({
                        wallet_id: wallet.id,
                        user_id: user.id,
                        amount: amount,
                        type: "credit",
                        description: `PhonePe payment - ${purpose === 'wallet_recharge' ? 'Wallet Recharge' : (purpose.includes('cart_checkout') ? 'Order Payment' : 'Delivery Payment')}`,
                        reference_id: transactionId,
                    });

                // CART CHECKOUT LOGIC FOR DEV MODE
                if (purpose === 'cart_checkout' || purpose === 'cart_checkout_now') {
                    // ✅ CHECK DEVELOPMENT MODE 
                    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
                    if (isDevMode) {
                        try {
                            const cartItems = JSON.parse(localStorage.getItem('delightmilk_cart') || '[]');
                            const storedDeliveries = JSON.parse(localStorage.getItem('dev_delivery_calendar') || '[]');

                            // Determine Delivery Date
                            const isNow = purpose === 'cart_checkout_now';
                            const deliveryDateObj = new Date();
                            if (!isNow) {
                                deliveryDateObj.setDate(deliveryDateObj.getDate() + 1); // Tomorrow
                            }
                            const deliveryDate = deliveryDateObj.toISOString().split('T')[0];

                            const newDeliveries = cartItems.map((item: any) => ({
                                id: `order_${Date.now()}_${item.id}_${Math.random().toString(36).substr(2, 5)}`,
                                user_id: user.id,
                                product_id: item.id,
                                delivery_date: deliveryDate,
                                status: 'scheduled',
                                quantity: item.quantity,
                                created_at: new Date().toISOString(),
                                product: {
                                    product_name: item.name,
                                    unit: item.unit || 'Unit',
                                    price_per_unit: item.price
                                },
                                delivery_boy: null
                            }));

                            localStorage.setItem('dev_delivery_calendar', JSON.stringify([...storedDeliveries, ...newDeliveries]));

                            // 🔔 CREATE ADMIN NOTIFICATION
                            const storedNotifications = JSON.parse(localStorage.getItem('dev_admin_notifications') || '[]');
                            const newNotification = {
                                id: `notif_${Date.now()}`,
                                type: 'new_order',
                                message: `New Order: ${user.user_metadata?.full_name || user.email} ordered ${cartItems.length} item(s) for ${isNow ? 'Today' : 'Tomorrow'}.`,
                                date: new Date().toISOString(),
                                read: false,
                                link: '/admin/deliveries'
                            };
                            localStorage.setItem('dev_admin_notifications', JSON.stringify([newNotification, ...storedNotifications]));

                            console.log("Cart items converted to deliveries", newDeliveries);
                        } catch (e) {
                            console.error("Failed to process cart items", e);
                        }
                    }
                }
            }

            // Clean up payment data
            phonePeService.clearPaymentData(transactionId);

            return { success: true, amount };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
            queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
        },
    });
}
