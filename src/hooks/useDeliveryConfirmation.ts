import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface DeliveryConfirmation {
    deliveryId: string;
    markedBy: string;
    deliveryProofUrl?: string;
    notes?: string;
    offlineMarked?: boolean;
}

export interface AdminCorrection {
    deliveryId: string;
    newStatus: "delivered" | "missed" | "paused" | "upcoming";
    correctionReason: string;
}

export interface AuditLogEntry {
    id: string;
    delivery_id: string;
    user_id: string;
    changed_by: string;
    old_status: string | null;
    new_status: string;
    change_reason: string | null;
    is_admin_correction: boolean;
    billing_month_locked: boolean;
    metadata: Record<string, any>;
    created_at: string;
}

/**
 * Hook for marking delivery as delivered (one-click confirmation)
 * This automatically updates the calendar in real-time
 */
export function useMarkDeliveryDelivered() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({
            deliveryId,
            markedBy,
            deliveryProofUrl,
            notes,
            offlineMarked = false,
        }: DeliveryConfirmation) => {
            if (!user?.id) throw new Error("Not authenticated");

            const { data, error } = await supabase.rpc("mark_delivery_delivered", {
                _delivery_id: deliveryId,
                _marked_by: markedBy,
                _delivery_proof_url: deliveryProofUrl || null,
                _notes: notes || null,
                _offline_marked: offlineMarked,
            });

            if (error) throw error;

            // Parse the JSONB response
            const result = data as { success: boolean; error?: string };

            if (!result.success) {
                throw new Error(result.error || "Failed to mark delivery");
            }

            return result;
        },
        onSuccess: (data) => {
            // Invalidate all delivery queries to trigger re-fetch
            queryClient.invalidateQueries({ queryKey: ["deliveries"] });
            queryClient.invalidateQueries({ queryKey: ["receipts"] });

            toast.success("Delivery marked as delivered!", {
                description: "Calendar updated automatically",
            });
        },
        onError: (error: Error) => {
            toast.error("Failed to mark delivery", {
                description: error.message,
            });
        },
    });
}

/**
 * Hook for admin corrections with audit trail
 */
export function useAdminCorrectDelivery() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({
            deliveryId,
            newStatus,
            correctionReason,
        }: AdminCorrection) => {
            if (!user?.id) throw new Error("Not authenticated");

            const { data, error } = await supabase.rpc("admin_correct_delivery", {
                _delivery_id: deliveryId,
                _admin_id: user.id,
                _new_status: newStatus,
                _correction_reason: correctionReason,
            });

            if (error) throw error;

            const result = data as { success: boolean; error?: string };

            if (!result.success) {
                throw new Error(result.error || "Failed to correct delivery");
            }

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deliveries"] });
            queryClient.invalidateQueries({ queryKey: ["audit_logs"] });

            toast.success("Delivery corrected successfully", {
                description: "Audit log entry created",
            });
        },
        onError: (error: Error) => {
            toast.error("Failed to correct delivery", {
                description: error.message,
            });
        },
    });
}

/**
 * Hook for fetching delivery audit logs
 */
export function useDeliveryAuditLogs(deliveryId?: string) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["audit_logs", deliveryId],
        queryFn: async () => {
            if (!user?.id) return [];

            let query = supabase
                .from("delivery_audit_log")
                .select("*")
                .order("created_at", { ascending: false });

            if (deliveryId) {
                query = query.eq("delivery_id", deliveryId);
            } else {
                query = query.eq("user_id", user.id);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data as AuditLogEntry[];
        },
        enabled: !!user?.id,
    });
}

/**
 * Hook for real-time delivery status updates
 * Listens to PostgreSQL NOTIFY events and updates the UI instantly
 */
