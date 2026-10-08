// Admin Hooks - React hooks for admin operations
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

// ============================================
// USER MANAGEMENT HOOKS
// ============================================

export interface AdminUserItem {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    avatar_url: string | null;
    is_blocked: boolean;
    blocked_at: string | null;
    blocked_by: string | null;
    created_at: string;
    updated_at: string;
    role: "admin" | "customer" | "delivery_boy";
    roles: string[];
}

export function useAdminUsers() {
    return useQuery<AdminUserItem[]>({
        queryKey: ["admin-users"],
        queryFn: async () => {
            const [profilesRes, rolesRes] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("id, user_id, full_name, email, phone, address, avatar_url, is_blocked, blocked_at, blocked_by, created_at, updated_at")
                    .order("created_at", { ascending: false }),
                supabase
                    .from("user_roles")
                    .select("user_id, role"),
            ]);

            if (profilesRes.error) throw profilesRes.error;

            const rolesMap = new Map<string, string[]>();
            for (const r of (rolesRes.data || [])) {
                if (!rolesMap.has(r.user_id)) {
                    rolesMap.set(r.user_id, []);
                }
                rolesMap.get(r.user_id)!.push(r.role);
            }

            return (profilesRes.data || []).map((p) => {
                const userRoles = rolesMap.get(p.user_id) || [];
                const role: "admin" | "customer" | "delivery_boy" = userRoles.includes("admin")
                    ? "admin"
                    : userRoles.includes("delivery_boy") || userRoles.includes("delivery_partner")
                    ? "delivery_boy"
                    : "customer";
                return {
                    ...p,
                    is_blocked: Boolean(p.is_blocked),
                    role,
                    roles: userRoles.length > 0 ? userRoles : ["customer"],
                };
            });
        },
    });
}

export function useBlockUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
            if (!userId) {
                throw new Error("User identifier is required.");
            }

            const { data: { user } } = await supabase.auth.getUser();

            // Self-block protection
            if (block && user?.id === userId) {
                throw new Error("Admins cannot suspend their own account.");
            }

            // Find target profile
            const { data: targetProfile, error: findErr } = await supabase
                .from("profiles")
                .select("id, user_id, full_name, is_blocked")
                .or(`id.eq.${userId},user_id.eq.${userId}`)
                .maybeSingle();

            if (findErr) throw findErr;
            if (!targetProfile) {
                throw new Error("User profile not found.");
            }

            if (block && user?.id && targetProfile.user_id === user.id) {
                throw new Error("Admins cannot suspend their own account.");
            }

            const { error: updateErr } = await supabase
                .from("profiles")
                .update({
                    is_blocked: block,
                    blocked_at: block ? new Date().toISOString() : null,
                    blocked_by: block ? user?.id : null,
                })
                .eq("id", targetProfile.id);

            if (updateErr) throw updateErr;

            // Log admin action safely
            try {
                if (user?.id) {
                    await supabase.from("admin_logs").insert({
                        admin_id: user.id,
                        action: block ? "block_user" : "unblock_user",
                        target_type: "user",
                        target_id: targetProfile.user_id || targetProfile.id,
                        details: {
                            profile_id: targetProfile.id,
                            user_id: targetProfile.user_id,
                            is_blocked: block,
                        },
                    });
                }
            } catch (logErr) {
                console.warn("Failed to write admin log:", logErr);
            }

            return { userId: targetProfile.id, block };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard-metrics"] });
            toast.success(variables.block ? "User account suspended successfully" : "User account unblocked successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to update user status");
        },
    });
}

export function useUpdateUserDetails() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, updates }: { userId: string; updates: { full_name?: string; phone?: string; address?: string } }) => {
            if (!userId) {
                throw new Error("User identifier is required.");
            }

            const { data: { user } } = await supabase.auth.getUser();

            const sanitizedUpdates: Record<string, unknown> = {};
            if (updates.full_name !== undefined) sanitizedUpdates.full_name = updates.full_name.trim();
            if (updates.phone !== undefined) sanitizedUpdates.phone = updates.phone.trim();
            if (updates.address !== undefined) sanitizedUpdates.address = updates.address.trim();

            const { data: targetProfile, error: findErr } = await supabase
                .from("profiles")
                .select("id, user_id")
                .or(`id.eq.${userId},user_id.eq.${userId}`)
                .maybeSingle();

            if (findErr) throw findErr;
            if (!targetProfile) {
                throw new Error("User profile not found.");
            }

            const { error: updateErr } = await supabase
                .from("profiles")
                .update(sanitizedUpdates)
                .eq("id", targetProfile.id);

            if (updateErr) throw updateErr;

            // Log admin action safely
            try {
                if (user?.id) {
                    await supabase.from("admin_logs").insert({
                        admin_id: user.id,
                        action: "update_user_details",
                        target_type: "user",
                        target_id: targetProfile.user_id || targetProfile.id,
                        details: sanitizedUpdates,
                    });
                }
            } catch (logErr) {
                console.warn("Failed to write admin log:", logErr);
            }

            return { userId: targetProfile.id, updates: sanitizedUpdates };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            toast.success("User details updated successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to update user details");
        },
    });
}

export function useDeleteUser() {
    return useMutation({
        mutationFn: async (_userId: string) => {
            throw new Error(
                "Permanent user account deletion is disabled to preserve historical order, delivery, and audit integrity. Use account suspension instead."
            );
        },
        onError: (error: Error) => {
            toast.error(error.message);
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

            const { data, error } = await supabase
                .from("products")
                .select("*")
                .order("category", { ascending: true })
                .order("name", { ascending: true });

            if (error) throw error;
            return (data || []).map((p: Record<string, unknown>) => ({
                ...p,
                name: (p.name as string) || (p.product_name as string) || "Product",
                product_name: (p.name as string) || (p.product_name as string) || "Product",
                is_active: (p.is_active as boolean) ?? (p.is_available as boolean) ?? true,
                is_available: (p.is_active as boolean) ?? (p.is_available as boolean) ?? true,
            }));
        },
    });
}

