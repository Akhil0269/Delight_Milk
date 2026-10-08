import { motion } from 'framer-motion';
import { ShoppingCart, Star, TrendingDown, Package, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useProducts, Product } from '@/hooks/useProducts';
import { useMemo, useState } from 'react';
import { useCart } from "@/contexts/CartContext";

const DashboardProductCard = ({
    product,
    index,
    onAddToCart,
    onSubscribe,
    onViewDetail
}: {
    product: Product;
    index: number;
    onAddToCart: (p: Product) => void;
    onSubscribe: (name: string) => void;
    onViewDetail: (id: string) => void;
}) => {
    const [imgError, setImgError] = useState(false);
    const productName = product.name || "Dairy Product";
    const regularPrice = Number(product.price_per_unit) || 0;
    const subscriptionPrice = product.subscription_price || (regularPrice > 0 ? Math.round(regularPrice * 0.9 * 100) / 100 : regularPrice);
    const hasSavings = regularPrice > subscriptionPrice;
    const savings = regularPrice - subscriptionPrice;
    const savingsPercentage = hasSavings && regularPrice > 0
        ? ((savings / regularPrice) * 100).toFixed(0)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <Card
                className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full flex flex-col cursor-pointer"
                onClick={() => onViewDetail(product.id)}
            >
                {/* Image */}
                <div className="relative overflow-hidden aspect-[4/3] bg-muted flex items-center justify-center">
                    {product.image_url && !imgError ? (
                        <img
                            src={product.image_url}
                            alt={productName}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="text-4xl">🥛</div>
                    )}
                    {product.is_featured && (
                        <Badge className="absolute top-2 right-2 bg-yellow-500">
                            ⭐ Featured
                        </Badge>
                    )}
                    {product.is_active === false ? (
                        <Badge variant="destructive" className="absolute top-2 left-2 bg-red-600 text-white text-[10px]">
                            Currently unavailable
                        </Badge>
                    ) : hasSavings ? (
                        <Badge className="absolute top-2 left-2 bg-green-600">
                            Save {savingsPercentage}%
                        </Badge>
                    ) : null}
                </div>

                <CardHeader className="flex-grow pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base group-hover:text-primary transition-colors">
                            {productName}
                        </CardTitle>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-semibold">{product.rating ?? 4.8}</span>
                        </div>
                    </div>

                    <CardDescription className="text-xs line-clamp-2">
                        {product.description || 'Fresh farm dairy product'}
                    </CardDescription>

                    {/* Pricing */}
                    <div className="mt-2 space-y-1">
                        {hasSavings ? (
                            <>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-bold text-muted-foreground line-through">
                                        ₹{regularPrice.toFixed(2)}
                                    </span>
                                    <span className="text-xl font-bold text-green-600">
                                        ₹{subscriptionPrice.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                    <TrendingDown className="w-3 h-3" />
                                    Save ₹{savings.toFixed(2)} with subscription
                                </div>
                            </>
                        ) : (
                            <div className="text-xl font-bold text-primary">
                                ₹{regularPrice.toFixed(2)}
                                <span className="text-xs text-muted-foreground ml-1">
                                    per {product.unit}
                                </span>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardFooter className="flex gap-2 pt-0" onClick={(e) => e.stopPropagation()}>
                    {product.is_active === false ? (
                        <Button variant="secondary" size="sm" disabled className="w-full text-muted-foreground">
                            Currently unavailable
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAddToCart(product)}
                                className="flex-1"
                            >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                Add
                            </Button>
                            {product.subscription_enabled !== false ? (
                                <Button
                                    size="sm"
                                    onClick={() => onSubscribe(productName)}
                                    className="flex-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                                >
                                    Subscribe
                                </Button>
                            ) : (
                                <Button variant="secondary" size="sm" disabled className="flex-1">
                                    <Package className="w-3 h-3 mr-1" />
                                    Add-on
                                </Button>
                            )}
                        </>
                    )}
                </CardFooter>
            </Card>
        </motion.div>
    );
};

const DashboardProducts = () => {
    const navigate = useNavigate();
    const { data: dbProducts, isLoading } = useProducts();

    // Get featured products or top 4 active products from Supabase
    const featuredProducts = useMemo(() => {
        if (!dbProducts || dbProducts.length === 0) {
            return [];
        }

        const featured = dbProducts.filter((p) => p.is_featured);
        if (featured.length > 0) {
            return featured.slice(0, 4);
        }
        return dbProducts.slice(0, 4);
    }, [dbProducts]);

    const { addItem } = useCart();

    const handleAddToCart = (product: Product) => {
        const productName = product.name || "Product";
        if (product.is_active === false) {
            toast.error(`${productName} is currently unavailable.`);
            return;
        }
        addItem({
            id: product.id,
            name: productName,
            price: Number(product.price_per_unit) || 0,
            image_url: product.image_url || undefined,
            unit: product.unit,
            is_active: product.is_active,
        });
    };

    const handleSubscribe = (productName: string) => {
        toast.success(`Subscribed to ${productName}!`, {
            description: 'You will receive this product daily',
        });
    };

    const handleViewDetail = (productId: string) => {
        navigate(`/products/${productId}`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Featured Products</h2>
                    <p className="text-muted-foreground mt-1">
                        Fresh dairy products delivered daily
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => navigate('/products')}
                    className="gap-2"
                >
                    View All
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {isLoading ? (
                    // Loading skeleton
                    Array.from({ length: 4 }).map((_, i) => (
                        <Card key={i} className="h-[420px] animate-pulse">
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
                    ))
                ) : featuredProducts.length > 0 ? (
                    featuredProducts.map((product, index) => (
                        <DashboardProductCard
                            key={product.id}
                            product={product}
                            index={index}
                            onAddToCart={handleAddToCart}
                            onSubscribe={handleSubscribe}
                            onViewDetail={handleViewDetail}
                        />
                    ))
                ) : (
                    <div className="col-span-full py-8 text-center bg-muted/20 rounded-xl border border-dashed p-6">
                        <p className="text-muted-foreground">No featured products currently available.</p>
                        <Button
                            variant="link"
                            onClick={() => navigate('/products')}
                            className="mt-2 text-primary"
                        >
                            Browse all products
                        </Button>
                    </div>
                )}
            </div>

            {/* View All Products CTA */}
            {featuredProducts.length > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center"
                >
                    <Button
                        onClick={() => navigate('/products')}
                        size="lg"
                        className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                    >
                        Browse All Products
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </motion.div>
            )}
        </div>
    );
};

export default DashboardProducts;
