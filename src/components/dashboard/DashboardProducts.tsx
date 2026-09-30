import { motion } from 'framer-motion';
import { ShoppingCart, Star, TrendingDown, Package, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useProducts } from '@/hooks/useProducts';
import { useMemo } from 'react';
import { useCart } from "@/contexts/CartContext";

const DashboardProducts = () => {
    const navigate = useNavigate();
    const { data: dbProducts, isLoading } = useProducts();

    // Get featured products or fallback to first 4 products
    const featuredProducts = useMemo(() => {
        if (!dbProducts || dbProducts.length === 0) {
            // Fallback static products
            return [
                {
                    id: 'prod_buffalo_milk',
                    product_name: 'Buffalo Milk',
                    description: 'Fresh farm buffalo milk, rich in protein',
                    category: 'Milk',
                    unit: 'L',
                    image_url: '/images/buffalo-milk.jpg',
                    price_per_unit: 100,
                    subscription_price: 90,
                    is_featured: true,
                    subscription_enabled: true,
                },
                {
                    id: 'prod_cow_milk',
                    product_name: 'Cow Milk',
                    description: 'Pure and fresh cow milk, ideal for daily use',
                    category: 'Milk',
                    unit: 'L',
                    image_url: '/images/cow-milk.jpg',
                    price_per_unit: 70,
                    subscription_price: 60,
                    is_featured: true,
                    subscription_enabled: true,
                },
                {
                    id: 'prod_curd',
                    product_name: 'Fresh Curd',
                    description: 'Creamy homemade-style curd',
                    category: 'Dairy',
                    unit: 'kg',
                    image_url: '/images/curd.jpg',
                    price_per_unit: 150,
                    subscription_price: 150,
                    is_featured: true,
                    subscription_enabled: true,
                },
                {
                    id: 'prod_paneer',
                    product_name: 'Fresh Paneer',
                    description: 'Soft and fresh paneer made daily',
                    category: 'Dairy',
                    unit: 'kg',
                    image_url: '/images/paneer.jpg',
                    price_per_unit: 350,
                    subscription_price: 320,
                    is_featured: false,
                    subscription_enabled: true,
                },
            ];
        }

        // Get featured products from database, or first 4 if no featured
        const featured = dbProducts.filter((p: any) => p.is_featured);
        if (featured.length > 0) {
            return featured.slice(0, 4);
        }
        return dbProducts.slice(0, 4);
    }, [dbProducts]);

    const { addItem } = useCart();

    const handleAddToCart = (product: any) => {
        addItem({
            id: product.id,
            name: product.product_name,
            price: product.price_per_unit || 0,
            image_url: product.image_url,
            unit: product.unit
        });
        toast.success(`Added ${product.product_name} to cart!`);
    };

    const handleSubscribe = (productName: string) => {
        toast.success(`Subscribed to ${productName}!`, {
            description: 'You will receive this product daily',
        });
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
                        <Card key={i} className="h-[500px] animate-pulse">
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
                ) : (
                    featuredProducts.map((product: any, index) => {
                        const regularPrice = product.price_per_unit || 0;
                        const subscriptionPrice = product.subscription_price || product.price_per_unit || 0;
                        const hasSavings = regularPrice !== subscriptionPrice;
                        const savings = regularPrice - subscriptionPrice;
                        const savingsPercentage = hasSavings
                            ? ((savings / regularPrice) * 100).toFixed(1)
                            : 0;

                        return (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
                                    {/* Image */}
                                    <div className="relative overflow-hidden aspect-[4/3]">
                                        <img
                                            src={product.image_url || '/images/buffalo-milk.jpg'}
                                            alt={product.product_name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        {product.is_featured && (
                                            <Badge className="absolute top-2 right-2 bg-yellow-500">
                                                ⭐ Featured
                                            </Badge>
                                        )}
                                        {hasSavings && (
                                            <Badge className="absolute top-2 left-2 bg-green-600">
                                                Save {savingsPercentage}%
                                            </Badge>
                                        )}
                                    </div>

                                    <CardHeader className="flex-grow pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-base group-hover:text-primary transition-colors">
                                                {product.product_name}
                                            </CardTitle>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                <span className="text-xs font-semibold">4.5</span>
                                            </div>
                                        </div>

                                        <CardDescription className="text-xs line-clamp-2">
                                            {product.description || 'Fresh dairy product'}
                                        </CardDescription>

                                        {/* Pricing */}
                                        <div className="mt-2 space-y-1">
                                            {hasSavings ? (
                                                <>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-lg font-bold text-muted-foreground line-through">
                                                            ₹{regularPrice}
                                                        </span>
                                                        <span className="text-xl font-bold text-green-600">
                                                            ₹{subscriptionPrice}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-green-600">
                                                        <TrendingDown className="w-3 h-3" />
                                                        Save ₹{savings} with subscription
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-xl font-bold text-primary">
                                                    ₹{regularPrice}
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                        per {product.unit}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardFooter className="flex gap-2 pt-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleAddToCart(product)}
                                            className="flex-1"
                                        >
                                            <ShoppingCart className="w-3 h-3 mr-1" />
                                            Add
                                        </Button>
                                        {product.subscription_enabled !== false ? (
                                            <Button
                                                size="sm"
                                                onClick={() => handleSubscribe(product.product_name)}
                                                className="flex-1 bg-gradient-to-r from-primary to-purple-600"
                                            >
                                                Subscribe
                                            </Button>
                                        ) : (
                                            <Button variant="secondary" size="sm" disabled className="flex-1">
                                                <Package className="w-3 h-3 mr-1" />
                                                Add-on
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* View All Products CTA */}
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
        </div>
    );
};

export default DashboardProducts;
