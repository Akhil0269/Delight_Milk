import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "./useProducts";

// Mock products for development mode
const MOCK_PRODUCTS: Product[] = [
    {
        id: "1",
        name: "Buffalo Milk",
        description: "Fresh buffalo milk delivered daily. Rich in calcium and protein.",
        category: "Milk",
        unit: "Liter",
        price_per_unit: 70,
        image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "2",
        name: "Cow Milk",
        description: "Pure cow milk from local farms. Perfect for daily consumption.",
        category: "Milk",
        unit: "Liter",
        price_per_unit: 60,
        image_url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "3",
        name: "Fresh Curd",
        description: "Homemade style fresh curd. Creamy and delicious.",
        category: "Dairy",
        unit: "500g",
        price_per_unit: 40,
        image_url: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "4",
        name: "Pure Ghee",
        description: "Traditional pure ghee made from cow milk. Aromatic and healthy.",
        category: "Ghee",
        unit: "500g",
        price_per_unit: 450,
        image_url: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "5",
        name: "Paneer",
        description: "Fresh cottage cheese. Perfect for curries and snacks.",
        category: "Dairy",
        unit: "250g",
        price_per_unit: 90,
        image_url: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "6",
        name: "Buttermilk",
        description: "Refreshing buttermilk. Great for digestion.",
        category: "Dairy",
        unit: "500ml",
        price_per_unit: 25,
        image_url: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "7",
        name: "Flavored Milk - Chocolate",
        description: "Delicious chocolate flavored milk. Kids favorite!",
        category: "Milk",
        unit: "200ml",
        price_per_unit: 20,
        image_url: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "8",
        name: "Lassi",
        description: "Traditional sweet lassi. Refreshing and creamy.",
        category: "Dairy",
        unit: "300ml",
        price_per_unit: 30,
        image_url: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "9",
        name: "A2 Milk",
        description: "Premium A2 milk from desi cows. Easier to digest.",
        category: "Milk",
        unit: "Liter",
        price_per_unit: 80,
        image_url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
    {
        id: "10",
        name: "Butter",
        description: "Fresh homemade butter. Rich and creamy.",
        category: "Dairy",
        unit: "200g",
        price_per_unit: 120,
        image_url: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400",
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    },
];

/**
 * Enhanced product search hook with development mode support
 * Features:
 * - Real-time search with debouncing
 * - Case-insensitive partial matching
 * - Category filtering
 * - Fallback to mock data in dev mode
 * - Graceful error handling
 * - Retry mechanism
 */
export function useProductSearch(searchQuery: string, category?: string) {
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

    return useQuery({
        queryKey: ["products", "search", searchQuery, category],
        queryFn: async () => {
            // Development mode: Use mock data
            if (isDevMode) {
                console.log("🔧 DEV MODE: Using mock product data");

                let results = [...MOCK_PRODUCTS];

                // Apply search filter
                if (searchQuery && searchQuery.trim().length > 0) {
                    const searchTerm = searchQuery.trim().toLowerCase();
                    results = results.filter(product =>
                        product.name.toLowerCase().includes(searchTerm) ||
                        product.description?.toLowerCase().includes(searchTerm) ||
                        product.category.toLowerCase().includes(searchTerm)
                    );
                }

                // Apply category filter
                if (category && category !== "All") {
                    results = results.filter(product => product.category === category);
                }

                // Sort by relevance
                if (searchQuery && searchQuery.trim().length > 0) {
                    const searchTerm = searchQuery.trim().toLowerCase();
                    results.sort((a, b) => {
                        const aNameMatch = a.name.toLowerCase().includes(searchTerm);
                        const bNameMatch = b.name.toLowerCase().includes(searchTerm);
                        if (aNameMatch && !bNameMatch) return -1;
                        if (!aNameMatch && bNameMatch) return 1;
                        return a.name.localeCompare(b.name);
                    });
                }

                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 300));

                return results;
            }

            // Production mode: Use Supabase
            try {
                let query = supabase
                    .from("products")
                    .select("*")
                    .eq("is_active", true);

                // Apply search filter
                if (searchQuery && searchQuery.trim().length > 0) {
                    const searchTerm = searchQuery.trim().toLowerCase();
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
                    console.error("Search error:", error);
                    return [];
                }

                if (!data || data.length === 0) {
                    return [];
                }

                // Sort by relevance
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
            } catch (error) {
                console.error("Unexpected search error:", error);
                return [];
            }
        },
        enabled: true,
        placeholderData: (previousData) => previousData,
        staleTime: 5 * 60 * 1000,
        retry: 2,
        retryDelay: 1000,
    });
}

