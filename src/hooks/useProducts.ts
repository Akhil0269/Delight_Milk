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
}

// Dev-mode mock products — mirrors the product catalog used in ProductsEnhanced.tsx
const DEV_PRODUCTS: Product[] = [
  {
    id: "prod_buffalo_milk",
    name: "Buffalo Milk",
    description: "Rich, creamy buffalo milk fresh from the farm",
    category: "Milk",
    unit: "L",
    price_per_unit: 65,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod_cow_milk",
    name: "Cow Milk",
    description: "Fresh, natural cow milk",
    category: "Milk",
    unit: "L",
    price_per_unit: 50,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod_curd",
    name: "Curd",
    description: "Thick, creamy homemade-style curd",
    category: "Dairy",
    unit: "Kg",
    price_per_unit: 60,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod_ghee",
    name: "Ghee",
    description: "Pure desi ghee, slow-churned from fresh cream",
    category: "Dairy",
    unit: "L",
    price_per_unit: 600,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "prod_paneer",
    name: "Paneer",
    description: "Fresh paneer made daily",
    category: "Dairy",
    unit: "Kg",
    price_per_unit: 320,
    image_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function useProducts() {
  const isDevMode = import.meta.env.VITE_DEV_MODE === "true";

  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      if (isDevMode) {
        console.log("🔧 Dev mode: returning mock products");
        return DEV_PRODUCTS;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
  });
}

export function useProduct(id: string) {
  const isDevMode = import.meta.env.VITE_DEV_MODE === "true";

  return useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      if (isDevMode) {
        const found = DEV_PRODUCTS.find((p) => p.id === id);
        if (!found) throw new Error(`Dev mode: product ${id} not found`);
        return found;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });
}
