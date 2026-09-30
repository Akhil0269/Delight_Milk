import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Filter, ShoppingCart, Plus, Minus,
    Star, Info, TrendingUp, TrendingDown, Award, CheckCircle2, Check, Package,
    Leaf, Droplets, Clock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductPrices, useSubscriptionSavings } from '@/hooks/usePricing';
import { getCurrentPrice } from '@/utils/pricing';
import { useProducts } from '@/hooks/useProducts';

// Product catalog with dual pricing support
const PRODUCT_CATALOG = [
    {
        id: 'prod_buffalo_milk',
        name: 'Buffalo Milk',
        description: 'Fresh farm buffalo milk, rich in protein and calcium. Perfect for tea, coffee, and cooking.',
        category: 'Milk',
        unit: 'L',
        image_url: '/images/buffalo-milk.jpg',
        rating: 4.5,
        review_count: 234,
        stock_status: 'in_stock',
        is_featured: true,
        subscription_enabled: true,
        addon_product: false,
    },
    {
        id: 'prod_cow_milk',
        name: 'Cow Milk',
        description: 'Pure and fresh cow milk, ideal for daily consumption. Light and nutritious.',
        category: 'Milk',
        unit: 'L',
        image_url: '/images/cow-milk.jpg',
        rating: 4.7,
        review_count: 456,
        stock_status: 'in_stock',
        is_featured: true,
        subscription_enabled: true,
        addon_product: false,
    },
    {
        id: 'prod_curd',
        name: 'Fresh Curd',
        description: 'Creamy homemade-style curd, rich in probiotics. Perfect for digestion.',
        category: 'Dairy',
        unit: 'kg',
        image_url: '/images/curd.jpg',
        rating: 4.6,
        review_count: 189,
        stock_status: 'in_stock',
        is_featured: true,
        subscription_enabled: true,
        addon_product: false,
    },
    {
        id: 'prod_ghee',
        name: 'Pure Desi Ghee',
        description: 'Traditional hand-churned ghee made from pure buffalo butter. Rich aroma and taste.',
        category: 'Dairy',
        unit: 'kg',
        image_url: '/images/ghee.jpg',
        rating: 4.9,
        review_count: 567,
        stock_status: 'in_stock',
        is_featured: true,
        subscription_enabled: false,
        addon_product: true,
    },
    {
        id: 'prod_paneer',
        name: 'Fresh Paneer',
        description: 'Soft and fresh paneer made daily from pure milk. Perfect for curries and snacks.',
        category: 'Dairy',
        unit: 'kg',
        image_url: '/images/paneer.jpg',
        rating: 4.4,
        review_count: 234,
        stock_status: 'in_stock',
        is_featured: false,
        subscription_enabled: true,
        addon_product: false,
    },
    {
        id: 'prod_butter',
        name: 'Pure Butter',
        description: 'Creamy fresh butter churned from pure cream. Rich and delicious for spreading.',
        category: 'Dairy',
        unit: 'kg',
        image_url: '/images/buttermilk.jpg',
        rating: 4.7,
        review_count: 312,
        stock_status: 'in_stock',
        is_featured: false,
        subscription_enabled: false,
        addon_product: true,
    },
    {
        id: 'prod_cheese',
        name: 'Cheese',
        description: 'Premium quality cheese. Perfect for sandwiches and cooking.',
        category: 'Dairy',
        unit: 'kg',
        image_url: '/images/lassi.jpg',
        rating: 4.6,
        review_count: 189,
        stock_status: 'in_stock',
        is_featured: false,
        subscription_enabled: false,
        addon_product: true,
    },
];

const CATEGORIES = ['All', 'Milk', 'Dairy'];

interface ProductQuantity {
    [key: string]: number;
}

