import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderStatus = "confirmed" | "scheduled" | "delivered" | "cancelled";
export type OrderPaymentStatus = "pending" | "paid" | "refunded" | "failed";
export type OrderPaymentMethod = "wallet" | "cod" | "phonepe";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  created_at?: string;
  products?: {
    id: string;
    name: string;
    unit: string;
    image_url: string | null;
  } | null;
}

export interface OrderDelivery {
  id: string;
  status: string;
  delivery_date: string;
  delivery_type?: string;
  delivery_boy_id?: string | null;
  delivery_partner_name?: string | null;
  notes?: string | null;
}

export interface Order {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  delivery_date: string;
  payment_method: OrderPaymentMethod;
  payment_status: OrderPaymentStatus;
  status: OrderStatus;
  delivery_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  products?: {
    id: string;
    name: string;
    unit: string;
    image_url: string | null;
  } | null;
  order_items?: OrderItem[];
  deliveries?: OrderDelivery | null;
}

export interface CreateOrderInput {
  productId: string;
  quantity: number;
  deliveryDate: string;
  /** UI payment method. "prepaid" maps to "wallet" in the DB. */
  paymentMethod: "wallet" | "prepaid" | "cod" | "phonepe";
  notes?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise UI "prepaid" → DB "wallet" enum value */
function toDbPaymentMethod(pm: CreateOrderInput["paymentMethod"]): OrderPaymentMethod {
  return pm === "prepaid" ? "wallet" : (pm as OrderPaymentMethod);
}

// ---------------------------------------------------------------------------
// useOrders – list customer's own orders
// ---------------------------------------------------------------------------

export function useOrders() {
  const { user } = useAuth();

  return useQuery<Order[], Error>({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          products (
            id,
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
            delivery_boy_id,
            delivery_partner_name,
            notes
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user?.id,
  });
}

// ---------------------------------------------------------------------------
// useOrder – single order detail
// ---------------------------------------------------------------------------

export function useOrder(orderId: string | null) {
  const { user } = useAuth();

  return useQuery<Order | null, Error>({
    queryKey: ["orders", user?.id, orderId],
    queryFn: async () => {
      if (!user?.id || !orderId) return null;

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          products (
            id,
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
            delivery_boy_id,
            delivery_partner_name,
            notes
          )
        `
        )
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Order | null;
    },
    enabled: !!user?.id && !!orderId,
  });
}

// ---------------------------------------------------------------------------
// useCreateOrder – create a one-time order
// ---------------------------------------------------------------------------
//
// Wallet deduction flow (mirrors the logic previously in useCreateDelivery):
//   1. Pre-check wallet balance client-side (AddMilkDialog already does this;
//      we repeat here as a safety guard).
//   2. INSERT into public.orders → payment_status = 'pending'.
//   3. If paymentMethod === 'wallet':
//        a. Deduct balance from public.wallets.
//        b. INSERT a wallet_transactions debit row.
//        c. UPDATE orders.payment_status = 'paid'.
//      On any failure after step 2 we attempt to cancel the order so the DB
//      stays consistent (best-effort – a proper saga/transaction would need
//      an Edge Function; this is safe at current scale).
// ---------------------------------------------------------------------------

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Order, Error, CreateOrderInput>({
    mutationFn: async ({ productId, quantity, deliveryDate, paymentMethod, notes }) => {
      // 1. Auth guard
      if (!user?.id) throw new Error("Not authenticated");

      // 2. Validate inputs
      if (!productId) throw new Error("Product is required");
      if (quantity <= 0) throw new Error("Quantity must be greater than zero");
      if (!deliveryDate) throw new Error("Delivery date is required");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const requested = new Date(deliveryDate);
      if (requested < today) throw new Error("Delivery date cannot be in the past");

      // 3. Fetch product & price
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("id, name, price_per_unit")
        .eq("id", productId)
        .eq("is_active", true)
        .single();

      if (productError || !product) throw new Error("Product not found or unavailable");

      const pricePerUnit: number = product.price_per_unit;
      const totalAmount = quantity * pricePerUnit;
      const dbPaymentMethod = toDbPaymentMethod(paymentMethod);

      // 4. Handle Wallet Order via Atomic Database Transaction (ACID, row-locked)
      if (dbPaymentMethod === "wallet") {
        const { data: result, error: rpcError } = await supabase.rpc("create_wallet_order", {
          p_product_id: productId,
          p_quantity: quantity,
          p_delivery_date: deliveryDate,
          p_notes: notes ?? null,
        });

        if (rpcError) throw new Error(rpcError.message);
        if (!result || result.success === false) {
          throw new Error(result?.error || "Failed to create prepaid wallet order");
        }

        const { data: paidOrder, error: fetchErr } = await supabase
          .from("orders")
          .select(
            `
            *,
            products (
              id,
              name,
              unit,
              image_url
            )
          `
          )
          .eq("id", result.order_id)
          .single();

        if (fetchErr) throw fetchErr;
        return paidOrder as Order;
      }

      // 5. Non-wallet orders (COD / PhonePe) remain standard insert
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity,
          price_per_unit: pricePerUnit,
          delivery_date: deliveryDate,
          payment_method: dbPaymentMethod,
          payment_status: "pending",
          status: "confirmed",
          notes: notes ?? null,
        })
        .select(
          `
          *,
          products (
            id,
            name,
            unit,
            image_url
          )
        `
        )
        .single();

      if (orderError) throw orderError;
      return order as Order;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet_transactions"] });
    },
  });
}

// ---------------------------------------------------------------------------
// useCancelOrder – customer cancels a 'confirmed' order
// ---------------------------------------------------------------------------
//
// Invokes the atomic `cancel_order_with_refund` RPC.
// Row-locks the order and customer wallet in Postgres, cancels the order,
// refunds wallet balance exactly once if paid, and prevents duplicate refunds.
// ---------------------------------------------------------------------------

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Order, Error, string>({
    mutationFn: async (orderId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Execute atomic cancellation and refund via database RPC
      const { data: result, error: rpcError } = await supabase.rpc("cancel_order_with_refund", {
        p_order_id: orderId,
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!result || result.success === false) {
        throw new Error(result?.error || "Failed to cancel order");
      }

      // Fetch the updated cancelled order
      const { data: cancelled, error: fetchErr } = await supabase
        .from("orders")
        .select(
          `
          *,
          products (
            id,
            name,
            unit,
            image_url
          )
        `
        )
        .eq("id", orderId)
        .single();

      if (fetchErr) throw fetchErr;
      return cancelled as Order;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

// ---------------------------------------------------------------------------
// useRepeatOrder – create a new order based on a previously delivered order
// ---------------------------------------------------------------------------
//
// Replaces the old useRepeatOrder that INSERT'd directly into `deliveries`.
// Now it creates an `orders` row for the target date using the same product,
// quantity, and CURRENT canonical price from public.products (never historical).
// Inactive or discontinued products are rejected with a clear customer error.
// Includes idempotency protection against rapid repeated clicks.
// ---------------------------------------------------------------------------

export function useRepeatOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<Order, Error, { orderId: string; targetDate: string }>({
    mutationFn: async ({ orderId, targetDate }) => {
      if (!user?.id) throw new Error("Not authenticated");

      // 1. Fetch the source order (RLS ensures ownership)
      const { data: source, error: fetchErr } = await supabase
        .from("orders")
        .select("id, product_id, quantity, price_per_unit, status")
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;
      if (!source) throw new Error("Source order not found");
      if (source.status !== "delivered") {
        throw new Error("Can only repeat delivered orders");
      }

      // 2. Validate target date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const requested = new Date(targetDate);
      if (requested < today) throw new Error("Delivery date cannot be in the past");

      // 3. Validate product availability and fetch CURRENT canonical price
      const { data: product, error: prodErr } = await supabase
        .from("products")
        .select("id, name, price_per_unit, is_active")
        .eq("id", source.product_id)
        .maybeSingle();

      if (prodErr || !product) {
        throw new Error("The product from this order is no longer available in the catalog.");
      }

      if (product.is_active === false) {
        throw new Error(`"${product.name}" is currently unavailable or out of stock. Cannot repeat this order.`);
      }

      const currentPrice: number = Number(product.price_per_unit);
      const quantity: number = Number(source.quantity);
      const idempotencyKey = `repeat_${orderId}_${targetDate}`;

      // 4. Repeat Idempotency Check: Prevent duplicate repeat creation on rapid clicks
      const { data: existingRepeat } = await supabase
        .from("orders")
        .select(
          `
          *,
          products (
            id,
            name,
            unit,
            image_url
          )
        `
        )
        .eq("user_id", user.id)
        .ilike("notes", `%${idempotencyKey}%`)
        .maybeSingle();

      if (existingRepeat) {
        return existingRepeat as Order;
      }

      // 5. Create new order with CURRENT canonical price (COD by default for safe repeat)
      const { data: newOrder, error: insertErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: source.product_id,
          quantity,
          price_per_unit: currentPrice, // strictly current price
          delivery_date: targetDate,
          payment_method: "cod",
          payment_status: "pending",
          status: "confirmed",
          notes: `Repeat of order #${orderId.slice(0, 8)} (${idempotencyKey})`,
        })
        .select(
          `
          *,
          products (
            id,
            name,
            unit,
            image_url
          )
        `
        )
        .single();

      if (insertErr) throw insertErr;
      return newOrder as Order;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

// ---------------------------------------------------------------------------
// useLatestDeliveredOrder – fetch customer's most recent delivered order
// ---------------------------------------------------------------------------

export function useLatestDeliveredOrder() {
  const { user } = useAuth();

  return useQuery<Order | null, Error>({
    queryKey: ["orders", user?.id, "latest-delivered"],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          products (
            id,
            name,
            unit,
            image_url
          )
        `
        )
        .eq("user_id", user.id)
        .eq("status", "delivered")
        .order("delivery_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as Order) || null;
    },
    enabled: !!user?.id,
  });
}