export interface AdminProductInput {
    name: string;
    category: string;
    price_per_unit: number | string;
    unit: string;
    description?: string | null;
    is_active?: boolean;
    image_url?: string | null;
}

export function useCreateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (product: AdminProductInput) => {
            const trimmedName = product.name?.trim();
            if (!trimmedName || trimmedName.length < 2) {
                throw new Error("Product name must be at least 2 characters.");
            }

            const trimmedCategory = product.category?.trim();
            if (!trimmedCategory) {
                throw new Error("Category is required.");
            }

            const trimmedUnit = product.unit?.trim();
            if (!trimmedUnit) {
                throw new Error("Unit is required.");
            }

            const rawPrice = typeof product.price_per_unit === "number"
                ? product.price_per_unit
                : parseFloat(String(product.price_per_unit));

            if (!Number.isFinite(rawPrice) || isNaN(rawPrice) || rawPrice <= 0) {
                throw new Error("Invalid product price: price must be a valid positive number.");
            }

            if (rawPrice > 100000) {
                throw new Error("Invalid product price: price exceeds maximum allowable value (₹100,000).");
            }

            const canonicalPrice = Math.round(rawPrice * 100) / 100;

            const { data: { user } } = await supabase.auth.getUser();

            const productPayload: Record<string, unknown> = {
                name: trimmedName,
                category: trimmedCategory,
                price_per_unit: canonicalPrice,
                unit: trimmedUnit,
                description: product.description?.trim() || null,
                is_active: product.is_active ?? true,
            };
            if (product.image_url !== undefined) {
                productPayload.image_url = product.image_url;
            }

            const { data, error } = await supabase
                .from("products")
                .insert(productPayload as never)
                .select()
                .single();

            if (error) throw error;

            // Log admin action safely
            try {
                if (user?.id) {
                    await supabase.from("admin_logs").insert({
                        admin_id: user.id,
                        action: "create_product",
                        target_type: "product",
                        target_id: data.id,
                        details: productPayload,
                    });
                }
            } catch (logErr) {
                console.warn("Failed to write admin log:", logErr);
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard-metrics"] });
            toast.success("Product created successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to create product");
        },
    });
}

export function useUpdateProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ productId, updates }: { productId: string; updates: Partial<AdminProductInput> }) => {
            if (!productId) {
                throw new Error("Product ID is required for update.");
            }

            const updatesPayload: Record<string, unknown> = {};

            if (updates.name !== undefined) {
                const trimmedName = updates.name.trim();
                if (!trimmedName || trimmedName.length < 2) {
                    throw new Error("Product name must be at least 2 characters.");
                }
                updatesPayload.name = trimmedName;
            }

            if (updates.category !== undefined) {
                const trimmedCategory = updates.category.trim();
                if (!trimmedCategory) {
                    throw new Error("Category cannot be empty.");
                }
                updatesPayload.category = trimmedCategory;
            }

            if (updates.unit !== undefined) {
                const trimmedUnit = updates.unit.trim();
                if (!trimmedUnit) {
                    throw new Error("Unit cannot be empty.");
                }
                updatesPayload.unit = trimmedUnit;
            }

            if (updates.price_per_unit !== undefined) {
                const rawPrice = typeof updates.price_per_unit === "number"
                    ? updates.price_per_unit
                    : parseFloat(String(updates.price_per_unit));

                if (!Number.isFinite(rawPrice) || isNaN(rawPrice) || rawPrice <= 0) {
                    throw new Error("Invalid product price: price must be a valid positive number.");
                }

                if (rawPrice > 100000) {
                    throw new Error("Invalid product price: price exceeds maximum allowable value (₹100,000).");
                }

                updatesPayload.price_per_unit = Math.round(rawPrice * 100) / 100;
            }

            if (updates.description !== undefined) {
                updatesPayload.description = updates.description?.trim() || null;
            }

            if (updates.is_active !== undefined) {
                updatesPayload.is_active = Boolean(updates.is_active);
            }

            if (updates.image_url !== undefined) {
                updatesPayload.image_url = updates.image_url;
            }

            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from("products")
                .update(updatesPayload as never)
                .eq("id", productId);

            if (error) throw error;

            // Log admin action safely
            try {
                if (user?.id) {
                    await supabase.from("admin_logs").insert({
                        admin_id: user.id,
                        action: "update_product",
                        target_type: "product",
                        target_id: productId,
                        details: updatesPayload,
                    });
                }
            } catch (logErr) {
                console.warn("Failed to write admin log:", logErr);
            }

            return { productId, updates: updatesPayload };
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard-metrics"] });
            if (variables?.productId) {
                queryClient.invalidateQueries({ queryKey: ["product-detail", variables.productId] });
                queryClient.invalidateQueries({ queryKey: ["products", variables.productId] });
            }
            toast.success("Product updated successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to update product");
        },
    });
}

export function useDeleteProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (productId: string) => {
            if (!productId) {
                throw new Error("Product ID is required for deletion.");
            }

            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", productId);

            if (error) {
                // Check for foreign key restriction (e.g., historical orders or deliveries reference this product)
                if (
                    error.code === "23503" ||
                    error.message.includes("violates foreign key constraint") ||
                    error.message.includes("order_items") ||
                    error.message.includes("orders") ||
                    error.message.includes("deliveries") ||
                    error.message.includes("subscriptions")
                ) {
                    throw new Error("Cannot delete product because historical orders or subscriptions reference it. Please set the product as Unavailable instead to preserve historical records.");
                }
                throw error;
            }

            // Log admin action safely
            try {
                if (user?.id) {
                    await supabase.from("admin_logs").insert({
                        admin_id: user.id,
                        action: "delete_product",
                        target_type: "product",
                        target_id: productId,
                        details: { deleted: true },
                    });
                }
            } catch (logErr) {
                console.warn("Failed to write admin log:", logErr);
            }

            return productId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard-metrics"] });
            toast.success("Product deleted successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to delete product");
        },
    });
}


