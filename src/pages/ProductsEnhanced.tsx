import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, ShoppingCart, Plus, Minus,
    Star, TrendingDown, Package, Check, AlertCircle, ArrowLeft, Heart
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductPrices } from '@/hooks/usePricing';
import { getCurrentPrice } from '@/utils/pricing';
import { useProducts, Product } from '@/hooks/useProducts';
import { useFavorites } from '@/hooks/useFavorites';

interface ProductQuantity {
    [key: string]: number;
}

interface ProductCardProps {
    product: Product;
    quantity: number;
    inCart: boolean;
    regularPrice: number;
    subscriptionPrice: number;
    savings: number;
    savingsPercentage: number;
    isFav: boolean;
    onToggleFavorite: () => void;
    onUpdateQuantity: (delta: number) => void;
    onAddToCart: () => void;
    onSubscribe: () => void;
}

const ProductCard = ({
    product,
    quantity,
    inCart,
    regularPrice,
    subscriptionPrice,
    savings,
    savingsPercentage,
    isFav,
    onToggleFavorite,
    onUpdateQuantity,
    onAddToCart,
    onSubscribe,
}: ProductCardProps) => {
    const hasSavings = savings > 0;

    return (
        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col relative">
            {/* Favorite toggle button */}
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavorite();
                }}
                className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-background/90 hover:bg-background flex items-center justify-center transition-colors shadow-md text-red-500"
                title={isFav ? "Remove from favorites" : "Add to favorites"}
            >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
            </button>

            {/* Image with fallback */}
            <Link to={`/products/${product.id}`} className="relative overflow-hidden aspect-[4/3] block bg-muted">
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                            const sibling = (e.currentTarget as HTMLElement).nextElementSibling;
                            if (sibling) (sibling as HTMLElement).style.display = 'flex';
                        }}
                    />
                ) : null}
                <div
                    className="w-full h-full flex items-center justify-center bg-muted text-4xl"
                    style={{ display: product.image_url ? 'none' : 'flex' }}
                >
                    🥛
                </div>
                {product.is_featured && (
                    <Badge className="absolute top-3 left-3 bg-yellow-500">
                        ⭐ Featured
                    </Badge>
                )}
                {product.is_active === false ? (
                    <Badge variant="destructive" className="absolute bottom-3 left-3 bg-red-600 text-white font-medium text-xs">
                        Currently unavailable
                    </Badge>
                ) : product.addon_product ? (
                    <Badge className="absolute bottom-3 left-3 bg-purple-500">
                        <Package className="w-3 h-3 mr-1" />
                        Add-on
                    </Badge>
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <CardHeader className="flex-grow">
                <div className="flex items-start justify-between gap-2">
                    <Link to={`/products/${product.id}`} className="hover:underline">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {product.name}
                        </CardTitle>
                    </Link>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">{product.rating ?? 4.8}</span>
                    </div>
                </div>

                {/* Pricing Display */}
                <div className="mt-3 space-y-2">
                    {/* Regular Price */}
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm text-muted-foreground">Regular:</span>
                        <span className={`text-xl font-bold ${hasSavings ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                            ₹{regularPrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">per {product.unit}</span>
                    </div>

                    {/* Subscription Price (if savings exist) */}
                    {hasSavings && (
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm text-muted-foreground">With Subscription:</span>
                            <span className="text-2xl font-bold text-green-600">
                                ₹{subscriptionPrice.toFixed(2)}
                            </span>
                        </div>
                    )}

                    {/* Savings Badge */}
                    {hasSavings && (
                        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <TrendingDown className="w-4 h-4 text-green-600" />
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-green-700">
                                    Save ₹{savings.toFixed(2)} ({savingsPercentage.toFixed(1)}%)
                                </p>
                                <p className="text-xs text-green-600">with subscription</p>
                            </div>
                        </div>
                    )}

                    {!hasSavings && product.addon_product && (
                        <div className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded">
                            Add-on product • One-time purchase
                        </div>
                    )}
                </div>

                <CardDescription className="mt-2 line-clamp-2">
                    {product.description || "Farm fresh dairy product, 100% pure and natural."}
                </CardDescription>

                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs capitalize">
                        {product.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {product.review_count ?? 50}+ reviews
                    </span>
                </div>
            </CardHeader>

            <CardFooter className="flex flex-col gap-3 pt-0">
                {/* Quantity Selector */}
                <div className={`flex items-center justify-between w-full p-2 border rounded-lg ${product.is_active === false ? 'opacity-50 pointer-events-none' : ''}`}>
                    <span className="text-sm font-medium">Quantity:</span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onUpdateQuantity(-1)}
                            disabled={product.is_active === false}
                        >
                            <Minus className="w-3 h-3" />
                        </Button>
                        <motion.span
                            key={quantity}
                            initial={{ scale: 1.2 }}
                            animate={{ scale: 1 }}
                            className="w-8 text-center font-semibold"
                        >
                            {quantity}
                        </motion.span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onUpdateQuantity(1)}
                            disabled={product.is_active === false}
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* Action Buttons */}
                {product.is_active === false ? (
                    <Button variant="secondary" disabled className="w-full text-muted-foreground bg-muted font-medium">
                        Currently unavailable
                    </Button>
                ) : (
                    <div className="grid grid-cols-2 gap-2 w-full">
                        <Button
                            variant="outline"
                            onClick={onAddToCart}
                            className="flex items-center gap-2"
                            disabled={inCart}
                        >
                            {inCart ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Added
                                </>
                            ) : (
                                <>
                                    <ShoppingCart className="w-4 h-4" />
                                    Cart
                                </>
                            )}
                        </Button>
                        {product.subscription_enabled !== false ? (
                            <Button
                                onClick={onSubscribe}
                                className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                            >
                                Subscribe
                            </Button>
                        ) : (
                            <Button variant="secondary" disabled>
                                One-time only
                            </Button>
                        )}
                    </div>
                )}
            </CardFooter>
        </Card>
    );
};

const ProductsEnhanced = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Get URL parameters
    const highlightProductId = searchParams.get('highlight');
    const urlCategory = searchParams.get('category');

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(urlCategory || 'All');
    const [quantities, setQuantities] = useState<ProductQuantity>({});

    // Fetch canonical products from Supabase
    const { data: dbProducts = [], isLoading: productsLoading, error: productsError, refetch } = useProducts();
    const { prices, isLoading: pricesLoading } = useProductPrices();
    const { isFavorite, toggleFavorite } = useFavorites();

    // Update category when URL changes
    useEffect(() => {
        if (urlCategory) {
            setSelectedCategory(urlCategory);
        }
    }, [urlCategory]);

    // Scroll to highlighted product
    useEffect(() => {
        if (highlightProductId) {
            setTimeout(() => {
                const element = document.getElementById(`product-${highlightProductId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-4', 'ring-primary', 'ring-offset-4');
                    setTimeout(() => {
                        element.classList.remove('ring-4', 'ring-primary', 'ring-offset-4');
                    }, 3000);
                }
            }, 500);
        }
    }, [highlightProductId]);

    // Extract dynamic categories from active database products
    const categories = useMemo(() => {
        const uniqueCategories = new Set(
            dbProducts
                .map((p) => p.category)
                .filter(Boolean)
                .map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
        );
        return ['All', ...Array.from(uniqueCategories).sort()];
    }, [dbProducts]);

    // Filter products based on search and category
    const filteredProducts = useMemo(() => {
        const trimmedQuery = searchQuery.trim().toLowerCase();
        return dbProducts.filter((product) => {
            const matchesSearch =
                !trimmedQuery ||
                product.name.toLowerCase().includes(trimmedQuery) ||
                (product.description && product.description.toLowerCase().includes(trimmedQuery)) ||
                product.category.toLowerCase().includes(trimmedQuery);

            const productCat = product.category ? (product.category.charAt(0).toUpperCase() + product.category.slice(1).toLowerCase()) : '';
            const matchesCategory =
                selectedCategory === 'All' ||
                productCat === selectedCategory ||
                product.category.toLowerCase() === selectedCategory.toLowerCase();

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory, dbProducts]);

    // Handle quantity change
    const updateQuantity = (productId: string, delta: number) => {
        setQuantities((prev) => {
            const current = prev[productId] || 1;
            const newValue = Math.max(1, current + delta);
            return { ...prev, [productId]: newValue };
        });
    };

    const { addItem, items: cartItems } = useCart();

    // Check if item is in cart
    const isItemInCart = (productId: string) => {
        return cartItems.some(item => item.id === productId);
    };

    // Add to cart
    const addToCart = (product: Product, quantity: number, price: number) => {
        if (product.is_active === false) {
            toast.error(`${product.name} is currently unavailable.`);
            return;
        }
        addItem({
            id: product.id,
            name: product.name,
            price: price,
            image_url: product.image_url || undefined,
            unit: product.unit,
            is_active: product.is_active,
        }, quantity);
    };

    // Subscribe
    const subscribeToProduct = (productId: string, productName: string) => {
        navigate(`/products/${productId}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
            <DashboardNavbar />

            {/* Header */}
            <div className="bg-card border-b sticky top-16 md:top-20 z-30 backdrop-blur-lg bg-card/80">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                Product Catalog
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Fresh dairy products delivered daily from local farms
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <Input
                                type="text"
                                placeholder="Search products by name or category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4"
                            />
                        </div>
                    </div>

                    {/* Category Filters */}
                    <div className="mt-6 flex items-center gap-3 overflow-x-auto pb-2">
                        <Filter className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        {categories.map((category) => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedCategory(category)}
                                className="whitespace-nowrap"
                            >
                                {category}
                            </Button>
                        ))}
                    </div>

                    {/* Pricing Info Banner */}
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                            💡 <strong>Transparent Pricing:</strong> Pay farm-direct rates per unit. Subscribe to save on your daily morning deliveries!
                        </p>
                    </div>
                </div>
            </div>

            {/* Products Grid / States */}
            <div className="container mx-auto px-4 py-8">
                {productsLoading || pricesLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Card key={i} className="h-[480px] animate-pulse">
                                <div className="aspect-[4/3] bg-muted" />
                                <CardHeader>
                                    <div className="h-6 bg-muted rounded mb-2" />
                                    <div className="h-4 bg-muted rounded w-3/4" />
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-muted rounded" />
                                        <div className="h-4 bg-muted rounded w-5/6" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : productsError ? (
                    <Card className="p-12 text-center border-destructive/50 max-w-lg mx-auto">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">Unable to Load Products</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {productsError instanceof Error ? productsError.message : "Failed to load product catalog from the database."}
                        </p>
                        <Button onClick={() => refetch()}>Retry</Button>
                    </Card>
                ) : dbProducts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-2xl font-semibold mb-2">No Products Available</h3>
                        <p className="text-muted-foreground">
                            The product catalog is currently being updated. Please check back shortly.
                        </p>
                    </motion.div>
                ) : filteredProducts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-2xl font-semibold mb-2">No products found</h3>
                        <p className="text-muted-foreground mb-4">
                            {searchQuery ? `No products match "${searchQuery}".` : 'No products match the selected category.'}
                        </p>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedCategory('All');
                            }}
                        >
                            Clear Filters
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        layout
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredProducts.map((product, index) => {
                                const quantity = quantities[product.id] || 1;
                                const inCart = isItemInCart(product.id);

                                // Compute current prices safely
                                const regularPrice = (() => {
                                    const current = getCurrentPrice(product.id, false, prices);
                                    return current > 0 ? current : (Number(product.price_per_unit) || 0);
                                })();
                                const subscriptionPrice = (() => {
                                    const current = getCurrentPrice(product.id, true, prices);
                                    return current > 0 ? current : regularPrice;
                                })();

                                const savings = (regularPrice - subscriptionPrice) * quantity;
                                const savingsPercentage = regularPrice > 0 ? ((regularPrice - subscriptionPrice) / regularPrice) * 100 : 0;

                                return (
                                    <motion.div
                                        id={`product-${product.id}`}
                                        key={product.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <ProductCard
                                            product={product}
                                            quantity={quantity}
                                            inCart={inCart}
                                            regularPrice={regularPrice}
                                            subscriptionPrice={subscriptionPrice}
                                            savings={savings}
                                            savingsPercentage={savingsPercentage}
                                            isFav={isFavorite(product.id)}
                                            onToggleFavorite={() => toggleFavorite(product.id, product.name)}
                                            onUpdateQuantity={(delta) => updateQuantity(product.id, delta)}
                                            onAddToCart={() => addToCart(product, quantity, regularPrice)}
                                            onSubscribe={() => subscribeToProduct(product.id, product.name)}
                                        />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Results Count */}
                {!productsLoading && !productsError && filteredProducts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-8 text-center text-sm text-muted-foreground"
                    >
                        Showing {filteredProducts.length} of {dbProducts.length} products
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ProductsEnhanced;
