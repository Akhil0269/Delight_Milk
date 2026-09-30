import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, ShoppingCart, Star, Plus, Minus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// Sample products (replace with Supabase query in production)
const SAMPLE_PRODUCTS = [
    {
        id: '1',
        name: 'Buffalo Milk',
        description: 'Fresh farm buffalo milk, rich in protein and calcium',
        category: 'Milk',
        price_per_unit: 100,
        unit: 'L',
        image_url: '/images/buffalo-milk.jpg',
        rating: 4.5,
        review_count: 234,
        stock_status: 'in_stock',
        is_featured: true,
    },
    {
        id: '2',
        name: 'Cow Milk',
        description: 'Pure and fresh cow milk, ideal for daily consumption',
        category: 'Milk',
        price_per_unit: 70,
        unit: 'L',
        image_url: '/images/cow-milk.jpg',
        rating: 4.7,
        review_count: 456,
        stock_status: 'in_stock',
        is_featured: true,
    },
    {
        id: '3',
        name: 'Organic Milk',
        description: 'Pure organic milk from grass-fed cows, naturally healthy',
        category: 'Milk',
        price_per_unit: 60,
        unit: 'L',
        image_url: '/images/toned-milk.jpg',
        rating: 4.3,
        review_count: 123,
        stock_status: 'in_stock',
        is_featured: false,
    },
    {
        id: '4',
        name: 'Fresh Curd',
        description: 'Creamy homemade-style curd, rich in probiotics',
        category: 'Curd',
        price_per_unit: 150,
        unit: 'kg',
        image_url: '/images/curd.jpg',
        rating: 4.6,
        review_count: 189,
        stock_status: 'in_stock',
        is_featured: true,
    },
    {
        id: '5',
        name: 'Pure Desi Ghee',
        description: 'Traditional hand-churned ghee made from pure butter',
        category: 'Ghee',
        price_per_unit: 999,
        unit: 'kg',
        image_url: '/images/ghee.jpg',
        rating: 4.9,
        review_count: 567,
        stock_status: 'in_stock',
        is_featured: true,
    },
    {
        id: '6',
        name: 'Fresh Paneer',
        description: 'Soft and fresh paneer made daily',
        category: 'Paneer',
        price_per_unit: 350,
        unit: 'kg',
        image_url: '/images/paneer.jpg',
        rating: 4.4,
        review_count: 234,
        stock_status: 'in_stock',
        is_featured: false,
    },
    {
        id: '7',
        name: 'Masala Buttermilk',
        description: 'Refreshing spiced buttermilk, perfect for summer',
        category: 'Buttermilk',
        price_per_unit: 30,
        unit: 'L',
        image_url: '/images/buttermilk.jpg',
        rating: 4.2,
        review_count: 89,
        stock_status: 'in_stock',
        is_featured: false,
    },
    {
        id: '8',
        name: 'Sweet Lassi',
        description: 'Traditional sweet lassi made with fresh curd',
        category: 'Lassi',
        price_per_unit: 40,
        unit: 'L',
        image_url: '/images/lassi.jpg',
        rating: 4.5,
        review_count: 156,
        stock_status: 'in_stock',
        is_featured: false,
    },
];

const CATEGORIES = ['All', 'Milk', 'Curd', 'Ghee', 'Paneer', 'Buttermilk', 'Lassi'];

interface ProductQuantity {
    [key: string]: number;
}

const ProductCatalog = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [quantities, setQuantities] = useState<ProductQuantity>({});
    const [cart, setCart] = useState<Set<string>>(new Set());

    // Filtered products
    const filteredProducts = useMemo(() => {
        return SAMPLE_PRODUCTS.filter((product) => {
            const matchesSearch =
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.category.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory =
                selectedCategory === 'All' || product.category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory]);

    // Handle quantity change
    const updateQuantity = (productId: string, delta: number) => {
        setQuantities((prev) => {
            const current = prev[productId] || 1;
            const newValue = Math.max(1, current + delta);
            return { ...prev, [productId]: newValue };
        });
    };

    // Add to cart
    const addToCart = (productId: string, productName: string) => {
        setCart((prev) => new Set(prev).add(productId));
        toast.success(`Added ${productName} to cart!`);
    };

    // Subscribe
    const subscribeToProduct = (productId: string, productName: string) => {
        toast.success(`Subscribed to ${productName}!`, {
            description: 'You will receive this product daily',
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
            {/* Header */}
            <div className="bg-card border-b sticky top-0 z-10 backdrop-blur-lg bg-card/80">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                                Product Catalog
                            </h1>
                            <p className="text-muted-foreground mt-1">
                                Fresh dairy products delivered to your doorstep
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
                </div>
            </div>

            {/* Products Grid */}
            <div className="container mx-auto px-4 py-8">
                {filteredProducts.length === 0 ? (
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
                                const inCart = cart.has(product.id);

                                return (
                                    <motion.div
                                        key={product.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
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
                                                <div className="flex items-baseline gap-2 mt-2">
                                                    <span className="text-2xl font-bold text-primary">
                                                        ₹{product.price_per_unit}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">
                                                        per {product.unit}
                                                    </span>
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
                                                            onClick={() => updateQuantity(product.id, -1)}
                                                        >
                                                            <Minus className="w-3 h-3" />
                                                        </Button>
                                                        <span className="w-8 text-center font-semibold">{quantity}</span>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => updateQuantity(product.id, 1)}
                                                        >
                                                            <Plus className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="grid grid-cols-2 gap-2 w-full">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => addToCart(product.id, product.name)}
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
                                                    <Button
                                                        onClick={() => subscribeToProduct(product.id, product.name)}
                                                        className="bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                                                    >
                                                        Subscribe
                                                    </Button>
                                                </div>

                                                {/* Subscription Savings */}
                                                <div className="text-xs text-center text-green-600 font-medium">
                                                    💰 Save 10% with subscription!
                                                </div>
                                            </CardFooter>
                                        </Card>
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
                        Showing {filteredProducts.length} of {SAMPLE_PRODUCTS.length} products
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default ProductCatalog;