// ============================================
// DELIVERY MANAGEMENT HOOKS
// ============================================

// ============================================
// DELIVERY MANAGEMENT & WORKFORCE HOOKS
// ============================================

export interface DeliveryBoyWorkloadItem {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    is_blocked: boolean;
    created_at: string;
    role: string;
    active_deliveries_count: number;
    completed_deliveries_count: number;
}

export interface AdminWorkforceItem {
    id: string;
    user_id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    is_blocked: boolean;
    created_at: string;
    role: string;
    role_assigned_at: string | null;
    last_active_at: string | null;
    total_actions_count: number;
}

export function useAdminDeliveries(date?: string) {
    return useQuery({
        queryKey: ["admin-deliveries", date],
        queryFn: async () => {
            let query = supabase
                .from("deliveries")
                .select(`
                    id,
                    user_id,
                    product_id,
                    order_id,
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

            // Fetch customer and delivery boy profiles to enrich view
            const profileUserIds = Array.from(new Set(
                deliveriesData
                    .flatMap(d => [d.user_id, d.delivery_boy_id])
                    .filter((id): id is string => Boolean(id))
            ));

            const { data: profilesData } = profileUserIds.length > 0
                ? await supabase
                    .from("profiles")
                    .select("id, user_id, full_name, email, phone, address")
                    .in("user_id", profileUserIds)
                : { data: [] };

            const profileMap = new Map<string, { full_name: string | null; email: string | null; phone: string | null; address: string | null }>();
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
                        email: userProfile?.email || "N/A",
                        phone: userProfile?.phone || "N/A",
                        address: userProfile?.address || "N/A",
                    },
                    product: {
                        product_name: d.products?.name || "Product",
                        unit: d.products?.unit || "Unit",
                    },
                    delivery_boy: {
                        id: d.delivery_boy_id,
                        full_name: boyProfile?.full_name || d.delivery_partner_name || "Unassigned",
                        phone: boyProfile?.phone || "N/A",
                    },
                };
            });
        },
    });
}

export function useDeliveryBoys() {
    return useQuery<DeliveryBoyWorkloadItem[]>({
        queryKey: ["admin-delivery-boys"],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_delivery_boys_workload");
            if (error) throw error;
            return (data || []).map((row: Record<string, unknown>) => ({
                id: String(row.id),
                user_id: String(row.user_id),
                full_name: (row.full_name as string) || "Delivery Worker",
                email: (row.email as string) || null,
                phone: (row.phone as string) || null,
                is_blocked: Boolean(row.is_blocked),
                created_at: String(row.created_at),
                role: String(row.role),
                active_deliveries_count: Number(row.active_deliveries_count || 0),
                completed_deliveries_count: Number(row.completed_deliveries_count || 0),
            }));
        },
    });
}

export function useAdminList() {
    return useQuery<AdminWorkforceItem[]>({
        queryKey: ["admin-workforce-list"],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_admin_users");
            if (error) throw error;
            return (data || []).map((row: Record<string, unknown>) => ({
                id: String(row.id),
                user_id: String(row.user_id),
                full_name: (row.full_name as string) || "Administrator",
                email: (row.email as string) || null,
                phone: (row.phone as string) || null,
                is_blocked: Boolean(row.is_blocked),
                created_at: String(row.created_at),
                role: String(row.role),
                role_assigned_at: (row.role_assigned_at as string) || null,
                last_active_at: (row.last_active_at as string) || null,
                total_actions_count: Number(row.total_actions_count || 0),
            }));
        },
    });
}

export function usePromoteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "delivery_boy" }) => {
            const { data, error } = await supabase.rpc("admin_promote_user", {
                p_user_id: userId,
                p_role: role,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            queryClient.invalidateQueries({ queryKey: ["admin-workforce-list"] });
            queryClient.invalidateQueries({ queryKey: ["admin-delivery-boys"] });
            toast.success(`User promoted to ${variables.role === "admin" ? "Administrator" : "Delivery Boy"} successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to promote user");
        },
    });
}

export function useDemoteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "delivery_boy" }) => {
            const { data, error } = await supabase.rpc("admin_demote_user", {
                p_user_id: userId,
                p_role: role,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["admin-users"] });
            queryClient.invalidateQueries({ queryKey: ["admin-workforce-list"] });
            queryClient.invalidateQueries({ queryKey: ["admin-delivery-boys"] });
            toast.success(`${variables.role === "admin" ? "Administrator" : "Delivery Boy"} role removed successfully`);
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to remove role");
        },
    });
}

export function useAssignDeliveryBoy() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            deliveryId,
            deliveryBoyId,
            notes,
        }: {
            deliveryId: string;
            deliveryBoyId: string;
            notes?: string;
        }) => {
            const { data, error } = await supabase.rpc("admin_assign_delivery", {
                p_delivery_id: deliveryId,
                p_delivery_boy_id: deliveryBoyId,
                p_notes: notes || null,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-deliveries"] });
            queryClient.invalidateQueries({ queryKey: ["admin-delivery-boys"] });
            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
            toast.success("Delivery boy assigned successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to assign delivery boy");
        },
    });
}

export function useUnassignDeliveryBoy() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ deliveryId, reason }: { deliveryId: string; reason?: string }) => {
            const { data, error } = await supabase.rpc("admin_unassign_delivery", {
                p_delivery_id: deliveryId,
                p_reason: reason || null,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-deliveries"] });
            queryClient.invalidateQueries({ queryKey: ["admin-delivery-boys"] });
            toast.success("Delivery boy unassigned successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to unassign delivery boy");
        },
    });
}

