import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { phonePeService, PhonePePaymentRequest } from "@/lib/phonePeService";
import { useAuth } from "@/contexts/AuthContext";

export function useInitiatePhonePePayment() {
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (request: PhonePePaymentRequest) => {
            if (!user?.id) throw new Error("Not authenticated");
            const response = await phonePeService.initiatePayment(request);

            if (!response.success && response.code !== 'PHONEPE_NOT_CONFIGURED') {
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
            // Stop polling once payment is definitively completed or failed
            const data = query.state.data;
            if (data?.status === 'paid' || data?.status === 'failed' || data?.notConfigured) {
                return false;
            }
            // Poll every 3 seconds while pending
            return 3000;
        },
    });
}

export function useCompletePhonePePayment() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({
            transactionId,
        }: {
            transactionId: string;
            amount?: number;
            purpose?: string;
            deliveryId?: string;
        }) => {
            if (!user?.id) throw new Error("Not authenticated");

            // Verify payment status authoritatively from server-side Edge Function / PostgreSQL
            const status = await phonePeService.checkPaymentStatus(transactionId);

            if (status.status !== 'paid') {
                if (status.notConfigured) {
                    throw new Error("PhonePe merchant credentials are not configured on the server.");
                }
                throw new Error(status.message || "Payment has not yet been confirmed by PhonePe gateway. Please wait or check your bank account.");
            }

            return { success: true, verifiedSource: status.verifiedSource };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["deliveries"] });
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
            queryClient.invalidateQueries({ queryKey: ["wallet_transactions"] });
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}