/**
 * Hook for getting search suggestions
 * With development mode support
 */
export function useSearchSuggestions() {
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

    return useQuery({
        queryKey: ["products", "suggestions"],
        queryFn: async () => {
            // Development mode: Return mock suggestions
            if (isDevMode) {
                console.log("🔧 DEV MODE: Using mock suggestions");
                return MOCK_PRODUCTS.slice(0, 6);
            }

            // Production mode: Use Supabase
            try {
                const { data, error } = await supabase
                    .from("products")
                    .select("id, name, category, image_url, price_per_unit, unit")
                    .eq("is_active", true)
                    .order("name", { ascending: true })
                    .limit(10);

                if (error) {
                    console.error("Suggestions error:", error);
                    return [];
                }

                return data || [];
            } catch (error) {
                console.error("Unexpected suggestions error:", error);
                return [];
            }
        },
        staleTime: 10 * 60 * 1000,
        retry: 2,
        retryDelay: 1000,
    });
}

/**
 * Hook for getting unique categories
 * With development mode support
 */
export function useProductCategories() {
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

    return useQuery({
        queryKey: ["products", "categories"],
        queryFn: async () => {
            // Development mode: Return mock categories
            if (isDevMode) {
                console.log("🔧 DEV MODE: Using mock categories");
                const categories = Array.from(
                    new Set(MOCK_PRODUCTS.map(p => p.category))
                ).sort();
                return ["All", ...categories];
            }

            // Production mode: Use Supabase
            try {
                const { data, error } = await supabase
                    .from("products")
                    .select("category")
                    .eq("is_active", true);

                if (error) {
                    console.error("Categories error:", error);
                    return ["All"];
                }

                if (!data || data.length === 0) {
                    return ["All"];
                }

                const categories = Array.from(
                    new Set(data.map((item) => item.category))
                ).sort();

                return ["All", ...categories];
            } catch (error) {
                console.error("Unexpected categories error:", error);
                return ["All"];
            }
        },
        staleTime: 15 * 60 * 1000,
        retry: 2,
        retryDelay: 1000,
    });
}

/**
 * Hook for getting all products with pagination support
 */
export function useAllProducts(limit: number = 20, offset: number = 0) {
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

    return useQuery({
        queryKey: ["products", "all", limit, offset],
        queryFn: async () => {
            // Development mode: Return mock products
            if (isDevMode) {
                console.log("🔧 DEV MODE: Using mock products");
                const start = offset;
                const end = offset + limit;
                return {
                    products: MOCK_PRODUCTS.slice(start, end),
                    total: MOCK_PRODUCTS.length,
                };
            }

            // Production mode: Use Supabase
            try {
                const { data, error, count } = await supabase
                    .from("products")
                    .select("*", { count: "exact" })
                    .eq("is_active", true)
                    .order("name", { ascending: true })
                    .range(offset, offset + limit - 1);

                if (error) {
                    console.error("All products error:", error);
                    return { products: [], total: 0 };
                }

                return {
                    products: (data as Product[]) || [],
                    total: count || 0,
                };
            } catch (error) {
                console.error("Unexpected all products error:", error);
                return { products: [], total: 0 };
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 2,
        retryDelay: 1000,
    });
}