export function useUpdateDeliveryStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            deliveryId,
            newStatus,
            proofUrl,
            notes,
        }: {
            deliveryId: string;
            newStatus: "upcoming" | "in_progress" | "delivered" | "failed" | "cancelled";
            proofUrl?: string;
            notes?: string;
        }) => {
            const { data, error } = await supabase.rpc("delivery_update_status", {
                p_delivery_id: deliveryId,
                p_new_status: newStatus,
                p_proof_url: proofUrl || null,
                p_notes: notes || null,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-deliveries"] });
            queryClient.invalidateQueries({ queryKey: ["delivery-worker-deliveries"] });
            queryClient.invalidateQueries({ queryKey: ["admin-delivery-boys"] });
            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
            toast.success("Delivery status updated successfully");
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to update delivery status");
        },
    });
}

export function useDeliveryBoyDeliveries(date?: string) {
    return useQuery({
        queryKey: ["delivery-worker-deliveries", date],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Authentication required");

            let query = supabase
                .from("deliveries")
                .select(`
                    id,
                    user_id,
                    product_id,
                    order_id,
                    subscription_id,
                    quantity,
                    price_per_unit,
                    delivery_date,
                    status,
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
                .eq("delivery_boy_id", user.id)
                .order("delivery_date", { ascending: true });

            if (date) {
                query = query.eq("delivery_date", date);
            }

            const { data: deliveriesData, error } = await query;
            if (error) throw error;
            if (!deliveriesData || deliveriesData.length === 0) return [];

            // Fetch assigned customer profiles (allowed via our RLS policy)
            const customerIds = Array.from(new Set(deliveriesData.map(d => d.user_id)));
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("user_id, full_name, phone, address")
                .in("user_id", customerIds);

            const profileMap = new Map<string, { full_name: string | null; phone: string | null; address: string | null }>();
            (profilesData || []).forEach(p => {
                profileMap.set(p.user_id, p);
            });

            return deliveriesData.map(d => {
                const customer = profileMap.get(d.user_id);
                return {
                    ...d,
                    customer: {
                        full_name: customer?.full_name || "Customer",
                        phone: customer?.phone || "N/A",
                        address: customer?.address || "N/A",
                    },
                    product: {
                        product_name: d.products?.name || "Product",
                        unit: d.products?.unit || "Unit",
                    },
                };
            });
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

            // Call secure atomic wallet RPC: process_wallet_transaction
            let { data: rpcResult, error: rpcError } = await supabase.rpc("process_wallet_transaction", {
                p_user_id: userId,
                p_amount: amount,
                p_type: type,
                p_source: source,
                p_description: description || null,
            });

            if (rpcError && (rpcError.message?.includes("function") || rpcError.code === "PGRST202")) {
                const retry = await supabase.rpc("process_wallet_transaction", {
                    user_id: userId,
                    amount: amount,
                    type: type,
                    source: source,
                    description: description || null,
                });
                if (!retry.error) {
                    rpcResult = retry.data;
                    rpcError = null;
                }
            }

            if (rpcError) throw rpcError;

            // Log admin action
            await supabase.from("admin_logs").insert({
                admin_id: user?.id,
                action: `wallet_${type}`,
                target_type: "wallet",
                target_id: userId,
                details: { amount, source, description, result: rpcResult },
            });

            return { userId, amount, type, result: rpcResult };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
            queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
            toast.success("Wallet operation completed successfully");
        },
        onError: (error: Error) => {
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

// ============================================
// ADMIN DASHBOARD METRICS HOOK
// ============================================

export interface AdminDashboardData {
    totalCustomers: number;
    activeCustomers: number;
    blockedCustomers: number;
    totalProducts: number;
    activeProducts: number;
    inactiveProducts: number;
    todayOrders: number;
    totalOrders: number;
    confirmedOrders: number;
    cancelledOrders: number;
    todayDeliveries: number;
    completedTodayDeliveries: number;
    pendingTodayDeliveries: number;
    totalUpcomingDeliveries: number;
    activeSubscriptions: number;
    totalSubscriptions: number;
    totalPaidRevenue: number;
    pendingPayments: number;
    refundedAmount: number;
    recentDeliveries: Array<{
        id: string;
        delivery_date: string;
        status: string;
        quantity: number;
        price_per_unit: number;
        product_name: string;
        unit: string;
        created_at: string;
    }>;
}

export function useAdminDashboardMetrics() {
    return useQuery<AdminDashboardData>({
        queryKey: ["admin-dashboard-metrics"],
        queryFn: async () => {
            const todayStr = format(new Date(), "yyyy-MM-dd");

            const [
                profilesRes,
                productsRes,
                ordersRes,
                deliveriesRes,
                subscriptionsRes,
                recentDeliveriesRes,
            ] = await Promise.all([
                supabase.from("profiles").select("id, is_blocked"),
                supabase.from("products").select("id, is_active"),
                supabase.from("orders").select("id, status, payment_status, total_amount, created_at"),
                supabase.from("deliveries").select("id, status, delivery_date"),
                supabase.from("subscriptions").select("id, is_active, paused_until"),
                supabase
                    .from("deliveries")
                    .select(`
                        id,
                        delivery_date,
                        status,
                        quantity,
                        price_per_unit,
                        created_at,
                        products ( name, unit )
                    `)
                    .order("created_at", { ascending: false })
                    .limit(5),
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (productsRes.error) throw productsRes.error;
            if (ordersRes.error) throw ordersRes.error;
            if (deliveriesRes.error) throw deliveriesRes.error;
            if (subscriptionsRes.error) throw subscriptionsRes.error;
            if (recentDeliveriesRes.error) throw recentDeliveriesRes.error;

            const profiles = profilesRes.data || [];
            const products = productsRes.data || [];
            const orders = ordersRes.data || [];
            const deliveries = deliveriesRes.data || [];
            const subscriptions = subscriptionsRes.data || [];

            // Customer counts
            const totalCustomers = profiles.length;
            const activeCustomers = profiles.filter((p) => !p.is_blocked).length;
            const blockedCustomers = profiles.filter((p) => p.is_blocked).length;

            // Product counts
            const totalProducts = products.length;
            const activeProducts = products.filter((p) => p.is_active).length;
            const inactiveProducts = products.filter((p) => !p.is_active).length;

            // Order metrics
            const totalOrders = orders.length;
            const todayOrders = orders.filter(
                (o) => format(new Date(o.created_at), "yyyy-MM-dd") === todayStr
            ).length;
            const confirmedOrders = orders.filter((o) => o.status === "confirmed").length;
            const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;

            // Revenue metrics (authoritative from orders payment_status)
            const totalPaidRevenue = orders
                .filter((o) => o.payment_status === "paid")
                .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            const pendingPayments = orders
                .filter((o) => o.payment_status === "pending")
                .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            const refundedAmount = orders
                .filter((o) => o.payment_status === "refunded")
                .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            // Delivery metrics
            const todayDeliveriesList = deliveries.filter((d) => d.delivery_date === todayStr);
            const todayDeliveries = todayDeliveriesList.length;
            const completedTodayDeliveries = todayDeliveriesList.filter((d) => d.status === "delivered").length;
            const pendingTodayDeliveries = todayDeliveriesList.filter((d) => d.status !== "delivered").length;
            const totalUpcomingDeliveries = deliveries.filter((d) => d.status === "upcoming").length;

            // Subscription metrics
            const now = new Date();
            const activeSubscriptions = subscriptions.filter(
                (s) => s.is_active === true && (!s.paused_until || new Date(s.paused_until) <= now)
            ).length;
            const totalSubscriptions = subscriptions.length;

            interface RecentDeliveryRow {
                id: string;
                delivery_date: string;
                status: string;
                quantity: number;
                price_per_unit: number;
                created_at: string;
                products: { name: string; unit: string } | null;
            }

            // Recent deliveries mapping
            const recentDeliveries = ((recentDeliveriesRes.data || []) as unknown as RecentDeliveryRow[]).map((d) => ({
                id: d.id,
                delivery_date: d.delivery_date,
                status: d.status,
                quantity: d.quantity,
                price_per_unit: d.price_per_unit,
                product_name: d.products?.name || "Dairy Product",
                unit: d.products?.unit || "Unit",
                created_at: d.created_at,
            }));

            return {
                totalCustomers,
                activeCustomers,
                blockedCustomers,
                totalProducts,
                activeProducts,
                inactiveProducts,
                todayOrders,
                totalOrders,
                confirmedOrders,
                cancelledOrders,
                todayDeliveries,
                completedTodayDeliveries,
                pendingTodayDeliveries,
                totalUpcomingDeliveries,
                activeSubscriptions,
                totalSubscriptions,
                totalPaidRevenue,
                pendingPayments,
                refundedAmount,
                recentDeliveries,
            };
        },
        staleTime: 30000,
    });
}

// ============================================
// ADMIN SUBSCRIPTION MANAGEMENT HOOKS
// ============================================

export interface AdminSubscriptionItem {
    id: string;
    user_id: string;
    product_id: string;
    quantity: number;
    is_active: boolean;
    paused_by_admin: boolean;
    paused_until: string | null;
    paused_at: string | null;
    paused_by: string | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    updated_at: string;
    // Joined customer
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    customer_is_blocked: boolean;
    // Joined product
    product_name: string | null;
    product_unit: string | null;
    product_price_per_unit: number | null;
    product_is_active: boolean;
    product_subscription_enabled: boolean;
}

/** Computed helper: derive subscription display status from canonical fields */
export function getSubscriptionStatus(
    sub: Pick<AdminSubscriptionItem, 'is_active' | 'paused_by_admin' | 'paused_until'>
): 'active' | 'paused' | 'paused_by_admin' | 'cancelled' {
    if (!sub.is_active) return 'cancelled';
    if (sub.paused_by_admin) return 'paused_by_admin';
    const today = new Date().toISOString().split('T')[0];
    if (sub.paused_until && sub.paused_until >= today) return 'paused';
    return 'active';
}

export function useAdminSubscriptions() {
    return useQuery<AdminSubscriptionItem[]>({
        queryKey: ['admin-subscriptions'],
        queryFn: async () => {
            // Join profiles and products to get full context in a single round-trip
            const { data, error } = await supabase
                .from('subscriptions')
                .select(`
                    id,
                    user_id,
                    product_id,
                    quantity,
                    is_active,
                    paused_by_admin,
                    paused_until,
                    paused_at,
                    paused_by,
                    start_date,
                    end_date,
                    created_at,
                    updated_at,
                    profiles!subscriptions_user_id_profiles_fkey (
                        full_name,
                        email,
                        phone,
                        is_blocked
                    ),
                    products (
                        name,
                        unit,
                        price_per_unit,
                        is_active,
                        subscription_enabled
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return ((data || []) as unknown as Array<{
                id: string;
                user_id: string;
                product_id: string;
                quantity: number;
                is_active: boolean;
                paused_by_admin: boolean;
                paused_until: string | null;
                paused_at: string | null;
                paused_by: string | null;
                start_date: string | null;
                end_date: string | null;
                created_at: string;
                updated_at: string;
                profiles: { full_name: string | null; email: string | null; phone: string | null; is_blocked: boolean } | null;
                products: { name: string | null; unit: string | null; price_per_unit: number | null; is_active: boolean; subscription_enabled: boolean } | null;
            }>).map(row => ({
                id: row.id,
                user_id: row.user_id,
                product_id: row.product_id,
                quantity: row.quantity,
                is_active: row.is_active,
                paused_by_admin: row.paused_by_admin ?? false,
                paused_until: row.paused_until,
                paused_at: row.paused_at,
                paused_by: row.paused_by,
                start_date: row.start_date,
                end_date: row.end_date,
                created_at: row.created_at,
                updated_at: row.updated_at,
                customer_name: row.profiles?.full_name ?? null,
                customer_email: row.profiles?.email ?? null,
                customer_phone: row.profiles?.phone ?? null,
                customer_is_blocked: row.profiles?.is_blocked ?? false,
                product_name: row.products?.name ?? null,
                product_unit: row.products?.unit ?? null,
                product_price_per_unit: row.products?.price_per_unit ?? null,
                product_is_active: row.products?.is_active ?? false,
                product_subscription_enabled: row.products?.subscription_enabled ?? false,
            }));
        },
        staleTime: 30000,
    });
}

export function useAdminPauseSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            subscriptionId,
            pauseUntil,
            adminId,
        }: {
            subscriptionId: string;
            pauseUntil: string; // ISO date string YYYY-MM-DD
            adminId: string;
        }) => {
            // Validate date is in the future
            const today = new Date().toISOString().split('T')[0];
            if (pauseUntil <= today) {
                throw new Error('Pause-until date must be a future date.');
            }

            // Guard: only allow pausing active subscriptions
            const { data: current, error: fetchErr } = await supabase
                .from('subscriptions')
                .select('id, is_active, paused_by_admin')
                .eq('id', subscriptionId)
                .single();

            if (fetchErr || !current) throw new Error('Subscription not found.');
            if (!current.is_active) throw new Error('Cannot pause a cancelled subscription.');
            if (current.paused_by_admin) throw new Error('Subscription is already paused by admin.');

            const { data, error } = await supabase
                .from('subscriptions')
                .update({
                    paused_by_admin: true,
                    paused_until: pauseUntil,
                    paused_at: new Date().toISOString(),
                    paused_by: adminId,
                })
                .eq('id', subscriptionId)
                .select()
                .single();

            if (error) throw error;

            // Cancel upcoming deliveries during the pause window
            await supabase
                .from('deliveries')
                .update({ status: 'cancelled' })
                .eq('subscription_id', subscriptionId)
                .eq('status', 'upcoming')
                .lte('delivery_date', pauseUntil);

            // Audit log
            await supabase.from('admin_logs').insert({
                admin_id: adminId,
                action: 'pause_subscription',
                target_type: 'subscription',
                target_id: subscriptionId,
                details: { paused_until: pauseUntil, subscription_id: subscriptionId },
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-metrics'] });
            toast.success('Subscription paused successfully.');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to pause subscription.');
        },
    });
}

