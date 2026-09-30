// src/hooks/useAdminDeliveries.ts
// Real Supabase delivery & order management hooks for administrators

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DeliveryStatus = "upcoming" | "delivered" | "paused" | "missed" | "cancelled";
export type OrderStatus = "confirmed" | "scheduled" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type PaymentMethod = "wallet" | "cod" | "phonepe";

export interface DeliveryProduct {
  id: string;
  name: string;
  unit: string;
  image_url: string | null;
}

export interface LinkedOrderInfo {
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  total_amount: number;
  delivery_date: string;
}

export interface AdminDelivery {
  id: string;
  user_id: string;
  subscription_id: string | null;
  product_id: string;
  delivery_date: string;
  quantity: number;
  price_per_unit: number;
  status: DeliveryStatus;
  delivery_type: "subscription" | "one_time";
  order_id: string | null;
  delivery_time: string | null;
  delivery_proof_url: string | null;
  delivered_by: string | null;
  marked_delivered_at: string | null;
  marked_delivered_by: string | null;
  delivery_partner_name: string | null;
  delivery_boy_id: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  products?: DeliveryProduct | null;
  order?: LinkedOrderInfo | null;
}

export interface AdminCustomerOrder {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  delivery_date: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  delivery_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  products?: DeliveryProduct | null;
}

export interface DeliveryPartner {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: string | null;
}

export interface ScheduleOrderDeliveryParams {
  orderId: string;
  deliveryBoyId?: string;
  deliveryBoyName?: string;
}

export interface ScheduleOrderDeliveryResult {
  delivery: AdminDelivery;
  isExisting: boolean;
}

export interface UpdateDeliveryStatusParams {
  deliveryId: string;
  newStatus: DeliveryStatus;
  orderId?: string | null;
  customerId: string;
}

export interface AssignDeliveryPartnerParams {
  deliveryId: string;
  deliveryBoyId: string;
  deliveryBoyName: string;
  customerId: string;
}

/**
 * Fetch all real deliveries for a specific customer from public.deliveries.
 */
export function useCustomerDeliveries(customerId: string) {
  return useQuery<AdminDelivery[], Error>({
    queryKey: ["admin-customer-deliveries", customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          id,
          user_id,
          subscription_id,
          product_id,
          delivery_date,
          quantity,
          price_per_unit,
          status,
          delivery_type,
          order_id,
          delivery_time,
          delivery_proof_url,
          delivered_by,
          marked_delivered_at,
          marked_delivered_by,
          delivery_partner_name,
          delivery_boy_id,
          assigned_at,
          assigned_by,
          notes,
          created_at,
          updated_at,
          products (
            id,
            name,
            unit,
            image_url
          ),
          order:orders!deliveries_order_id_fkey (
            id,
            status,
            payment_status,
            payment_method,
            total_amount,
            delivery_date
          )
        `)
        .eq("user_id", customerId)
        .order("delivery_date", { ascending: false });

      if (error) {
        throw new Error(`Failed to load deliveries: ${error.message}`);
      }

      const deliveries: AdminDelivery[] = (data || []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        subscription_id: row.subscription_id,
        product_id: row.product_id,
        delivery_date: row.delivery_date,
        quantity: Number(row.quantity),
        price_per_unit: Number(row.price_per_unit),
        status: row.status as DeliveryStatus,
        delivery_type: (row.delivery_type as "subscription" | "one_time") || "subscription",
        order_id: row.order_id,
        delivery_time: row.delivery_time,
        delivery_proof_url: row.delivery_proof_url,
        delivered_by: row.delivered_by,
        marked_delivered_at: row.marked_delivered_at,
        marked_delivered_by: row.marked_delivered_by,
        delivery_partner_name: row.delivery_partner_name,
        delivery_boy_id: row.delivery_boy_id,
        assigned_at: row.assigned_at,
        assigned_by: row.assigned_by,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        products: row.products ? {
          id: row.products.id,
          name: row.products.name,
          unit: row.products.unit,
          image_url: row.products.image_url,
        } : null,
        order: row.order ? {
          id: row.order.id,
          status: row.order.status as OrderStatus,
          payment_status: row.order.payment_status as PaymentStatus,
          payment_method: row.order.payment_method as PaymentMethod,
          total_amount: Number(row.order.total_amount),
          delivery_date: row.order.delivery_date,
        } : null,
      }));

      return deliveries;
    },
    enabled: Boolean(customerId),
  });
}

/**
 * Fetch all one-time orders for a specific customer from public.orders.
 */
export function useCustomerOrders(customerId: string) {
  return useQuery<AdminCustomerOrder[], Error>({
    queryKey: ["admin-customer-orders", customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from("orders")
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
          products (
            id,
            name,
            unit,
            image_url
          )
        `)
        .eq("user_id", customerId)
        .order("delivery_date", { ascending: false });

      if (error) {
        throw new Error(`Failed to load customer orders: ${error.message}`);
      }

      const orders: AdminCustomerOrder[] = (data || []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        product_id: row.product_id,
        quantity: Number(row.quantity),
        price_per_unit: Number(row.price_per_unit),
        total_amount: Number(row.total_amount),
        delivery_date: row.delivery_date,
        payment_method: row.payment_method as PaymentMethod,
        payment_status: row.payment_status as PaymentStatus,
        status: row.status as OrderStatus,
        delivery_id: row.delivery_id,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
        products: row.products ? {
          id: row.products.id,
          name: row.products.name,
          unit: row.products.unit,
          image_url: row.products.image_url,
        } : null,
      }));

      return orders;
    },
    enabled: Boolean(customerId),
  });
}

