// Mock PhonePe Payment Gateway Service
// This simulates the PhonePe payment flow for testing
// Replace with real PhonePe API integration when credentials are available

export interface PhonePePaymentRequest {
    amount: number;
    userId: string;
    userName: string;
    userEmail?: string;
    userPhone?: string;
    purpose: string; // 'delivery' or 'wallet_recharge'
    deliveryId?: string;
}

export interface PhonePePaymentResponse {
    success: boolean;
    transactionId: string;
    merchantTransactionId: string;
    paymentUrl: string;
    message?: string;
}

export interface PaymentStatus {
    transactionId: string;
    status: 'pending' | 'success' | 'failed';
    amount: number;
    paymentMethod?: string;
    timestamp: string;
}

class MockPhonePeService {
    private baseUrl = '/payment'; // Mock payment page route

    /**
     * Initiate a payment
     * In production, this would call PhonePe API
     */
    async initiatePayment(request: PhonePePaymentRequest): Promise<PhonePePaymentResponse> {
        // Simulate API delay
        await this.delay(500);

        // Generate unique transaction IDs
        const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        const merchantTransactionId = `MT${Date.now()}`;

        // In production, this would:
        // 1. Create SHA256 signature
        // 2. Call PhonePe /pay API
        // 3. Return actual payment URL

        // Mock response
        const paymentUrl = `${this.baseUrl}/process?txnId=${transactionId}&amount=${request.amount}&purpose=${request.purpose}&deliveryId=${request.deliveryId || ''}`;

        return {
            success: true,
            transactionId,
            merchantTransactionId,
            paymentUrl,
            message: 'Payment initiated successfully'
        };
    }

    /**
     * Check payment status
     * In production, this would call PhonePe /status API
     */
    async checkPaymentStatus(transactionId: string): Promise<PaymentStatus> {
        // Simulate API delay
        await this.delay(300);

        // In production, this would:
        // 1. Create SHA256 signature
        // 2. Call PhonePe /status API
        // 3. Verify response signature
        // 4. Return actual status

        // Mock: Check localStorage for simulated payment result
        const storedStatus = localStorage.getItem(`payment_${transactionId}`);

        if (storedStatus) {
            return JSON.parse(storedStatus);
        }

        // Default pending status
        return {
            transactionId,
            status: 'pending',
            amount: 0,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Simulate payment completion (for testing)
     * In production, this would be handled by PhonePe webhook
     */
    simulatePaymentCompletion(
        transactionId: string,
        amount: number,
        success: boolean,
        paymentMethod: string = 'UPI'
    ): void {
        const status: PaymentStatus = {
            transactionId,
            status: success ? 'success' : 'failed',
            amount,
            paymentMethod,
            timestamp: new Date().toISOString()
        };

        localStorage.setItem(`payment_${transactionId}`, JSON.stringify(status));
    }

    /**
     * Clear payment data (cleanup)
     */
    clearPaymentData(transactionId: string): void {
        localStorage.removeItem(`payment_${transactionId}`);
    }

    /**
     * Utility: Delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get supported payment methods
     */
    getSupportedPaymentMethods(): string[] {
        return [
            'UPI',
            'Credit Card',
            'Debit Card',
            'Net Banking',
            'Wallets'
        ];
    }
}

// Export singleton instance
export const phonePeService = new MockPhonePeService();

// Production implementation would look like:
/*
class PhonePeService {
  private merchantId: string;
  private saltKey: string;
  private saltIndex: string;
  private baseUrl: string;

  constructor() {
    this.merchantId = import.meta.env.VITE_PHONEPE_MERCHANT_ID;
    this.saltKey = import.meta.env.VITE_PHONEPE_SALT_KEY;
    this.saltIndex = import.meta.env.VITE_PHONEPE_SALT_INDEX;
    this.baseUrl = import.meta.env.VITE_PHONEPE_ENVIRONMENT === 'PRODUCTION'
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  }

  async initiatePayment(request: PhonePePaymentRequest): Promise<PhonePePaymentResponse> {
    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: `MT${Date.now()}`,
      merchantUserId: request.userId,
      amount: request.amount * 100, // Convert to paise
      redirectUrl: `${window.location.origin}/payment/callback`,
      redirectMode: 'POST',
      callbackUrl: `${window.location.origin}/api/phonepe-webhook`,
      mobileNumber: request.userPhone,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    const base64Payload = btoa(JSON.stringify(payload));
    const signature = await this.generateSignature(base64Payload);

    const response = await fetch(`${this.baseUrl}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': signature
      },
      body: JSON.stringify({
        request: base64Payload
      })
    });

    const data = await response.json();
    return {
      success: data.success,
      transactionId: data.data.transactionId,
      merchantTransactionId: payload.merchantTransactionId,
      paymentUrl: data.data.instrumentResponse.redirectInfo.url,
      message: data.message
    };
  }

  private async generateSignature(payload: string): Promise<string> {
    const stringToHash = payload + '/pg/v1/pay' + this.saltKey;
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hashHex}###${this.saltIndex}`;
  }
}
*/