export function useAdminResumeSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            subscriptionId,
            adminId,
        }: {
            subscriptionId: string;
            adminId: string;
        }) => {
            // Guard: only allow resuming paused subscriptions, not cancelled ones
            const { data: current, error: fetchErr } = await supabase
                .from('subscriptions')
                .select('id, is_active, paused_by_admin, paused_until')
                .eq('id', subscriptionId)
                .single();

            if (fetchErr || !current) throw new Error('Subscription not found.');
            if (!current.is_active) throw new Error('Cannot resume a cancelled subscription. Please create a new subscription.');
            if (!current.paused_by_admin && !current.paused_until) {
                throw new Error('Subscription is not currently paused.');
            }

            const { data, error } = await supabase
                .from('subscriptions')
                .update({
                    paused_by_admin: false,
                    paused_until: null,
                    paused_at: null,
                    paused_by: null,
                })
                .eq('id', subscriptionId)
                .select()
                .single();

            if (error) throw error;

            // Audit log
            await supabase.from('admin_logs').insert({
                admin_id: adminId,
                action: 'resume_subscription',
                target_type: 'subscription',
                target_id: subscriptionId,
                details: { subscription_id: subscriptionId, resumed_at: new Date().toISOString() },
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-metrics'] });
            toast.success('Subscription resumed successfully.');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to resume subscription.');
        },
    });
}

