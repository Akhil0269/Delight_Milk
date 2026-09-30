import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useEffect } from "react";

export type DeliveryStatus = "delivered" | "missed" | "paused" | "upcoming";

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

// Initialize sample calendar data
function initializeSampleCalendar(userId: string) {
  const calendarKey = 'dev_delivery_calendar';
  const calendarData = localStorage.getItem(calendarKey);
  const allCalendar = calendarData ? JSON.parse(calendarData) : [];

  // Check if user already has calendar
  const userHasCalendar = allCalendar.some((day: { user_id?: string }) => day.user_id === userId);

  if (!userHasCalendar) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Create sample calendar for current month
    const sampleCalendar: Array<Record<string, unknown>> = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];

      // Determine status based on date
      let status: DeliveryStatus = 'upcoming';
      if (day < today.getDate() - 7) {
        status = 'delivered';
      } else if (day >= today.getDate() - 7 && day < today.getDate() - 3) {
        status = day % 3 === 0 ? 'missed' : 'delivered';
      } else if (day >= today.getDate() - 3 && day < today.getDate()) {
        status = day % 5 === 0 ? 'paused' : 'delivered';
      }

      sampleCalendar.push({
        id: `cal_${userId}_${dateStr}`,
        user_id: userId,
        subscription_id: 'sub_default',
        product_id: 'prod_milk_1',
        delivery_date: dateStr,
        quantity: 1,
        price_per_unit: 60,
        status,
        delivery_time: status === 'delivered' ? new Date(year, month, day, 6, 30).toISOString() : null,
        delivery_proof_url: null,
        delivered_by: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        products: {
          id: 'prod_milk_1',
          name: 'Full Cream Milk',
          unit: 'L',
          image_url: null,
        }
      });
    }

    allCalendar.push(...sampleCalendar);
    localStorage.setItem(calendarKey, JSON.stringify(allCalendar));
  }
}

export function useDeliveries(month?: Date) {
  const { user } = useAuth();
  const targetMonth = month || new Date();
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

  // Initialize sample data in dev mode
  useEffect(() => {
    if (isDevMode && user?.id) {
      initializeSampleCalendar(user.id);
    }
  }, [isDevMode, user?.id]);

  return useQuery({
    queryKey: ["deliveries", user?.id, format(targetMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!user?.id) return [];

      // Dev mode: use localStorage
      if (isDevMode) {
        const start = format(startOfMonth(targetMonth), "yyyy-MM-dd");
        const end = format(endOfMonth(targetMonth), "yyyy-MM-dd");

        const calendarKey = 'dev_delivery_calendar';
        const calendarData = localStorage.getItem(calendarKey);
        const allCalendar = calendarData ? JSON.parse(calendarData) : [];

        const filtered = allCalendar.filter((day: { user_id?: string; delivery_date?: string }) => {
          return Boolean(
            day.user_id === user.id &&
            day.delivery_date &&
            day.delivery_date >= start &&
            day.delivery_date <= end
          );
        });

        return filtered as Delivery[];
      }

      // Production mode: use Supabase
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
            image_url
          )
        `)
        .eq("user_id", user.id)
        .gte("delivery_date", start)
        .lte("delivery_date", end)
        .order("delivery_date", { ascending: true });

      if (error) throw error;
      return data as Delivery[];
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

      if (error) throw error;
      return data as Delivery[];
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

