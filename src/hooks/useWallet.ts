import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  type: "credit" | "debit";
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export function useWallet() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return {
          id: "",
          user_id: user.id,
          balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Wallet;
      }
      return data as Wallet;
    },
    enabled: !!user?.id,
  });
}

export function useWalletTransactions(limit = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wallet_transactions", user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as WalletTransaction[];
    },
    enabled: !!user?.id,
  });
}

