// Admin Hooks - React hooks for admin operations
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================
// USER MANAGEMENT HOOKS
// ============================================

export function useAdminUsers() {
    return useQuery({
        queryKey: ["admin-users"],
        queryFn: async () => {
            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log("🔧 Admin Development mode: Using localStorage users data");

                // Get mockup users from localStorage
                const storedMockUsers = localStorage.getItem('dev_admin_all_users');
                let allUsers: any[] = [];

                if (storedMockUsers) {
                    allUsers = JSON.parse(storedMockUsers);
                } else {
                    // Initialize with mock users if none exist
                    allUsers = [
                        {
                            id: 'dev_user_1',
                            email: 'customer1@example.com',
                            full_name: 'Test Customer 1',
                            phone: '9876543210',
                            address: '123 Main Street, City',
                            role: 'customer',
                            created_at: new Date().toISOString(),
                            is_blocked: false,
                        },
                        {
                            id: 'dev_user_2',
                            email: 'customer2@example.com',
                            full_name: 'Test Customer 2',
                            phone: '9876543211',
                            address: '456 Oak Avenue, Town',
                            role: 'customer',
                            created_at: new Date().toISOString(),
                            is_blocked: false,
                        },
                        {
                            id: 'dev_user_3',
                            email: 'customer3@example.com',
                            full_name: 'Test Customer 3',
                            phone: '9876543212',
                            address: '789 Pine Road, Village',
                            role: 'customer',
                            created_at: new Date().toISOString(),
                            is_blocked: true,
                        },
                    ];
                }

                // ✅ MERGE WITH LOCALLY CREATED USERS
                const localCreatedUsers = localStorage.getItem('dev_email_users');
                if (localCreatedUsers) {
                    try {
                        const parsedLocalUsers = JSON.parse(localCreatedUsers);
                        // Convert dictionary to array
                        const localUsersArray = Object.values(parsedLocalUsers).map((u: any) => ({
                            id: u.id,
                            email: u.email,
                            full_name: u.full_name,
                            phone: u.phone || "N/A",
                            address: "Local Dev Address",
                            role: 'customer',
                            created_at: u.created_at || new Date().toISOString(),
                            is_blocked: false,
                        }));

                        // Avoid duplicates
                        const existingIds = new Set(allUsers.map(u => u.id));
                        const newUsers = localUsersArray.filter(u => !existingIds.has(u.id));

                        allUsers = [...newUsers, ...allUsers];
                    } catch (e) {
                        console.error("Error parsing local created users", e);
                    }
                }

                // Store combined list back (optional, but good for persistence)
                localStorage.setItem('dev_admin_all_users', JSON.stringify(allUsers));

                return allUsers;
            }

            // Production mode: Real Supabase query
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
    });
}

export function useBlockUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log(`🔧 Admin Development mode: ${block ? 'Blocking' : 'Unblocking'} user ${userId}`);

                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 500));

                // Update localStorage
                const storedUsers = localStorage.getItem('dev_admin_all_users');
                if (storedUsers) {
                    const users = JSON.parse(storedUsers);
                    const updatedUsers = users.map((user: any) =>
                        user.id === userId
                            ? { ...user, is_blocked: block }
                            : user
                    );
                    localStorage.setItem('dev_admin_all_users', JSON.stringify(updatedUsers));
                }

                return { userId, block };
            }

            // Production mode: Real Supabase mutation
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from("profiles")
                .update({
                    is_blocked: block,
                    blocked_at: block ? new Date().toISOString() : null,
                    blocked_by: block ? user?.id : null,
                })
                .eq("id", userId);

            if (error) throw error;

            // Log admin action
            await supabase.from("admin_logs").insert({
                admin_id: user?.id,
                action: block ? "block_user" : "unblock_user",
                target_type: "user",
                target_id: userId,
            });

            return { userId, block };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast.success(variables.block ? "User blocked successfully" : "User unblocked successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update user status");
        },
    });
}

