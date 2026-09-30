import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ReceiptStatus = "paid" | "due" | "processing";

export interface Receipt {
  id: string;
  user_id: string;
  billing_month: string;
  total_amount: number;
  total_delivered_days: number;
  gst_amount: number | null;
  status: ReceiptStatus;
  generated_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  product_id: string;
  product_name: string;
  total_quantity: number;
  price_per_unit: number;
  total_amount: number;
  delivered_days: number;
  created_at: string;
}

export function useReceipts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["receipts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", user.id)
        .order("billing_month", { ascending: false });

      if (error) throw error;
      return data as Receipt[];
    },
    enabled: !!user?.id,
  });
}

export function useReceiptItems(receiptId: string) {
  return useQuery({
    queryKey: ["receipt_items", receiptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipt_items")
        .select("*")
        .eq("receipt_id", receiptId)
        .order("product_name", { ascending: true });

      if (error) throw error;
      return data as ReceiptItem[];
    },
    enabled: !!receiptId,
  });
}
