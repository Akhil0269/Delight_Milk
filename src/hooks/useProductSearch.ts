import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "./useProducts";

/**
 * Enhanced product search hook reading canonical data from Supabase
 * Features:
 * - Real-time search with debouncing
 * - Case-insensitive partial matching (ilike)
 * - Category filtering
 * - Supabase is the single source of truth
 * - Active products only (is_active = true)
 * - Graceful error propagation
 */
export function useProductSearch(searchQuery: string, category?: string) {
    return useQuery({
        queryKey: ["products", "search", searchQuery, category],
        queryFn: async () => {
            let query = supabase
                .from("products")
                .select("*")
                .eq("is_active", true);

            // Apply search filter across name, description, and category
            if (searchQuery && searchQuery.trim().length > 0) {
                const searchTerm = searchQuery.trim().replace(/[%_]/g, "\\$&");
                query = query.or(
                    `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`
                );
            }

            // Apply category filter
            if (category && category !== "All") {
                query = query.eq("category", category);
            }

            query = query.order("name", { ascending: true });

            const { data, error } = await query;

            if (error) {
                console.error("Search query error:", error);
                throw error;
            }

            if (!data || data.length === 0) {
                return [];
            }

            // Sort by relevance if search query was provided
            if (searchQuery && searchQuery.trim().length > 0) {
                const searchTerm = searchQuery.trim().toLowerCase();
                return (data as Product[]).sort((a, b) => {
                    const aNameMatch = a.name.toLowerCase().includes(searchTerm);
                    const bNameMatch = b.name.toLowerCase().includes(searchTerm);
                    if (aNameMatch && !bNameMatch) return -1;
                    if (!aNameMatch && bNameMatch) return 1;
                    return a.name.localeCompare(b.name);
                });
            }

            return data as Product[];
        },
        enabled: true,
        placeholderData: (previousData) => previousData,
        staleTime: 5 * 60 * 1000,
        retry: 2,
        retryDelay: 1000,
    });
}

/**
 * Hook for getting search suggestions from active products in Supabase
 */
export function useSearchSuggestions() {
    return useQuery({
        queryKey: ["products", "suggestions"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products")
                .select("id, name, category, image_url, price_per_unit, unit")
                .eq("is_active", true)
                .order("name", { ascending: true })
                .limit(10);

            if (error) {
                console.error("Suggestions error:", error);
                throw error;
            }

            return data || [];
        },
        staleTime: 10 * 60 * 1000,
        retry: 2,
        retryDelay: 1000,
    });
}

/**
 * Hook for getting unique categories from active products in Supabase
 */
export function useProductCategories() {
    return useQuery({
        queryKey: ["products", "categories"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products")
                .select("category")
                .eq("is_active", true);

            if (error) {
                console.error("Categories error:", error);
                throw error;
            }

            if (!data || data.length === 0) {
                return ["All"];
            }

            const categories = Array.from(
                new Set(data.map((item) => item.category).filter(Boolean))
            ).sort();

            return ["All", ...categories];
        },
        staleTime: 15 * 60 * 1000,
        retry: 2,
        retryDelay: 1000,
    });
}

/**
 * Hook for getting all active products with pagination support from Supabase
 */
export function useAllProducts(limit: number = 20, offset: number = 0) {
    return useQuery({
        queryKey: ["products", "all", limit, offset],
        queryFn: async () => {
            const { data, error, count } = await supabase
                .from("products")
                .select("*", { count: "exact" })
                .eq("is_active", true)
                .order("name", { ascending: true })
                .range(offset, offset + limit - 1);

            if (error) {
                console.error("All products error:", error);
                throw error;
            }

            return {
                products: (data as Product[]) || [],
                total: count || 0,
            };
        },
        staleTime: 5 * 60 * 1000,
        retry: 2,
        retryDelay: 1000,
    });
}