export function useAdminCancelSubscription() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            subscriptionId,
            adminId,
        }: {
            subscriptionId: string;
            adminId: string;
        }) => {
            const today = format(new Date(), 'yyyy-MM-dd');

            // Guard: only allow cancelling active subscriptions
            const { data: current, error: fetchErr } = await supabase
                .from('subscriptions')
                .select('id, is_active, user_id, product_id')
                .eq('id', subscriptionId)
                .single();

            if (fetchErr || !current) throw new Error('Subscription not found.');
            if (!current.is_active) throw new Error('Subscription is already cancelled.');

            // 1. Mark subscription inactive with today as end_date
            const { data, error } = await supabase
                .from('subscriptions')
                .update({
                    is_active: false,
                    end_date: today,
                    paused_by_admin: false,
                    paused_until: null,
                })
                .eq('id', subscriptionId)
                .select()
                .single();

            if (error) throw error;

            // 2. Cancel all future upcoming deliveries for this subscription
            await supabase
                .from('deliveries')
                .update({ status: 'cancelled' })
                .eq('subscription_id', subscriptionId)
                .eq('status', 'upcoming')
                .gte('delivery_date', today);

            // 3. Audit log
            await supabase.from('admin_logs').insert({
                admin_id: adminId,
                action: 'cancel_subscription',
                target_type: 'subscription',
                target_id: subscriptionId,
                details: {
                    subscription_id: subscriptionId,
                    user_id: current.user_id,
                    product_id: current.product_id,
                    cancelled_at: new Date().toISOString(),
                },
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-metrics'] });
            toast.success('Subscription cancelled. Future deliveries have been cancelled. Historical records preserved.');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to cancel subscription.');
        },
    });
}