export function useUpdateUserDetails() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log(`🔧 Admin Development mode: Updating user ${userId}`, updates);

                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 500));

                // Update localStorage
                const storedUsers = localStorage.getItem('dev_admin_all_users');
                if (storedUsers) {
                    const users = JSON.parse(storedUsers);
                    const updatedUsers = users.map((user: any) =>
                        user.id === userId
                            ? { ...user, ...updates }
                            : user
                    );
                    localStorage.setItem('dev_admin_all_users', JSON.stringify(updatedUsers));
                }

                return { userId, updates };
            }

            // Production mode: Real Supabase mutation
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", userId);

            if (error) throw error;

            // Log admin action
            await supabase.from("admin_logs").insert({
                admin_id: user?.id,
                action: "update_user_details",
                target_type: "user",
                target_id: userId,
                details: updates,
            });

            return { userId, updates };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast.success("User details updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update user details");
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: string) => {
            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log(`🔧 Admin Development mode: Deleting user ${userId}`);

                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 500));

                // Delete from localStorage
                const storedUsers = localStorage.getItem('dev_admin_all_users');
                if (storedUsers) {
                    const users = JSON.parse(storedUsers);
                    const updatedUsers = users.filter((user: any) => user.id !== userId);
                    localStorage.setItem('dev_admin_all_users', JSON.stringify(updatedUsers));
                }

                return { userId };
            }

            // Production mode: Real Supabase deletion
            const { data: { user } } = await supabase.auth.getUser();

            // Delete user from profiles (will cascade to other tables due to foreign keys)
            const { error } = await supabase
                .from("profiles")
                .delete()
                .eq("id", userId);

            if (error) throw error;

            // Log admin action
            await supabase.from("admin_logs").insert({
                admin_id: user?.id,
                action: "delete_user",
                target_type: "user",
                target_id: userId,
            });

            return { userId };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast.success("User deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete user");
        },
    });
}

// ============================================
// PRODUCT MANAGEMENT HOOKS
// ============================================

export function useAdminProducts() {
    return useQuery({
        queryKey: ["admin-products"],
        queryFn: async () => {
            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log("🔧 Admin Development mode: Using localStorage products data");

                // Get products from localStorage
                const storedProducts = localStorage.getItem('dev_admin_products');

                if (storedProducts) {
                    return JSON.parse(storedProducts);
                }

                // Initialize with mock products if none exist
                const mockProducts = [
                    {
                        id: 'dev_product_1',
                        product_name: 'Full Cream Milk',
                        category: 'milk',
                        unit: 'L',
                        price_per_unit: 60,
                        description: 'Fresh full cream milk directly from farm',
                        is_available: true,
                        created_at: new Date().toISOString(),
                    },
                    {
                        id: 'dev_product_2',
                        product_name: 'Fresh Curd',
                        category: 'curd',
                        unit: 'kg',
                        price_per_unit: 80,
                        description: 'Thick and creamy curd',
                        is_available: true,
                        created_at: new Date().toISOString(),
                    },
                    {
                        id: 'dev_product_3',
                        product_name: 'Paneer',
                        category: 'paneer',
                        unit: 'kg',
                        price_per_unit: 320,
                        description: 'Soft and fresh paneer',
                        is_available: true,
                        created_at: new Date().toISOString(),
                    },
                ];

                localStorage.setItem('dev_admin_products', JSON.stringify(mockProducts));
                return mockProducts;
            }

            // Production mode: Real Supabase query
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
    });
}

export function useCreateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (product: any) => {
            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log("🔧 Admin Dev: Creating product in localStorage");
                const storedProducts = JSON.parse(localStorage.getItem('dev_admin_products') || '[]');

                const newProduct = {
                    ...product,
                    id: `dev_product_${Date.now()}`,
                    created_at: new Date().toISOString(),
                    // Ensure price is number
                    price_per_unit: parseFloat(product.price_per_unit) || 0,
                };

                storedProducts.push(newProduct);
                localStorage.setItem('dev_admin_products', JSON.stringify(storedProducts));

                return newProduct;
            }

            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from("products")
                .insert({ ...product, created_by: user?.id })
                .select()
                .single();

            if (error) throw error;

            // Log admin action
            await supabase.from("admin_logs").insert({
                admin_id: user?.id,
                action: "create_product",
                target_type: "product",
                target_id: data.id,
                details: product,
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            toast.success("Product created successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to create product");
        },
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ productId, updates }: { productId: string; updates: any }) => {
            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log("🔧 Admin Dev: Updating product in localStorage");
                const storedProducts = JSON.parse(localStorage.getItem('dev_admin_products') || '[]');

                const updatedProducts = storedProducts.map((p: any) =>
                    p.id === productId ? { ...p, ...updates } : p
                );

                localStorage.setItem('dev_admin_products', JSON.stringify(updatedProducts));

                return { productId, updates };
            }

            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from("products")
                .update(updates)
                .eq("id", productId);

            if (error) throw error;

            // Log admin action
            await supabase.from("admin_logs").insert({
                admin_id: user?.id,
                action: "update_product",
                target_type: "product",
                target_id: productId,
                details: updates,
            });

            return { productId, updates };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            toast.success("Product updated successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to update product");
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (productId: string) => {
            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log("🔧 Admin Dev: Deleting product from localStorage");
                const storedProducts = JSON.parse(localStorage.getItem('dev_admin_products') || '[]');

                const updatedProducts = storedProducts.filter((p: any) => p.id !== productId);

                localStorage.setItem('dev_admin_products', JSON.stringify(updatedProducts));
                return productId;
            }

            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", productId);

            if (error) throw error;

            // Log admin action
            await supabase.from("admin_logs").insert({
                admin_id: user?.id,
                action: "delete_product",
                target_type: "product",
                target_id: productId,
                details: { deleted: true },
            });

            return productId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            toast.success("Product deleted successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to delete product");
        },
    });
}

