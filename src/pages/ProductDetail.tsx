import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart, Calendar, Check, Minus, Plus, Star, ShieldCheck, Truck, Clock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";
import AddMilkDialog from "@/components/dashboard/AddMilkDialog";
import CartSheet from "@/components/dashboard/CartSheet";

interface Product {
    id: string;
    name: string;
    price_per_unit: number;
    unit: string;
    category: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    subscription_enabled?: boolean;
    addon_product?: boolean;
}

const ProductDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addItem, itemCount } = useCart();
    const { isFavorite, toggleFavorite } = useFavorites();

    const [quantity, setQuantity] = useState(1);
    const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
    const [showCart, setShowCart] = useState(false);
    const [imgError, setImgError] = useState(false);

    const { data: product, isLoading, error, refetch } = useQuery<Product | null>({
        queryKey: ["product-detail", id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error: fetchErr } = await supabase
                .from("products")
                .select("*")
                .eq("id", id)
                .maybeSingle();

            if (fetchErr) throw fetchErr;
            return data as Product | null;
        },
        enabled: Boolean(id),
    });

    const handleAddToCart = () => {
        if (!product || !product.is_active) return;
        addItem({
            id: product.id,
            name: product.name,
            price: Number(product.price_per_unit) || 0,
            image_url: product.image_url || undefined,
            unit: product.unit,
            is_active: product.is_active,
        }, quantity);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading product details...</p>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-3xl">
                        🥛
                    </div>
                    <h2 className="text-2xl font-bold">Product Not Found</h2>
                    <p className="text-muted-foreground text-sm">
                        The requested product does not exist, has been removed, or is currently unavailable.
                    </p>
                    <div className="flex flex-col gap-2 pt-2">
                        {error && (
                            <Button variant="outline" onClick={() => refetch()} className="w-full">
                                Try Again
                            </Button>
                        )}
                        <Button onClick={() => navigate("/products")} className="w-full">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Product Catalog
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    const price = Number(product.price_per_unit) || 0;
    const subscriptionPrice = Math.round(price * 0.9 * 100) / 100; // 10% discount for daily subscription
    const savings = Math.max(0, price - subscriptionPrice);

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-8">
            <div className="container mx-auto px-4 max-w-5xl">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/products")}
                            className="rounded-full"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer" onClick={() => navigate("/products")}>
                            Products
                        </span>
                        <span className="text-sm text-muted-foreground">/</span>
                        <span className="text-sm font-medium">{product.name}</span>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCart(true)}
                        className="relative gap-1.5"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        <span className="hidden sm:inline">Cart</span>
                        {itemCount > 0 && (
                            <span className="px-1.5 py-0.2 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                                {itemCount}
                            </span>
                        )}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    {/* Product Image */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="rounded-2xl overflow-hidden border bg-card shadow-sm"
                    >
                        <div className="aspect-square relative bg-muted flex items-center justify-center">
                            {product.image_url && !imgError ? (
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <span className="text-6xl">🥛</span>
                                    <span className="text-xs font-medium">Delight Dairy Fresh</span>
                                </div>
                            )}
                            <Badge className="absolute top-4 left-4 bg-primary/90 text-white">
                                {product.category}
                            </Badge>
                            {product.is_active ? (
                                <Badge className="absolute top-4 right-4 bg-green-500 text-white">
                                    Available
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="absolute top-4 right-4 bg-red-600 text-white">
                                    Currently unavailable
                                </Badge>
                            )}
                        </div>
                    </motion.div>

                    {/* Product Details & Actions */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline">{product.category}</Badge>
                                <div className="flex items-center text-sm text-yellow-500 font-medium">
                                    <Star className="w-4 h-4 fill-yellow-400 mr-1" />
                                    4.9 (Farm Fresh)
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
                            <p className="text-muted-foreground mt-2 leading-relaxed">
                                {product.description || "100% pure, farm-fresh milk delivered directly to your doorstep every morning."}
                            </p>
                        </div>

                        {/* Pricing */}
                        <div className="bg-muted/40 p-4 rounded-xl space-y-2 border">
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold text-primary">₹{price.toFixed(2)}</span>
                                <span className="text-sm text-muted-foreground">/ {product.unit}</span>
                            </div>
                            {savings > 0 && (
                                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded-lg border border-green-200">
                                    <Check className="w-4 h-4" />
                                    <span>
                                        Daily subscription price: <strong>₹{subscriptionPrice.toFixed(2)}</strong> (Save ₹{savings.toFixed(2)} per {product.unit})
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Value Props */}
                        <div className="grid grid-cols-3 gap-3 py-2 text-center text-xs text-muted-foreground border-y">
                            <div className="p-2 space-y-1">
                                <Truck className="w-4 h-4 mx-auto text-primary" />
                                <p className="font-medium text-foreground">Morning Delivery</p>
                                <p>5:00 AM - 8:00 AM</p>
                            </div>
                            <div className="p-2 space-y-1">
                                <ShieldCheck className="w-4 h-4 mx-auto text-primary" />
                                <p className="font-medium text-foreground">100% Pure</p>
                                <p>No Adulteration</p>
                            </div>
                            <div className="p-2 space-y-1">
                                <Clock className="w-4 h-4 mx-auto text-primary" />
                                <p className="font-medium text-foreground">Easy Pause</p>
                                <p>Skip anytime</p>
                            </div>
                        </div>

                        {/* Quantity Selector */}
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">Quantity:</span>
                            <div className="flex items-center border rounded-lg bg-card">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-r-none"
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                >
                                    <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-10 text-center font-semibold text-sm">
                                    {quantity}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-l-none"
                                    onClick={() => setQuantity((q) => q + 1)}
                                >
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                            <span className="text-sm text-muted-foreground">
                                Total: ₹{(price * quantity).toFixed(2)}
                            </span>
                        </div>

                        {/* Inactive Product Banner */}
                        {!product.is_active && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-800 dark:text-red-300 text-sm">
                                <strong>Currently unavailable:</strong> This product is out of stock or out of season and cannot be added to cart.
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <Button
                                className="flex-1 h-12 text-base"
                                onClick={handleAddToCart}
                                disabled={!product.is_active}
                            >
                                <ShoppingCart className="w-5 h-5 mr-2" />
                                {product.is_active ? "Add to Cart" : "Currently unavailable"}
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 h-12 text-base border-primary/40 text-primary hover:bg-primary/10"
                                onClick={() => setSubscribeDialogOpen(true)}
                                disabled={!product.is_active}
                            >
                                <Calendar className="w-5 h-5 mr-2" />
                                Subscribe Daily
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className={`h-12 w-12 shrink-0 ${isFavorite(product.id) ? 'text-red-500 border-red-300 bg-red-50 dark:bg-red-950/20' : 'text-muted-foreground'}`}
                                onClick={() => toggleFavorite(product.id, product.name)}
                                title={isFavorite(product.id) ? "Remove from favorites" : "Add to favorites"}
                            >
                                <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </div>

            <AddMilkDialog
                open={subscribeDialogOpen}
                onOpenChange={setSubscribeDialogOpen}
            />

            <CartSheet
                open={showCart}
                onOpenChange={setShowCart}
            />
        </div>
    );
};

export default ProductDetail;
