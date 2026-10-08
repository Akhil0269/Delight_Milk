// Notifications Hook
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    is_deleted: boolean;
    related_order_id?: string | null;
    related_subscription_id?: string | null;
    related_transaction_id?: string | null;
    action_url: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    read_at: string | null;
}

// Fetch all notifications for current user
export function useNotifications() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["notifications", user?.id],
        queryFn: async () => {
            if (!user) return [];

            try {
                const { data, error } = await supabase
                    .from("notifications")
                    .select("*")
                    .eq("user_id", user.id)
                    .eq("is_deleted", false)
                    .order("created_at", { ascending: false })
                    .limit(50);

                if (error) {
                    console.warn("Notifications fetch error:", error);
                    return [];
                }
                return (data || []) as Notification[];
            } catch (err) {
                console.warn("Notifications query error:", err);
                return [];
            }
        },
        enabled: !!user,
    });
}

// Get unread notification count
export function useUnreadCount() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ["notifications", "unread", user?.id],
        queryFn: async () => {
            if (!user) return 0;

            try {
                const { count, error } = await supabase
                    .from("notifications")
                    .select("*", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("is_read", false)
                    .eq("is_deleted", false);

                if (error) return 0;
                return count || 0;
            } catch (err) {
                return 0;
            }
        },
        enabled: !!user,
        refetchInterval: 30000,
    });
}

// Mark notification as read
export function useMarkAsRead() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq("id", notificationId)
                .eq("user_id", user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

// Mark all as read
export function useMarkAllAsRead() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq("user_id", user.id)
                .eq("is_read", false)
                .eq("is_deleted", false);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

// Delete notification
export function useDeleteNotification() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("notifications")
                .update({ is_deleted: true })
                .eq("id", notificationId)
                .eq("user_id", user.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

// Clear all notifications
export function useClearAllNotifications() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async () => {
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("notifications")
                .update({ is_deleted: true })
                .eq("user_id", user.id)
                .eq("is_deleted", false);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notifications"] });
        },
    });
}

// Subscribe to real-time notifications with cleanup
export function useNotificationSubscription() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const channelName = `customer_notifications_${user.id}`;
        const channel = supabase
            .channel(channelName)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ["notifications"] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient]);
}