export function useAdminUpdateSubscriptionQuantity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            subscriptionId,
            quantity,
            adminId,
        }: {
            subscriptionId: string;
            quantity: number;
            adminId: string;
        }) => {
            // Validate quantity: positive integer 1–100
            if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
                throw new Error('Quantity must be an integer between 1 and 100.');
            }

            const { data: current, error: fetchErr } = await supabase
                .from('subscriptions')
                .select('id, is_active, quantity')
                .eq('id', subscriptionId)
                .single();

            if (fetchErr || !current) throw new Error('Subscription not found.');
            if (!current.is_active) throw new Error('Cannot update quantity of a cancelled subscription.');
            if (current.quantity === quantity) throw new Error('Quantity is already set to ' + quantity + '.');

            const oldQuantity = current.quantity;

            const { data, error } = await supabase
                .from('subscriptions')
                .update({ quantity })
                .eq('id', subscriptionId)
                .select()
                .single();

            if (error) throw error;

            // Audit log
            await supabase.from('admin_logs').insert({
                admin_id: adminId,
                action: 'update_subscription_quantity',
                target_type: 'subscription',
                target_id: subscriptionId,
                details: {
                    subscription_id: subscriptionId,
                    old_quantity: oldQuantity,
                    new_quantity: quantity,
                    updated_at: new Date().toISOString(),
                },
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
            toast.success('Subscription quantity updated successfully.');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update quantity.');
        },
    });
}

export function useAdminTriggerDeliveryGeneration() {
    return useMutation({
        mutationFn: async (targetDate: string) => {
            const { data, error } = await supabase.rpc('generate_subscription_deliveries', {
                target_date: targetDate,
            });
            if (error) throw error;
            return data as {
                success: boolean;
                error?: string;
                target_date: string;
                total_active_subscriptions: number;
                eligible_subscriptions: number;
                deliveries_generated: number;
                deliveries_already_existing: number;
                skipped_paused_count: number;
                generated_delivery_ids: string[];
            };
        },
        onSuccess: (data) => {
            if (data?.success) {
                toast.success(
                    `Delivery generation complete: ${data.deliveries_generated} generated, ${data.deliveries_already_existing} already existed.`
                );
            } else {
                toast.error(`Delivery generation failed: ${data?.error || 'Unknown error'}`);
            }
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to trigger delivery generation.');
        },
    });
}

// =============================================================================
// ADMIN ORDER MANAGEMENT HOOKS — Phase 12.6
// Canonical data source: public.orders + order_items + profiles + products + deliveries
// No mock data. No localStorage. No service-role key. RLS enforced.
// =============================================================================

export type AdminOrderStatus = 'confirmed' | 'scheduled' | 'delivered' | 'cancelled';
export type AdminOrderPaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type AdminOrderPaymentMethod = 'wallet' | 'cod' | 'phonepe';

export interface AdminOrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price_per_unit: number;
    total_amount: number;
    created_at: string;
    products: {
        id: string;
        name: string;
        unit: string;
        image_url: string | null;
    } | null;
}

export interface AdminOrderDelivery {
    id: string;
    status: string;
    delivery_date: string;
    delivery_type: string | null;
    delivery_partner_name: string | null;
    delivery_boy_id: string | null;
    notes: string | null;
}

export interface AdminOrder {
    id: string;
    user_id: string;
    product_id: string;
    quantity: number;
    price_per_unit: number;
    total_amount: number;
    delivery_date: string;
    payment_method: AdminOrderPaymentMethod;
    payment_status: AdminOrderPaymentStatus;
    status: AdminOrderStatus;
    delivery_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // Joined from profiles
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    customer_is_blocked: boolean;
    // Joined from products
    product_name: string | null;
    product_unit: string | null;
    // Item count for list view
    item_count: number;
    // Delivery info
    delivery_status: string | null;
    delivery_date_actual: string | null;
    // Full order_items (detail view only)
    order_items?: AdminOrderItem[];
    // Delivery (detail view only)
    delivery?: AdminOrderDelivery | null;
}

interface RawOrderRow {
    id: string;
    user_id: string;
    product_id: string;
    quantity: number | string;
    price_per_unit: number | string;
    total_amount: number | string;
    delivery_date: string;
    payment_method: string;
    payment_status: string;
    status: string;
    delivery_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    profiles?: {
        full_name: string | null;
        email: string | null;
        phone: string | null;
        is_blocked: boolean;
    } | null;
    products?: {
        name: string | null;
        unit: string | null;
        image_url?: string | null;
    } | null;
    deliveries?: {
        id: string;
        status: string;
        delivery_date: string;
        delivery_type: string | null;
        delivery_partner_name: string | null;
        delivery_boy_id?: string | null;
        notes?: string | null;
    } | null;
    order_items?: Array<{
        id: string;
        order_id: string;
        product_id: string;
        quantity: number | string;
        price_per_unit: number | string;
        total_amount: number | string;
        created_at: string;
        products: {
            id: string;
            name: string;
            unit: string;
            image_url: string | null;
        } | null;
    }>;
}