// ============================================
// DELIVERY MANAGEMENT HOOKS
// ============================================

export function useAdminDeliveries(date?: string) {
    return useQuery({
        queryKey: ["admin-deliveries", date],
        queryFn: async () => {
            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log("🔧 Admin Dev: Fetching deliveries from localStorage");

                // 1. Get deliveries
                const storedDeliveries = JSON.parse(localStorage.getItem('dev_delivery_calendar') || '[]');

                // 2. Get Users (to map names)
                const storedUsers = JSON.parse(localStorage.getItem('dev_admin_all_users') || '[]');
                const localCreatedUsers = JSON.parse(localStorage.getItem('dev_email_users') || '{}');
                const localUsersArray = Object.values(localCreatedUsers);
                // Create a map for faster lookup
                const userMap = new Map();
                [...storedUsers, ...localUsersArray].forEach((u: any) => {
                    if (u.id) userMap.set(u.id, u);
                });

                // 3. Enrich data
                const enrichedDeliveries = storedDeliveries.map((d: any) => {
                    const user = userMap.get(d.user_id) || { full_name: 'Unknown User', address: 'N/A', phone: 'N/A' };

                    return {
                        ...d,
                        user: {
                            full_name: user.full_name || user.email || 'Unknown',
                            phone: user.phone || 'N/A',
                            address: user.address || 'N/A'
                        },
                        // Ensure product info is consistent
                        product: d.product || {
                            product_name: d.products?.name || 'Unknown Product',
                            unit: 'Unit'
                        }
                    };
                });

                // Filter by date if provided
                if (date) {
                    return enrichedDeliveries.filter((d: any) => d.delivery_date === date);
                }

                return enrichedDeliveries;
            }

            // Production mode: Real Supabase query against canonical deliveries
            let query = supabase
                .from("deliveries")
                .select(`
                    id,
                    user_id,
                    product_id,
                    subscription_id,
                    quantity,
                    price_per_unit,
                    delivery_date,
                    status,
                    delivery_boy_id,
                    delivery_partner_name,
                    assigned_at,
                    assigned_by,
                    delivery_time,
                    notes,
                    area,
                    created_at,
                    products (
                        id,
                        name,
                        unit
                    )
                `)
                .order("delivery_date", { ascending: true });

            if (date) {
                query = query.eq("delivery_date", date);
            }

            const { data: deliveriesData, error } = await query;

            if (error) throw error;
            if (!deliveriesData || deliveriesData.length === 0) {
                return [];
            }

            // Fetch user and delivery boy profiles to enrich view
            const profileUserIds = Array.from(new Set(
                deliveriesData
                    .flatMap(d => [d.user_id, d.delivery_boy_id])
                    .filter((id): id is string => Boolean(id))
            ));

            const { data: profilesData } = profileUserIds.length > 0
                ? await supabase
                    .from("profiles")
                    .select("id, user_id, full_name, phone, address")
                    .in("user_id", profileUserIds)
                : { data: [] };

            const profileMap = new Map<string, { full_name: string | null; phone: string | null; address: string | null }>();
            (profilesData || []).forEach(p => {
                profileMap.set(p.user_id, p);
            });

            return deliveriesData.map(d => {
                const userProfile = profileMap.get(d.user_id);
                const boyProfile = d.delivery_boy_id ? profileMap.get(d.delivery_boy_id) : null;

                return {
                    ...d,
                    user: {
                        full_name: userProfile?.full_name || "Customer",
                        phone: userProfile?.phone || "N/A",
                        address: userProfile?.address || "N/A",
                    },
                    product: {
                        product_name: d.products?.name || "Product",
                        unit: d.products?.unit || "Unit",
                    },
                    delivery_boy: {
                        full_name: d.delivery_partner_name || boyProfile?.full_name || "Unassigned",
                    },
                };
            });
        },
    });
}