/**
 * Fetch delivery boys and delivery partners from profiles.
 */
export function useDeliveryPartners() {
  return useQuery<DeliveryPartner[], Error>({
    queryKey: ["admin-delivery-partners"],
    queryFn: async () => {
      // 1. Query delivery partners from user_roles
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "delivery_partner");

      if (roleError) {
        throw new Error(`Failed to load delivery partners: ${roleError.message}`);
      }

      const partnerUserIds = (roleData || []).map((r) => r.user_id);
      if (partnerUserIds.length === 0) {
        return [];
      }

      // 2. Fetch corresponding profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone")
        .in("user_id", partnerUserIds);

      if (profileError) {
        throw new Error(`Failed to load partner profiles: ${profileError.message}`);
      }

      return (profiles || []).map((p) => ({
        id: p.user_id,
        full_name: p.full_name,
        phone: p.phone,
        role: "delivery_partner",
      }));
    },
  });
}

/**
 * Schedule a delivery for an existing customer order.
 * Follows the canonical pipeline:
 * orders -> admin schedules -> deliveries row is created -> deliveries.order_id points to orders.id -> orders.delivery_id is updated.
 *
 * Implements duplicate delivery protection:
 * 1. Checks if a delivery already exists for this order.
 * 2. If it exists, returns existing delivery and synchronises orders.delivery_id if missing.
 * 3. Handles DB unique index conflicts safely.
 * 4. Updates orders.delivery_id and sets orders.status = 'scheduled'.
 * 5. Does NOT silently claim success if order update fails.
 */
