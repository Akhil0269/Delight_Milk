import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletDev, useWalletTransactionsDev, initializeSampleTransactions } from "./useWalletDev";
import { useEffect } from "react";

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
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

  // Initialize sample transactions on first use
  useEffect(() => {
    if (isDevMode && user?.id) {
      initializeSampleTransactions(user.id);
    }
  }, [isDevMode, user?.id]);

  // Use dev mode hook if enabled
  if (isDevMode) {
    return useWalletDev();
  }

  // Production mode: use Supabase
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
      return data as Wallet | null;
    },
    enabled: !!user?.id,
  });
}

export function useWalletTransactions(limit = 10) {
  const { user } = useAuth();
  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

  // Use dev mode hook if enabled
  if (isDevMode) {
    return useWalletTransactionsDev(limit);
  }

  // Production mode: use Supabase
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
      return data as WalletTransaction[];
    },
    enabled: !!user?.id,
  });
}

// Export helper functions for dev mode
export { addMoneyToWallet, deductMoneyFromWallet } from "./useWalletDev";