interface ProductCardProps {
    product: typeof PRODUCT_CATALOG[0];
    quantity: number;
    inCart: boolean;
    regularPrice: number;
    subscriptionPrice: number;
    savings: number;
    savingsPercentage: number;
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
    onUpdateQuantity,
    onAddToCart,
    onSubscribe,
}: ProductCardProps) => {
    const hasSavings = savings > 0;

    return (
        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
            {/* Image */}
            <div className="relative overflow-hidden aspect-[4/3]">
                <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {product.is_featured && (
                    <Badge className="absolute top-3 right-3 bg-yellow-500">
                        ⭐ Featured
                    </Badge>
                )}
                {product.addon_product && (
                    <Badge className="absolute top-3 left-3 bg-purple-500">
                        <Package className="w-3 h-3 mr-1" />
                        Add-on
                    </Badge>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <CardHeader className="flex-grow">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {product.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">{product.rating}</span>
                    </div>
                </div>

                {/* Dual Pricing Display */}
                <div className="mt-3 space-y-2">
                    {/* Regular Price */}
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm text-muted-foreground">Regular:</span>
                        <span className={`text-xl font-bold ${hasSavings ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                            ₹{regularPrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">per {product.unit}</span>
                    </div>

                    {/* Subscription Price (if different) */}
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

                    {/* No Discount Message */}
                    {!hasSavings && product.addon_product && (
                        <div className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded">
                            Add-on product • No subscription discount
                        </div>
                    )}
                </div>

                <CardDescription className="mt-2 line-clamp-2">
                    {product.description}
                </CardDescription>

                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                        {product.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {product.review_count} reviews
                    </span>
                </div>
            </CardHeader>

            <CardFooter className="flex flex-col gap-3 pt-0">
                {/* Quantity Selector */}
                <div className="flex items-center justify-between w-full p-2 border rounded-lg">
                    <span className="text-sm font-medium">Quantity:</span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onUpdateQuantity(-1)}
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
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* Action Buttons */}
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
                    {product.subscription_enabled ? (
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

    // Fetch products from database
    const { data: dbProducts, isLoading: productsLoading, error: productsError } = useProducts();
    const { prices, isLoading: pricesLoading } = useProductPrices();

    // Use database products or fallback to static catalog
    const PRODUCT_CATALOG_TO_USE = useMemo(() => {
        if (dbProducts && dbProducts.length > 0) {
            return dbProducts.map((product: any) => ({
                id: product.id,
                name: product.product_name,
                description: product.description || 'Fresh dairy product',
                category: product.category || 'Dairy',
                unit: product.unit,
                image_url: product.image_url || '/images/buffalo-milk.jpg',
                rating: 4.5,
                review_count: 100,
                stock_status: product.is_available ? 'in_stock' : 'out_of_stock',
                is_featured: product.is_featured || false,
                subscription_enabled: product.subscription_enabled !== false,
                addon_product: product.addon_product || false,
            }));
        }
        return PRODUCT_CATALOG;
    }, [dbProducts]);

    // Get unique categories
    const CATEGORIES = useMemo(() => {
        const categories = ['All'];
        const uniqueCategories = new Set(PRODUCT_CATALOG_TO_USE.map(p => p.category));
        return [...categories, ...Array.from(uniqueCategories)];
    }, [PRODUCT_CATALOG_TO_USE]);

    // Filtered products
    const filteredProducts = useMemo(() => {
        const filtered = PRODUCT_CATALOG_TO_USE.filter((product) => {
            const matchesSearch =
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                product.category.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory =
                selectedCategory === 'All' || product.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
        return filtered;
    }, [searchQuery, selectedCategory, PRODUCT_CATALOG_TO_USE]);

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
    const addToCart = (product: any, quantity: number, price: number) => {
        addItem({
            id: product.id,
            name: product.name,
            price: price,
            image_url: product.image_url,
            unit: product.unit
        });
        toast.success(`Added ${quantity} ${product.name} to cart!`);
    };

    // Subscribe
    const subscribeToProduct = (productId: string, productName: string) => {
        toast.success(`Subscribed to ${productName}!`, {
            description: 'You will receive this product daily',
        });
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
                                Fresh dairy products with transparent dual pricing
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                            <Input
                                type="text"
                                placeholder="Search products..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4"
                            />
                        </div>
                    </div>

                    {/* Category Filters */}
                    <div className="mt-6 flex items-center gap-3 overflow-x-auto pb-2">
                        <Filter className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                        {CATEGORIES.map((category) => (
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
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            💡 <strong>Transparent Pricing:</strong> We show both regular and subscription prices upfront. Subscribe to save more on daily essentials!
                        </p>
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="container mx-auto px-4 py-8">
                {(productsLoading || pricesLoading) ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Card key={i} className="h-[600px] animate-pulse">
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
                ) : filteredProducts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-2xl font-semibold mb-2">No products found</h3>
                        <p className="text-muted-foreground">
                            Try adjusting your search or filter criteria
                        </p>
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

                                // Get pricing from the pricing system
                                const regularPrice = pricesLoading ? product.id === 'prod_buffalo_milk' ? 100 :
                                    product.id === 'prod_cow_milk' ? 70 :
                                        product.id === 'prod_curd' ? 150 :
                                            product.id === 'prod_ghee' ? 999 :
                                                product.id === 'prod_paneer' ? 350 :
                                                    product.id === 'prod_butter' ? 450 : 600
                                    : getCurrentPrice(product.id, false, prices);

                                const subscriptionPrice = pricesLoading ? regularPrice
                                    : getCurrentPrice(product.id, true, prices);

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
                {filteredProducts.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-8 text-center text-sm text-muted-foreground"
                    >
                        Showing {filteredProducts.length} of {PRODUCT_CATALOG.length} products
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ProductsEnhanced;