export function useScheduleOrderDelivery() {
  const queryClient = useQueryClient();

  return useMutation<ScheduleOrderDeliveryResult, Error, ScheduleOrderDeliveryParams>({
    mutationFn: async ({ orderId, deliveryBoyId, deliveryBoyName }) => {
      // 1. Verify admin session
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        throw new Error("Admin authentication required to schedule deliveries.");
      }

      // 2. Fetch the target order
      const { data: order, error: orderFetchError } = await supabase
        .from("orders")
        .select("id, user_id, product_id, quantity, price_per_unit, delivery_date, status, delivery_id, notes")
        .eq("id", orderId)
        .maybeSingle();

      if (orderFetchError) {
        throw new Error(`Failed to fetch order: ${orderFetchError.message}`);
      }
      if (!order) {
        throw new Error("Order not found.");
      }
      if (order.status === "cancelled") {
        throw new Error("Cannot schedule a cancelled order.");
      }

      // 3. DUPLICATE CHECK: Inspect if a delivery already exists for this order
      const { data: existingDelivery, error: existingError } = await supabase
        .from("deliveries")
        .select(`
          id,
          user_id,
          subscription_id,
          product_id,
          delivery_date,
          quantity,
          price_per_unit,
          status,
          delivery_type,
          order_id,
          delivery_time,
          delivery_proof_url,
          delivered_by,
          marked_delivered_at,
          marked_delivered_by,
          delivery_partner_name,
          delivery_boy_id,
          assigned_at,
          assigned_by,
          notes,
          created_at,
          updated_at,
          products (
            id,
            name,
            unit,
            image_url
          )
        `)
        .eq("order_id", order.id)
        .maybeSingle();

      if (existingError) {
        throw new Error(`Error verifying existing delivery: ${existingError.message}`);
      }

      if (existingDelivery) {
        // If order's delivery_id is not set, repair the reference
        if (!order.delivery_id || order.status !== "scheduled") {
          await supabase
            .from("orders")
            .update({
              delivery_id: existingDelivery.id,
              status: order.status === "confirmed" ? "scheduled" : order.status,
            })
            .eq("id", order.id);
        }

        const mappedExisting: AdminDelivery = {
          id: existingDelivery.id,
          user_id: existingDelivery.user_id,
          subscription_id: existingDelivery.subscription_id,
          product_id: existingDelivery.product_id,
          delivery_date: existingDelivery.delivery_date,
          quantity: Number(existingDelivery.quantity),
          price_per_unit: Number(existingDelivery.price_per_unit),
          status: existingDelivery.status as DeliveryStatus,
          delivery_type: (existingDelivery.delivery_type as "subscription" | "one_time") || "one_time",
          order_id: existingDelivery.order_id,
          delivery_time: existingDelivery.delivery_time,
          delivery_proof_url: existingDelivery.delivery_proof_url,
          delivered_by: existingDelivery.delivered_by,
          marked_delivered_at: existingDelivery.marked_delivered_at,
          marked_delivered_by: existingDelivery.marked_delivered_by,
          delivery_partner_name: existingDelivery.delivery_partner_name,
          delivery_boy_id: existingDelivery.delivery_boy_id,
          assigned_at: existingDelivery.assigned_at,
          assigned_by: existingDelivery.assigned_by,
          notes: existingDelivery.notes,
          created_at: existingDelivery.created_at,
          updated_at: existingDelivery.updated_at,
          products: existingDelivery.products ? {
            id: existingDelivery.products.id,
            name: existingDelivery.products.name,
            unit: existingDelivery.products.unit,
            image_url: existingDelivery.products.image_url,
          } : null,
        };

        return { delivery: mappedExisting, isExisting: true };
      }

      // 4. Create new canonical row in public.deliveries
      const insertPayload = {
        user_id: order.user_id,
        order_id: order.id,
        delivery_type: "one_time" as const,
        product_id: order.product_id,
        delivery_date: order.delivery_date,
        quantity: Number(order.quantity),
        price_per_unit: Number(order.price_per_unit),
        status: "upcoming" as const,
        delivery_boy_id: deliveryBoyId || null,
        delivery_partner_name: deliveryBoyName || null,
        assigned_at: deliveryBoyId ? new Date().toISOString() : null,
        assigned_by: deliveryBoyId ? currentUser.id : null,
        notes: order.notes || null,
      };

      const { data: createdDelivery, error: insertError } = await supabase
        .from("deliveries")
        .insert(insertPayload)
        .select(`
          id,
          user_id,
          subscription_id,
          product_id,
          delivery_date,
          quantity,
          price_per_unit,
          status,
          delivery_type,
          order_id,
          delivery_time,
          delivery_proof_url,
          delivered_by,
          marked_delivered_at,
          marked_delivered_by,
          delivery_partner_name,
          delivery_boy_id,
          assigned_at,
          assigned_by,
          notes,
          created_at,
          updated_at,
          products (
            id,
            name,
            unit,
            image_url
          )
        `)
        .single();

      if (insertError) {
        // Handle race condition or unique index collision
        if (insertError.code === "23505" || insertError.message.includes("unique")) {
          const { data: raceDelivery } = await supabase
            .from("deliveries")
            .select(`
              id,
              user_id,
              subscription_id,
              product_id,
              delivery_date,
              quantity,
              price_per_unit,
              status,
              delivery_type,
              order_id,
              delivery_time,
              delivery_proof_url,
              delivered_by,
              marked_delivered_at,
              marked_delivered_by,
              delivery_partner_name,
              delivery_boy_id,
              assigned_at,
              assigned_by,
              notes,
              created_at,
              updated_at,
              products (
                id,
                name,
                unit,
                image_url
              )
            `)
            .eq("order_id", order.id)
            .maybeSingle();

          if (raceDelivery) {
            await supabase
              .from("orders")
              .update({
                delivery_id: raceDelivery.id,
                status: "scheduled",
              })
              .eq("id", order.id);

            const mappedRace: AdminDelivery = {
              id: raceDelivery.id,
              user_id: raceDelivery.user_id,
              subscription_id: raceDelivery.subscription_id,
              product_id: raceDelivery.product_id,
              delivery_date: raceDelivery.delivery_date,
              quantity: Number(raceDelivery.quantity),
              price_per_unit: Number(raceDelivery.price_per_unit),
              status: raceDelivery.status as DeliveryStatus,
              delivery_type: (raceDelivery.delivery_type as "subscription" | "one_time") || "one_time",
              order_id: raceDelivery.order_id,
              delivery_time: raceDelivery.delivery_time,
              delivery_proof_url: raceDelivery.delivery_proof_url,
              delivered_by: raceDelivery.delivered_by,
              marked_delivered_at: raceDelivery.marked_delivered_at,
              marked_delivered_by: raceDelivery.marked_delivered_by,
              delivery_partner_name: raceDelivery.delivery_partner_name,
              delivery_boy_id: raceDelivery.delivery_boy_id,
              assigned_at: raceDelivery.assigned_at,
              assigned_by: raceDelivery.assigned_by,
              notes: raceDelivery.notes,
              created_at: raceDelivery.created_at,
              updated_at: raceDelivery.updated_at,
              products: raceDelivery.products ? {
                id: raceDelivery.products.id,
                name: raceDelivery.products.name,
                unit: raceDelivery.products.unit,
                image_url: raceDelivery.products.image_url,
              } : null,
            };

            return { delivery: mappedRace, isExisting: true };
          }
        }

        throw new Error(`Failed to create delivery record: ${insertError.message}`);
      }

      // 5. Update public.orders to link delivery_id and change status to 'scheduled'
      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          delivery_id: createdDelivery.id,
          status: "scheduled",
        })
        .eq("id", order.id);

      if (orderUpdateError) {
        // Report partial-state explicitly - do NOT silently claim success
        throw new Error(
          `Delivery created with ID ${createdDelivery.id}, but failed to update order status: ${orderUpdateError.message}. Please verify the order status.`
        );
      }

      const mappedNewDelivery: AdminDelivery = {
        id: createdDelivery.id,
        user_id: createdDelivery.user_id,
        subscription_id: createdDelivery.subscription_id,
        product_id: createdDelivery.product_id,
        delivery_date: createdDelivery.delivery_date,
        quantity: Number(createdDelivery.quantity),
        price_per_unit: Number(createdDelivery.price_per_unit),
        status: createdDelivery.status as DeliveryStatus,
        delivery_type: (createdDelivery.delivery_type as "subscription" | "one_time") || "one_time",
        order_id: createdDelivery.order_id,
        delivery_time: createdDelivery.delivery_time,
        delivery_proof_url: createdDelivery.delivery_proof_url,
        delivered_by: createdDelivery.delivered_by,
        marked_delivered_at: createdDelivery.marked_delivered_at,
        marked_delivered_by: createdDelivery.marked_delivered_by,
        delivery_partner_name: createdDelivery.delivery_partner_name,
        delivery_boy_id: createdDelivery.delivery_boy_id,
        assigned_at: createdDelivery.assigned_at,
        assigned_by: createdDelivery.assigned_by,
        notes: createdDelivery.notes,
        created_at: createdDelivery.created_at,
        updated_at: createdDelivery.updated_at,
        products: createdDelivery.products ? {
          id: createdDelivery.products.id,
          name: createdDelivery.products.name,
          unit: createdDelivery.products.unit,
          image_url: createdDelivery.products.image_url,
        } : null,
      };

      return { delivery: mappedNewDelivery, isExisting: false };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["admin-customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      if (result.isExisting) {
        toast.info("A delivery was already scheduled for this order.");
      } else {
        toast.success(`Delivery scheduled successfully for ${result.delivery.delivery_date}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to schedule delivery");
    },
  });
}

/**
 * Update delivery status (e.g. mark delivered, pause, or cancel).
 * If delivery has an associated order_id, also updates the order status consistently.
 */
export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, UpdateDeliveryStatusParams>({
    mutationFn: async ({ deliveryId, newStatus, orderId }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const nowIso = new Date().toISOString();

      if (newStatus === "delivered") {
        // Attempt using database RPC if available
        if (currentUser?.id) {
          const { data: rpcResult, error: rpcError } = await supabase.rpc("mark_delivery_delivered", {
            _delivery_id: deliveryId,
            _marked_by: currentUser.id,
          });

          const rpcSuccess = !rpcError && rpcResult && typeof rpcResult === "object" && "success" in rpcResult && rpcResult.success === true;

          if (!rpcSuccess) {
            // Direct update fallback permitted by Admin RLS
            const { error: directError } = await supabase
              .from("deliveries")
              .update({
                status: "delivered",
                delivery_time: nowIso,
                marked_delivered_at: nowIso,
                marked_delivered_by: currentUser.id,
                delivered_by: currentUser.id,
              })
              .eq("id", deliveryId);

            if (directError) {
              throw new Error(`Failed to mark delivery delivered: ${directError.message}`);
            }
          }
        } else {
          const { error: directError } = await supabase
            .from("deliveries")
            .update({
              status: "delivered",
              delivery_time: nowIso,
            })
            .eq("id", deliveryId);

          if (directError) {
            throw new Error(`Failed to mark delivery delivered: ${directError.message}`);
          }
        }

        // If this delivery was for an order, transition order to 'delivered'
        if (orderId) {
          const { error: orderError } = await supabase
            .from("orders")
            .update({ status: "delivered" })
            .eq("id", orderId);

          if (orderError) {
            toast.warning(`Delivery marked delivered, but could not update order status: ${orderError.message}`);
          }
        }
      } else {
        // Update to upcoming, paused, missed, or cancelled
        const { error: updateError } = await supabase
          .from("deliveries")
          .update({
            status: newStatus,
          })
          .eq("id", deliveryId);

        if (updateError) {
          throw new Error(`Failed to update delivery status: ${updateError.message}`);
        }

        // If cancelled and linked to order, update order status
        if (newStatus === "cancelled" && orderId) {
          await supabase
            .from("orders")
            .update({ status: "cancelled" })
            .eq("id", orderId);
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer-deliveries", variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-customer-orders", variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });

      toast.success(`Delivery status updated to ${variables.newStatus}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update delivery status");
    },
  });
}

/**
 * Assign or reassign a delivery partner to a delivery.
 */
export function useAssignDeliveryPartner() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, AssignDeliveryPartnerParams>({
    mutationFn: async ({ deliveryId, deliveryBoyId, deliveryBoyName }) => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("deliveries")
        .update({
          delivery_boy_id: deliveryBoyId,
          delivery_partner_name: deliveryBoyName,
          assigned_at: new Date().toISOString(),
          assigned_by: currentUser?.id || null,
        })
        .eq("id", deliveryId);

      if (error) {
        throw new Error(`Failed to assign delivery partner: ${error.message}`);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-customer-deliveries", variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      toast.success(`Assigned to ${variables.deliveryBoyName}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to assign delivery partner");
    },
  });
}
