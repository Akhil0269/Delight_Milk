import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Trash2, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCart } from "@/contexts/CartContext";
import { useProducts, Product } from "@/hooks/useProducts";
import { useFavorites } from "@/hooks/useFavorites";
import DashboardNavbar from '@/components/dashboard/DashboardNavbar';

const Favorites = () => {
    const navigate = useNavigate();
    const { data: allProducts, isLoading, error } = useProducts();
    const { favoriteIds, removeFavorite } = useFavorites();
    const { addItem } = useCart();

    const handleRemove = (id: string, name: string) => {
        removeFavorite(id, name);
    };

    const handleAddToCart = (product: Product) => {
        if (product.is_active === false) {
            toast.error(`${product.name} is currently unavailable.`);
            return;
        }
        addItem({
            id: product.id,
            name: product.name,
            price: Number(product.price_per_unit) || 0,
            image_url: product.image_url || undefined,
            unit: product.unit,
            is_active: product.is_active,
        });
    };

    // Filter products that match user's favorites
    const favoriteProducts = (allProducts || []).filter((p) => favoriteIds.includes(p.id));

    return (
        <div className="min-h-screen bg-muted/30">
            <DashboardNavbar />

            {/* Header */}
            <div className="bg-card border-b sticky top-16 md:top-20 z-30">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Heart className="w-5 h-5 fill-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">My Favorites</h1>
                                <p className="text-sm text-muted-foreground">
                                    {favoriteProducts.length} saved {favoriteProducts.length === 1 ? 'item' : 'items'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p>Loading your saved products...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-16 bg-card rounded-2xl border p-8 max-w-lg mx-auto">
                        <p className="text-destructive font-medium mb-2">Unable to load favorites</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            There was an error communicating with the product catalog.
                        </p>
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                    </div>
                ) : favoriteProducts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 bg-card rounded-2xl border max-w-xl mx-auto p-8 shadow-sm"
                    >
                        <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                            <Heart className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">No favorites yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                            Browse our farm-fresh dairy catalog and save your daily essentials here for quick 1-click ordering.
                        </p>
                        <Link to="/products">
                            <Button size="lg" className="gap-2">
                                <Sparkles className="w-4 h-4" />
                                Browse Products
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {favoriteProducts.map((product, index) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
                                    {/* Image */}
                                    <div className="relative overflow-hidden aspect-[4/3] bg-muted flex items-center justify-center">
                                        <Link to={`/products/${product.id}`} className="w-full h-full block">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                                        const sib = (e.currentTarget as HTMLElement).nextElementSibling;
                                                        if (sib) (sib as HTMLElement).style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className="w-full h-full flex items-center justify-center text-4xl"
                                                style={{ display: product.image_url ? 'none' : 'flex' }}
                                            >
                                                🥛
                                            </div>
                                        </Link>
                                        <button
                                            onClick={() => handleRemove(product.id, product.name)}
                                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 hover:bg-background flex items-center justify-center transition-colors shadow-md text-red-500"
                                            title="Remove from favorites"
                                        >
                                            <Heart className="w-4 h-4 fill-red-500" />
                                        </button>
                                        <Badge className="absolute top-3 left-3 bg-primary text-xs">
                                            {product.category}
                                        </Badge>
                                        {product.is_active === false && (
                                            <Badge variant="destructive" className="absolute bottom-3 left-3 bg-red-600 text-white font-medium text-xs">
                                                Currently unavailable
                                            </Badge>
                                        )}
                                    </div>

                                    <CardHeader className="flex-grow p-4 pb-2">
                                        <Link to={`/products/${product.id}`} className="hover:underline">
                                            <CardTitle className="text-lg font-bold">{product.name}</CardTitle>
                                        </Link>
                                        {product.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                {product.description}
                                            </p>
                                        )}

                                        <div className="mt-3 flex items-baseline gap-2">
                                            <span className="text-xl font-bold text-primary">
                                                ₹{product.price_per_unit}
                                            </span>
                                            <span className="text-xs text-muted-foreground">per {product.unit}</span>
                                        </div>
                                    </CardHeader>

                                    <CardFooter className="flex gap-2 p-4 pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemove(product.id, product.name)}
                                            className="flex-1 text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Remove
                                        </Button>
                                        {product.is_active === false ? (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                disabled
                                                className="flex-1 text-muted-foreground"
                                            >
                                                Currently unavailable
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                onClick={() => handleAddToCart(product)}
                                                className="flex-1"
                                            >
                                                <ShoppingCart className="w-4 h-4 mr-1" />
                                                Add to Cart
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Favorites;