/** useAdminOrders — load all orders for admin list view */
export function useAdminOrders() {
    return useQuery<AdminOrder[], Error>({
        queryKey: ['admin-orders'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    user_id,
                    product_id,
                    quantity,
                    price_per_unit,
                    total_amount,
                    delivery_date,
                    payment_method,
                    payment_status,
                    status,
                    delivery_id,
                    notes,
                    created_at,
                    updated_at,
                    profiles!orders_user_id_profiles_fkey (
                        full_name,
                        email,
                        phone,
                        is_blocked
                    ),
                    products (
                        name,
                        unit
                    ),
                    deliveries:delivery_id (
                        id,
                        status,
                        delivery_date,
                        delivery_type,
                        delivery_partner_name
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const rows = (data || []) as unknown as RawOrderRow[];
            const orderIds = rows.map((o) => o.id);
            const itemCountMap: Record<string, number> = {};
            if (orderIds.length > 0) {
                const { data: items } = await supabase
                    .from('order_items')
                    .select('order_id')
                    .in('order_id', orderIds);
                for (const item of (items || [])) {
                    const rowItem = item as { order_id: string };
                    itemCountMap[rowItem.order_id] = (itemCountMap[rowItem.order_id] || 0) + 1;
                }
            }

            return rows.map((row) => ({
                id: row.id,
                user_id: row.user_id,
                product_id: row.product_id,
                quantity: Number(row.quantity),
                price_per_unit: Number(row.price_per_unit),
                total_amount: Number(row.total_amount),
                delivery_date: row.delivery_date,
                payment_method: row.payment_method as AdminOrderPaymentMethod,
                payment_status: row.payment_status as AdminOrderPaymentStatus,
                status: row.status as AdminOrderStatus,
                delivery_id: row.delivery_id,
                notes: row.notes,
                created_at: row.created_at,
                updated_at: row.updated_at,
                customer_name: row.profiles?.full_name ?? null,
                customer_email: row.profiles?.email ?? null,
                customer_phone: row.profiles?.phone ?? null,
                customer_is_blocked: row.profiles?.is_blocked ?? false,
                product_name: row.products?.name ?? null,
                product_unit: row.products?.unit ?? null,
                item_count: itemCountMap[row.id] ?? 0,
                delivery_status: row.deliveries?.status ?? null,
                delivery_date_actual: row.deliveries?.delivery_date ?? null,
            }));
        },
        staleTime: 30_000,
    });
}

/** useAdminOrderDetail — single order with full detail */
export function useAdminOrderDetail(orderId: string | null) {
    return useQuery<AdminOrder | null, Error>({
        queryKey: ['admin-order-detail', orderId],
        queryFn: async () => {
            if (!orderId) return null;

            const { data, error } = await supabase
                .from('orders')
                .select(`
                    id,
                    user_id,
                    product_id,
                    quantity,
                    price_per_unit,
                    total_amount,
                    delivery_date,
                    payment_method,
                    payment_status,
                    status,
                    delivery_id,
                    notes,
                    created_at,
                    updated_at,
                    profiles!orders_user_id_profiles_fkey (
                        full_name,
                        email,
                        phone,
                        is_blocked
                    ),
                    products (
                        name,
                        unit,
                        image_url
                    ),
                    order_items (
                        id,
                        order_id,
                        product_id,
                        quantity,
                        price_per_unit,
                        total_amount,
                        created_at,
                        products (
                            id,
                            name,
                            unit,
                            image_url
                        )
                    ),
                    deliveries:delivery_id (
                        id,
                        status,
                        delivery_date,
                        delivery_type,
                        delivery_partner_name,
                        delivery_boy_id,
                        notes
                    )
                `)
                .eq('id', orderId)
                .maybeSingle();

            if (error) throw error;
            if (!data) return null;

            const row = data as unknown as RawOrderRow;
            return {
                id: row.id,
                user_id: row.user_id,
                product_id: row.product_id,
                quantity: Number(row.quantity),
                price_per_unit: Number(row.price_per_unit),
                total_amount: Number(row.total_amount),
                delivery_date: row.delivery_date,
                payment_method: row.payment_method as AdminOrderPaymentMethod,
                payment_status: row.payment_status as AdminOrderPaymentStatus,
                status: row.status as AdminOrderStatus,
                delivery_id: row.delivery_id,
                notes: row.notes,
                created_at: row.created_at,
                updated_at: row.updated_at,
                customer_name: row.profiles?.full_name ?? null,
                customer_email: row.profiles?.email ?? null,
                customer_phone: row.profiles?.phone ?? null,
                customer_is_blocked: row.profiles?.is_blocked ?? false,
                product_name: row.products?.name ?? null,
                product_unit: row.products?.unit ?? null,
                item_count: (row.order_items || []).length,
                delivery_status: row.deliveries?.status ?? null,
                delivery_date_actual: row.deliveries?.delivery_date ?? null,
                order_items: (row.order_items || []).map((i) => ({
                    ...i,
                    quantity: Number(i.quantity),
                    price_per_unit: Number(i.price_per_unit),
                    total_amount: Number(i.total_amount),
                })),
                delivery: row.deliveries ?? null,
            };
        },
        enabled: !!orderId,
        staleTime: 15_000,
    });
}

/** useAdminCancelOrder — atomic cancel via server-side RPC with audit log */
export function useAdminCancelOrder() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; order_id: string; refunded: boolean; refund_amount: number },
        Error,
        { orderId: string; adminId: string; reason?: string }
    >({
        mutationFn: async ({ orderId, adminId, reason }) => {
            const { data, error } = await supabase.rpc('admin_cancel_order', {
                p_order_id: orderId,
                p_admin_id: adminId,
                p_reason: reason ?? null,
            });
            if (error) throw new Error(error.message);
            if (!data || data.success === false) throw new Error(data?.error || 'Failed to cancel order');
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin-order-detail'] });
            queryClient.invalidateQueries({ queryKey: ['admin-wallet'] });
            const msg = data.refunded
                ? `Order cancelled and \u20B9${Number(data.refund_amount).toFixed(2)} refunded to wallet.`
                : 'Order cancelled successfully.';
            toast.success(msg);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to cancel order.');
        },
    });
}

/** useAdminUpdateOrderStatus — update non-cancelled status via server-side RPC */
export function useAdminUpdateOrderStatus() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; order_id: string; new_status: AdminOrderStatus },
        Error,
        { orderId: string; adminId: string; newStatus: Exclude<AdminOrderStatus, 'cancelled'> }
    >({
        mutationFn: async ({ orderId, adminId, newStatus }) => {
            const { data, error } = await supabase.rpc('admin_update_order_status', {
                p_order_id: orderId,
                p_admin_id: adminId,
                p_new_status: newStatus,
            });
            if (error) throw new Error(error.message);
            if (!data || data.success === false) throw new Error(data?.error || 'Failed to update order status');
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin-order-detail'] });
            toast.success('Order status updated successfully.');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update order status.');
        },
    });
}
