import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

export interface Subscription {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  is_active: boolean;
  paused_until: string | null;
  start_date?: string | null;
  end_date?: string | null;
  paused_by_admin?: boolean;
  paused_at?: string | null;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    name: string;
    unit: string;
    price_per_unit: number;
    image_url: string | null;
    category?: string;
    is_active?: boolean;
    subscription_enabled?: boolean;
  };
}

export interface CreateSubscriptionParams {
  productId: string;
  quantity: number;
  startDate?: string;
}

export interface UpdateSubscriptionParams {
  id: string;
  quantity?: number;
  is_active?: boolean;
  paused_until?: string | null;
  start_date?: string;
  end_date?: string | null;
}

export function useSubscriptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["subscriptions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          products (
            id,
            name,
            unit,
            price_per_unit,
            image_url,
            category,
            is_active,
            subscription_enabled
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Subscriptions fetch error:", error);
        throw error;
      }
      return (data || []) as Subscription[];
    },
    enabled: !!user?.id,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ productId, quantity, startDate }: CreateSubscriptionParams) => {
      if (!user?.id) throw new Error("Not authenticated");
      if (!quantity || quantity <= 0) throw new Error("Quantity must be greater than zero");

      // Verify product exists and is active in canonical catalog
      const { data: product, error: prodErr } = await supabase
        .from("products")
        .select("id, name, is_active, subscription_enabled, price_per_unit, unit")
        .eq("id", productId)
        .single();

      if (prodErr || !product) {
        throw new Error("Product not found in catalog");
      }

      if (!product.is_active || product.subscription_enabled === false) {
        throw new Error(`"${product.name}" is currently unavailable for subscriptions`);
      }

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const effectiveStartDate = startDate || todayStr;

      const { data, error } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity,
          is_active: true,
          start_date: effectiveStartDate,
        })
        .select(`
          *,
          products (
            id,
            name,
            unit,
            price_per_unit,
            image_url,
            category,
            is_active,
            subscription_enabled
          )
        `)
        .single();

      if (error) throw error;
      return data as Subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSubscriptionParams) => {
      if (updates.quantity !== undefined && updates.quantity <= 0) {
        throw new Error("Quantity must be greater than zero");
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          products (
            id,
            name,
            unit,
            price_per_unit,
            image_url,
            category,
            is_active,
            subscription_enabled
          )
        `)
        .single();

      if (error) throw error;
      return data as Subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

/**
 * Cancels a subscription safely without hard deleting foreign key records.
 * Marks subscription as inactive (end_date = today), cancels any future upcoming deliveries,
 * and preserves all completed historical deliveries.
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const todayStr = format(new Date(), "yyyy-MM-dd");

      // 1. Mark subscription cancelled/inactive with today as end date
      const { data: subData, error: subErr } = await supabase
        .from("subscriptions")
        .update({
          is_active: false,
          end_date: todayStr,
        })
        .eq("id", id)
        .select()
        .single();

      if (subErr) throw subErr;

      // 2. Cancel future upcoming deliveries associated with this subscription
      await supabase
        .from("deliveries")
        .update({ status: "cancelled" })
        .eq("subscription_id", id)
        .eq("status", "upcoming")
        .gte("delivery_date", todayStr);

      return subData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

// Backward-compatible alias for existing components
export const useDeleteSubscription = useCancelSubscription;
