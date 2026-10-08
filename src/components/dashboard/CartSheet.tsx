import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Minus, Plus, Trash2, AlertTriangle, ArrowRight, Banknote, Wallet, Smartphone, Loader2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/useWallet";
import { useProfile } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { phonePeService } from "@/lib/phonePeService";

interface CartSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CartSheet = ({ open, onOpenChange }: CartSheetProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const {
        items,
        itemCount,
        totalPrice,
        hasUnavailableItems,
        updateQuantity,
        removeItem,
        removeUnavailableItems,
        clearCart,
        syncWithCatalog,
    } = useCart();

    const { data: wallet, isLoading: walletLoading } = useWallet();
    const { data: profile } = useProfile();
    const [deliverNow, setDeliverNow] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"cod" | "wallet" | "phonepe">("cod");
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    const walletBalance = wallet?.balance ?? 0;
    const isWalletInsufficient = walletBalance < totalPrice;

    // Refresh cart items against database when sheet opens
    useEffect(() => {
        if (open) {
            syncWithCatalog();
        }
    }, [open, syncWithCatalog]);

    const handleCodCheckout = async () => {
        if (isPlacingOrder) return;
        if (!user?.id) {
            onOpenChange(false);
            navigate("/auth");
            toast.error("Please log in to complete your checkout");
            return;
        }

        if (profile?.is_blocked) {
            toast.error("Your account has been suspended. Please contact customer support.");
            return;
        }

        if (hasUnavailableItems || items.length === 0 || totalPrice <= 0) {
            toast.error("Please remove unavailable items before placing your order");
            return;
        }

        setIsPlacingOrder(true);
        try {
            // Authoritative product validation from database
            const productIds = items.map((i) => i.id);
            const { data: dbProducts, error: prodErr } = await supabase
                .from("products")
                .select("id, name, price_per_unit, is_active")
                .in("id", productIds);

            if (prodErr || !dbProducts) {
                throw new Error("Failed to verify product catalog. Please try again.");
            }

            // Verify active status of every product
            const inactiveOrMissing = items.find((item) => {
                const dbProd = dbProducts.find((p) => p.id === item.id);
                return !dbProd || dbProd.is_active === false;
            });

            if (inactiveOrMissing) {
                toast.error(`"${inactiveOrMissing.name}" is currently unavailable. Refreshing cart...`);
                await syncWithCatalog();
                setIsPlacingOrder(false);
                return;
            }

            const deliveryDate = deliverNow
                ? new Date().toISOString().split("T")[0]
                : new Date(Date.now() + 86400000).toISOString().split("T")[0];
            const txnId = `COD_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

            // Build canonical order rows using authoritative database price
            const orderRows = items.map((item) => {
                const dbProd = dbProducts.find((p) => p.id === item.id);
                const canonicalPrice = dbProd?.price_per_unit != null ? Number(dbProd.price_per_unit) : item.price;
                const validQty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
                return {
                    user_id: user.id,
                    product_id: item.id,
                    quantity: validQty,
                    price_per_unit: canonicalPrice,
                    delivery_date: deliveryDate,
                    payment_method: "cod" as const,
                    payment_status: "pending" as const,
                    status: "confirmed" as const,
                    notes: `COD Order (Txn: ${txnId})`,
                };
            });

            const { data: createdOrders, error: orderErr } = await supabase
                .from("orders")
                .insert(orderRows)
                .select("id");

            if (orderErr) {
                throw new Error(orderErr.message || "Failed to place order.");
            }

            // Successfully created orders!
            clearCart();
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["deliveries"] });
            onOpenChange(false);
            toast.success("Order placed successfully via Cash on Delivery!");
            navigate("/orders");
        } catch (err: unknown) {
            console.error("COD checkout error:", err);
            const msg = err instanceof Error ? err.message : "Failed to place order";
            toast.error(msg);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handleWalletCheckout = async () => {
        if (isPlacingOrder) return;
        if (!user?.id) {
            onOpenChange(false);
            navigate("/auth");
            toast.error("Please log in to complete your checkout");
            return;
        }

        if (profile?.is_blocked) {
            toast.error("Your account has been suspended. Please contact customer support.");
            return;
        }

        if (hasUnavailableItems || items.length === 0 || totalPrice <= 0) {
            toast.error("Please remove unavailable items before placing your order");
            return;
        }

        setIsPlacingOrder(true);
        try {
            // Authoritative product validation from database
            const productIds = items.map((i) => i.id);
            const { data: dbProducts, error: prodErr } = await supabase
                .from("products")
                .select("id, name, price_per_unit, is_active")
                .in("id", productIds);

            if (prodErr || !dbProducts) {
                throw new Error("Failed to verify product catalog. Please try again.");
            }

            const inactiveOrMissing = items.find((item) => {
                const dbProd = dbProducts.find((p) => p.id === item.id);
                return !dbProd || dbProd.is_active === false;
            });

            if (inactiveOrMissing) {
                toast.error(`"${inactiveOrMissing.name}" is currently unavailable. Refreshing cart...`);
                await syncWithCatalog();
                setIsPlacingOrder(false);
                return;
            }

            // Calculate canonical total using database prices
            let canonicalTotal = 0;
            for (const item of items) {
                const dbProd = dbProducts.find((p) => p.id === item.id);
                const canonicalPrice = dbProd?.price_per_unit != null ? Number(dbProd.price_per_unit) : item.price;
                canonicalTotal += canonicalPrice * item.quantity;
            }

            // Authoritative wallet check
            const { data: authoritativeWallet, error: wErr } = await supabase
                .from("wallets")
                .select("balance")
                .eq("user_id", user.id)
                .maybeSingle();

            const currentBalance = authoritativeWallet?.balance ?? 0;
            if (currentBalance < canonicalTotal) {
                toast.error(`Insufficient wallet balance. Total is ₹${canonicalTotal.toFixed(2)}, but your wallet only has ₹${currentBalance.toFixed(2)}.`);
                setIsPlacingOrder(false);
                return;
            }

            const deliveryDate = deliverNow
                ? new Date().toISOString().split("T")[0]
                : new Date(Date.now() + 86400000).toISOString().split("T")[0];
            const txnId = `WALLET_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

            // Call atomic create_wallet_order RPC for each item
            for (const item of items) {
                const { data: rpcRes, error: rpcErr } = await supabase.rpc("create_wallet_order", {
                    p_product_id: item.id,
                    p_quantity: item.quantity,
                    p_delivery_date: deliveryDate,
                    p_notes: `Wallet Order (Txn: ${txnId})`,
                    p_idempotency_key: `${txnId}_${item.id}`,
                });

                if (rpcErr || !rpcRes?.success) {
                    throw new Error(rpcRes?.error || rpcErr?.message || "Failed to process wallet payment");
                }
            }

            // Successfully paid and created all orders
            clearCart();
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["deliveries"] });
            queryClient.invalidateQueries({ queryKey: ["wallet"] });
            queryClient.invalidateQueries({ queryKey: ["wallet_transactions"] });
            onOpenChange(false);
            toast.success(`Order placed successfully! ₹${canonicalTotal.toFixed(2)} deducted from wallet.`);
            navigate("/orders");
        } catch (err: unknown) {
            console.error("Wallet checkout error:", err);
            const msg = err instanceof Error ? err.message : "Failed to complete wallet order";
            toast.error(msg);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handlePhonePeCheckout = async () => {
        if (isPlacingOrder) return;
        if (!user?.id) {
            onOpenChange(false);
            navigate("/auth");
            toast.error("Please log in to proceed to checkout");
            return;
        }

        if (profile?.is_blocked) {
            toast.error("Your account has been suspended. Please contact customer support.");
            return;
        }

        if (hasUnavailableItems || items.length === 0 || totalPrice <= 0) {
            toast.error("Please remove unavailable items before proceeding");
            return;
        }

        setIsPlacingOrder(true);
        try {
            const purpose = deliverNow ? "cart_checkout_now" : "cart_checkout";
            const response = await phonePeService.initiatePayment({
                purpose,
                items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
                deliveryDate: deliverNow
                    ? new Date().toISOString().split("T")[0]
                    : new Date(Date.now() + 86400000).toISOString().split("T")[0],
                redirectUrl: `${window.location.origin}/payment/success`,
            });

            if (response.success && response.paymentUrl) {
                onOpenChange(false);
                window.location.href = response.paymentUrl;
            } else if (response.code === "PHONEPE_NOT_CONFIGURED") {
                toast.error(
                    response.message ||
                    "PhonePe online payments are currently undergoing merchant gateway configuration. Please choose Cash on Delivery or Wallet."
                );
            } else {
                toast.error(response.message || "Failed to initiate PhonePe payment. Please try Cash on Delivery or Wallet.");
            }
        } catch (err: unknown) {
            console.error("PhonePe checkout error:", err);
            const msg = err instanceof Error ? err.message : "Payment initiation failed";
            toast.error(msg);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const handleProceedToCheckout = () => {
        if (!user) {
            onOpenChange(false);
            navigate("/auth");
            toast.error("Please log in to complete your checkout");
            return;
        }

        if (profile?.is_blocked) {
            toast.error("Your account has been suspended. You cannot place new orders.");
            return;
        }

        if (!profile?.address || profile.address.trim().length === 0) {
            toast.error("Please add your delivery address before placing an order");
            onOpenChange(false);
            navigate("/settings/address");
            return;
        }

        if (paymentMethod === "cod") {
            handleCodCheckout();
        } else if (paymentMethod === "wallet") {
            handleWalletCheckout();
        } else {
            handlePhonePeCheckout();
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col w-full sm:max-w-md p-4 sm:p-6 overflow-hidden">
                <SheetHeader className="pb-3 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-lg font-bold flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-primary" />
                            Shopping Cart ({itemCount})
                        </SheetTitle>
                    </div>
                    <SheetDescription className="text-xs">
                        Review your selected fresh dairy items and choose your payment method
                    </SheetDescription>
                </SheetHeader>

                {items.length === 0 ? (
                    // Empty state
                    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-6">
                        <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center text-4xl shadow-inner">
                            🥛
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-lg">Your cart is empty</h3>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                Looks like you haven't added any fresh dairy products yet.
                            </p>
                        </div>
                        <Button
                            onClick={() => {
                                onOpenChange(false);
                                navigate("/products");
                            }}
                            className="gap-2 mt-2"
                        >
                            Browse Products
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    // Cart items
                    <>
                        {/* Unavailable items alert banner */}
                        {hasUnavailableItems && (
                            <div className="mt-3 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-2">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Some items are currently unavailable</p>
                                        <p className="text-muted-foreground mt-0.5">
                                            Out-of-stock items cannot be ordered. Please remove them to proceed.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={removeUnavailableItems}
                                    className="w-full h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                                >
                                    Remove Unavailable Items
                                </Button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1">
                            {items.map((item) => {
                                const isInactive = item.is_active === false;
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex gap-3 p-3 rounded-xl border transition-all ${
                                            isInactive
                                                ? "border-destructive/30 bg-destructive/5 opacity-85"
                                                : "bg-card hover:border-primary/40 shadow-sm"
                                        }`}
                                    >
                                        {/* Item Image with Fallback */}
                                        <div className="w-16 h-16 rounded-lg bg-muted border overflow-hidden flex items-center justify-center text-xl flex-shrink-0 relative">
                                            {item.image_url ? (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                                        const sib = (e.currentTarget as HTMLElement).nextElementSibling;
                                                        if (sib) (sib as HTMLElement).style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className="w-full h-full items-center justify-center text-2xl"
                                                style={{ display: item.image_url ? 'none' : 'flex' }}
                                            >
                                                🥛
                                            </div>
                                        </div>

                                        {/* Item Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-1">
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        ₹{item.price.toFixed(2)} per {item.unit || "unit"}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                                                    onClick={() => removeItem(item.id)}
                                                    title={`Remove ${item.name}`}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>

                                            {/* Inactive item warning badge */}
                                            {isInactive && (
                                                <div className="mt-1">
                                                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-medium">
                                                        Currently unavailable
                                                    </Badge>
                                                </div>
                                            )}

                                            {/* Quantity and Price */}
                                            <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-muted/50">
                                                <div className="flex items-center gap-1 border rounded-md bg-background">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 rounded-none text-muted-foreground hover:text-foreground"
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        title="Decrease quantity"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="text-xs font-semibold w-6 text-center">
                                                        {item.quantity}
                                                    </span>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-6 w-6 rounded-none text-muted-foreground hover:text-foreground"
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        disabled={isInactive || item.quantity >= 99}
                                                        title={isInactive ? "Unavailable item cannot be increased" : "Increase quantity"}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>

                                                <div className="text-right">
                                                    <span className={`text-sm font-bold ${isInactive ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                                                        ₹{(item.price * item.quantity).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total & Checkout */}
                        <div className="border-t pt-3 space-y-3 bg-background mt-auto">
                            {/* Deliver Now Option */}
                            <div className="flex items-center justify-between border p-2.5 rounded-lg bg-accent/5">
                                <div className="space-y-0.5">
                                    <h4 className="text-xs font-medium">Deliver Now</h4>
                                    <p className="text-[11px] text-muted-foreground">
                                        Deliver today instead of regular morning delivery
                                    </p>
                                </div>
                                <Switch
                                    checked={deliverNow}
                                    onCheckedChange={setDeliverNow}
                                />
                            </div>

                            {/* Delivery Address Preview */}
                            <div className="flex items-center justify-between border p-2.5 rounded-lg bg-card text-xs">
                                <div className="flex items-start gap-2 min-w-0">
                                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <span className="font-semibold block text-foreground">Delivery Address:</span>
                                        {profile?.address ? (
                                            <p className="text-muted-foreground truncate max-w-[200px]" title={profile.address}>
                                                {profile.address}
                                            </p>
                                        ) : (
                                            <p className="text-destructive font-medium">No address provided</p>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="text-[11px] h-7 px-2.5 shrink-0"
                                    onClick={() => {
                                        onOpenChange(false);
                                        navigate("/settings/address");
                                    }}
                                >
                                    {profile?.address ? "Change" : "Add Address"}
                                </Button>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="space-y-1.5">
                                <span className="text-xs font-semibold text-foreground">Select Payment Method:</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {/* COD */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("cod")}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                                            paymentMethod === "cod"
                                                ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                                                : "border-border hover:border-muted-foreground/40 bg-card text-muted-foreground"
                                        }`}
                                    >
                                        <Banknote className="w-4 h-4 mb-1" />
                                        <span className="text-[11px] leading-tight">Cash on Delivery</span>
                                    </button>

                                    {/* Wallet */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("wallet")}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all relative ${
                                            paymentMethod === "wallet"
                                                ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                                                : "border-border hover:border-muted-foreground/40 bg-card text-muted-foreground"
                                        }`}
                                    >
                                        <Wallet className="w-4 h-4 mb-1" />
                                        <span className="text-[11px] leading-tight">Wallet</span>
                                        <span className={`text-[10px] ${isWalletInsufficient ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                                            ₹{walletBalance.toFixed(0)}
                                        </span>
                                    </button>

                                    {/* PhonePe */}
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod("phonepe")}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                                            paymentMethod === "phonepe"
                                                ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                                                : "border-border hover:border-muted-foreground/40 bg-card text-muted-foreground"
                                        }`}
                                    >
                                        <Smartphone className="w-4 h-4 mb-1" />
                                        <span className="text-[11px] leading-tight">PhonePe</span>
                                    </button>
                                </div>
                            </div>

                            {/* Wallet Insufficient Warning */}
                            {paymentMethod === "wallet" && isWalletInsufficient && (
                                <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[11px] flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                        Wallet balance (₹{walletBalance.toFixed(2)}) is less than cart total. Choose Cash on Delivery or PhonePe.
                                    </span>
                                </div>
                            )}

                            {/* Pricing summary */}
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span className="font-medium text-foreground">₹{totalPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Delivery Charges</span>
                                    <span className="text-green-600 font-semibold">Free</span>
                                </div>
                                <div className="flex justify-between text-base font-bold pt-2 border-t mt-1">
                                    <span>Total Payable</span>
                                    <span className="text-primary font-bold">₹{totalPrice.toFixed(2)}</span>
                                </div>
                            </div>

                            <Button
                                className="w-full font-semibold"
                                size="lg"
                                onClick={handleProceedToCheckout}
                                disabled={
                                    profile?.is_blocked ||
                                    hasUnavailableItems ||
                                    items.length === 0 ||
                                    totalPrice <= 0 ||
                                    isPlacingOrder ||
                                    (paymentMethod === "wallet" && isWalletInsufficient)
                                }
                            >
                                {profile?.is_blocked ? (
                                    "Account Suspended (Orders Blocked)"
                                ) : isPlacingOrder ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processing Order...
                                    </>
                                ) : hasUnavailableItems ? (
                                    "Remove Unavailable Items to Checkout"
                                ) : paymentMethod === "cod" ? (
                                    <>
                                        Place Order (Cash on Delivery)
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                ) : paymentMethod === "wallet" ? (
                                    isWalletInsufficient ? (
                                        "Insufficient Wallet Balance"
                                    ) : (
                                        <>
                                            Pay ₹{totalPrice.toFixed(2)} from Wallet
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )
                                ) : (
                                    <>
                                        Proceed to Pay ₹{totalPrice.toFixed(2)} with PhonePe
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
};

export default CartSheet;