export function useRealtimeDeliveryUpdates() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    useEffect(() => {
        if (!user?.id) return;

        let channel: RealtimeChannel;

        const setupRealtimeListener = async () => {
            // Subscribe to delivery status changes
            channel = supabase
                .channel("delivery-status-changes")
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "deliveries",
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log("🔔 Real-time delivery update:", payload);

                        // Invalidate queries to trigger re-fetch
                        queryClient.invalidateQueries({ queryKey: ["deliveries"] });

                        // Show toast notification
                        const newRecord = payload.new as any;
                        if (newRecord.status === "delivered") {
                            toast.success("Delivery confirmed!", {
                                description: `Your delivery for ${newRecord.delivery_date} has been marked as delivered`,
                            });
                        }
                    }
                )
                .subscribe();

            console.log("✅ Real-time delivery listener active");
        };

        setupRealtimeListener();

        // Cleanup on unmount
        return () => {
            if (channel) {
                supabase.removeChannel(channel);
                console.log("🔌 Real-time delivery listener disconnected");
            }
        };
    }, [user?.id, queryClient]);
}

/**
 * Hook for checking if a month is locked for billing
 */
export function useIsMonthLocked(userId: string, deliveryDate: string) {
    return useQuery({
        queryKey: ["month_locked", userId, deliveryDate],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("is_month_locked_for_billing", {
                _user_id: userId,
                _delivery_date: deliveryDate,
            });

            if (error) throw error;
            return data as boolean;
        },
        enabled: !!userId && !!deliveryDate,
    });
}

/**
 * Hook for locking a month after billing
 */
export function useLockMonthForBilling() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            billingMonth,
        }: {
            userId: string;
            billingMonth: string;
        }) => {
            const { data, error } = await supabase.rpc("lock_month_for_billing", {
                _user_id: userId,
                _billing_month: billingMonth,
            });

            if (error) throw error;

            const result = data as { success: boolean; locked_count: number };
            return result;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["deliveries"] });

            toast.success("Month locked for billing", {
                description: `${data.locked_count} deliveries locked`,
            });
        },
        onError: (error: Error) => {
            toast.error("Failed to lock month", {
                description: error.message,
            });
        },
    });
}

/**
 * Hook for offline delivery marking with auto-sync
 * Stores deliveries in localStorage when offline and syncs when online
 */
export function useOfflineDeliverySync() {
    const markDelivery = useMarkDeliveryDelivered();
    const queryClient = useQueryClient();

    const syncOfflineDeliveries = useCallback(async () => {
        const offlineKey = "offline_deliveries";
        const offlineData = localStorage.getItem(offlineKey);

        if (!offlineData) return;

        const offlineDeliveries = JSON.parse(offlineData) as DeliveryConfirmation[];

        if (offlineDeliveries.length === 0) return;

        console.log(`📤 Syncing ${offlineDeliveries.length} offline deliveries...`);

        for (const delivery of offlineDeliveries) {
            try {
                await markDelivery.mutateAsync({
                    ...delivery,
                    offlineMarked: true,
                });
            } catch (error) {
                console.error("Failed to sync offline delivery:", error);
            }
        }

        // Clear offline storage after successful sync
        localStorage.removeItem(offlineKey);
        queryClient.invalidateQueries({ queryKey: ["deliveries"] });

        toast.success("Offline deliveries synced!", {
            description: `${offlineDeliveries.length} deliveries updated`,
        });
    }, [markDelivery, queryClient]);

    // Auto-sync when coming back online
    useEffect(() => {
        const handleOnline = () => {
            console.log("🌐 Back online - syncing offline deliveries...");
            syncOfflineDeliveries();
        };

        window.addEventListener("online", handleOnline);

        // Sync immediately if online
        if (navigator.onLine) {
            syncOfflineDeliveries();
        }

        return () => {
            window.removeEventListener("online", handleOnline);
        };
    }, [syncOfflineDeliveries]);

    const markOffline = useCallback((delivery: DeliveryConfirmation) => {
        const offlineKey = "offline_deliveries";
        const existing = localStorage.getItem(offlineKey);
        const deliveries = existing ? JSON.parse(existing) : [];

        deliveries.push(delivery);
        localStorage.setItem(offlineKey, JSON.stringify(deliveries));

        toast.info("Delivery saved offline", {
            description: "Will sync when connection is restored",
        });
    }, []);

    return {
        markOffline,
        syncOfflineDeliveries,
    };
}