export function useAssignDeliveryBoy() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ deliveryId, deliveryBoyId }: { deliveryId: string; deliveryBoyId: string }) => {
            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log(`🔧 Admin Dev: Assigning boy ${deliveryBoyId} to delivery ${deliveryId}`);
                const storedDeliveries = JSON.parse(localStorage.getItem('dev_delivery_calendar') || '[]');

                // Get Delivery Boy Name
                const storedUsers = JSON.parse(localStorage.getItem('dev_admin_all_users') || '[]');
                const localCreatedUsers = JSON.parse(localStorage.getItem('dev_email_users') || '{}');
                const allUsers = [...storedUsers, ...Object.values(localCreatedUsers)];
                const boy = allUsers.find((u: any) => u.id === deliveryBoyId);

                const updatedDeliveries = storedDeliveries.map((d: any) =>
                    d.id === deliveryId ? {
                        ...d,
                        delivery_boy_id: deliveryBoyId,
                        delivery_boy: { full_name: boy?.full_name || 'Assigned Boy' },
                        status: d.status === 'scheduled' ? 'in_progress' : d.status
                    } : d
                );

                localStorage.setItem('dev_delivery_calendar', JSON.stringify(updatedDeliveries));
                return { deliveryId, deliveryBoyId };
            }

            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from("deliveries")
                .update({
                    delivery_boy_id: deliveryBoyId,
                    assigned_at: new Date().toISOString(),
                    assigned_by: user?.id,
                })
                .eq("id", deliveryId);

            if (error) throw error;

            // Log admin action
            await supabase.from("admin_logs").insert({
                admin_id: user?.id,
                action: "assign_delivery_boy",
                target_type: "delivery",
                target_id: deliveryId,
                details: { delivery_boy_id: deliveryBoyId },
            });

            return { deliveryId, deliveryBoyId };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-deliveries"] });
            toast.success("Delivery boy assigned successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to assign delivery boy");
        },
    });
}

// ============================================
// WALLET MANAGEMENT HOOKS
// ============================================

export function useAdminWalletOperation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            userId,
            amount,
            type,
            source,
            description,
        }: {
            userId: string;
            amount: number;
            type: "credit" | "debit";
            source: string;
            description?: string;
        }) => {
            const { data: { user } } = await supabase.auth.getUser();

            // Get current wallet balance
            const { data: wallet } = await supabase
                .from("wallet")
                .select("balance")
                .eq("user_id", userId)
                .single();

            const currentBalance = wallet?.balance || 0;
            const newBalance = type === "credit"
                ? currentBalance + amount
                : currentBalance - amount;

            if (newBalance < 0) {
                throw new Error("Insufficient wallet balance");
            }

            // Update wallet
            const { error: walletError } = await supabase
                .from("wallet")
                .upsert({
                    user_id: userId,
                    balance: newBalance,
                });

            if (walletError) throw walletError;

            // Create transaction record
            const { error: txnError } = await supabase
                .from("wallet_transactions")
                .insert({
                    user_id: userId,
                    amount,
                    type,
                    source,
                    description,
                    admin_id: user?.id,
                });

            if (txnError) throw txnError;

            // Log admin action
            await supabase.from("admin_logs").insert({
                admin_id: user?.id,
                action: `wallet_${type}`,
                target_type: "wallet",
                target_id: userId,
                details: { amount, source, description },
            });

            return { userId, amount, type, newBalance };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
            queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
            toast.success("Wallet operation completed successfully");
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to complete wallet operation");
        },
    });
}

// ============================================
// ADMIN LOGS HOOK
// ============================================

export function useAdminLogs(limit = 100) {
    return useQuery({
        queryKey: ["admin-logs", limit],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("admin_logs")
                .select(`
          *,
          admin:profiles!admin_logs_admin_id_fkey(full_name, email)
        `)
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data;
        },
    });
}
