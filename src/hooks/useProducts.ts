import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  price_per_unit: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images?: string[];
  rating?: number | null;
  review_count?: number | null;
  stock_status?: string | null;
  stock_quantity?: number | null;
  is_featured?: boolean | null;
  subscription_enabled?: boolean | null;
  addon_product?: boolean | null;
}

export function useProducts() {
  return useQuery<Product[], Error>({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("is_active", { ascending: false })
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as Product[];
    },
  });
}

export function useProduct(id: string) {
  return useQuery<Product | null, Error>({
    queryKey: ["products", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Product | null;
    },
    enabled: Boolean(id),
  });
}

