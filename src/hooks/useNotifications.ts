// Notifications Hook
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
    action_url: string | null;
    metadata: any;
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

            const { data, error } = await supabase
                .from("notifications")
                .select("*")
                .eq("user_id", user.id)
                .eq("is_deleted", false)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as Notification[];
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

            const { data, error } = await supabase
                .from("notifications")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("is_read", false)
                .eq("is_deleted", false);

            if (error) throw error;
            return data || 0;
        },
        enabled: !!user,
        refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
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

// Subscribe to real-time notifications
export function useNotificationSubscription() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    useQuery({
        queryKey: ["notifications", "subscription", user?.id],
        queryFn: () => {
            if (!user) return null;

            const channel = supabase
                .channel("notifications")
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

            return channel;
        },
        enabled: !!user,
    });
}
