import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth } from "date-fns";

export type DeliveryStatus = "delivered" | "missed" | "paused" | "upcoming" | "cancelled";

export interface Delivery {
  id: string;
  user_id: string;
  subscription_id: string;
  product_id: string;
  delivery_date: string;
  quantity: number;
  price_per_unit: number;
  status: DeliveryStatus;
  delivery_time: string | null;
  delivery_proof_url: string | null;
  delivered_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    name: string;
    unit: string;
    image_url: string | null;
  };
}

export function useDeliveries(month?: Date) {
  const { user } = useAuth();
  const targetMonth = month || new Date();

  return useQuery({
    queryKey: ["deliveries", user?.id, format(targetMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!user?.id) return [];

      const start = format(startOfMonth(targetMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(targetMonth), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          products (
            id,
            name,
            unit,
            price_per_unit,
            image_url
          )
        `)
        .eq("user_id", user.id)
        .gte("delivery_date", start)
        .lte("delivery_date", end)
        .order("delivery_date", { ascending: true });

      if (error) throw error;
      return (data || []) as Delivery[];
    },
    enabled: !!user?.id,
  });
}

export function useTodayDeliveries() {
  const { user } = useAuth();
  const today = format(new Date(), "yyyy-MM-dd");

  return useQuery({
    queryKey: ["deliveries", "today", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        const { data, error } = await supabase
          .from("deliveries")
          .select(`
            *,
            products (
              id,
              name,
              unit,
              image_url
            )
          `)
          .eq("user_id", user.id)
          .eq("delivery_date", today)
          .order("created_at", { ascending: true });

        if (error) {
          console.warn("Deliveries fetch error:", error);
          return [];
        }
        return (data || []) as Delivery[];
      } catch (err) {
        console.warn("Today deliveries query error:", err);
        return [];
      }
    },
    enabled: !!user?.id,
  });
}

export function useUpdateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: DeliveryStatus; quantity?: number }) => {
      const { data, error } = await supabase
        .from("deliveries")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function usePauseDeliveries() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (deliveryDate: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("deliveries")
        .update({ status: "paused" })
        .eq("user_id", user.id)
        .eq("delivery_date", deliveryDate)
        .eq("status", "upcoming")
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

