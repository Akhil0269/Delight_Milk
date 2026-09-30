import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCart } from "@/contexts/CartContext";

const SAMPLE_FAVORITES = [
    {
        id: 'prod_buffalo_milk',
        name: 'Buffalo Milk',
        price: 100,
        subscriptionPrice: 90,
        unit: 'L',
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
        category: 'Milk',
    },
    {
        id: 'prod_paneer',
        name: 'Fresh Paneer',
        price: 350,
        subscriptionPrice: 320,
        unit: 'kg',
        image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400',
        category: 'Dairy',
    },
    {
        id: 'prod_ghee',
        name: 'Pure Desi Ghee',
        price: 999,
        subscriptionPrice: 999,
        unit: 'kg',
        image: 'https://images.unsplash.com/photo-1614967508369-0b3bae2f0c5e?w=400',
        category: 'Dairy',
    },
];

const Favorites = () => {
    const [favorites, setFavorites] = useState(SAMPLE_FAVORITES);

    const handleRemove = (id: string, name: string) => {
        setFavorites(favorites.filter((item) => item.id !== id));
        toast.success(`Removed ${name} from favorites`);
    };

    const { addItem } = useCart();

    const handleAddToCart = (product: any) => {
        addItem({
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image,
            unit: product.unit
        });
        toast.success(`Added ${product.name} to cart!`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
            {/* Header */}
            <div className="bg-card border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                            <Heart className="w-6 h-6 text-white fill-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">My Favorites</h1>
                            <p className="text-muted-foreground mt-1">
                                {favorites.length} saved {favorites.length === 1 ? 'product' : 'products'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                {favorites.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="w-24 h-24 rounded-full bg-muted mx-auto flex items-center justify-center mb-6">
                            <Heart className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-2xl font-semibold mb-2">No favorites yet</h3>
                        <p className="text-muted-foreground mb-6">
                            Start adding products to your favorites to see them here
                        </p>
                        <Button onClick={() => window.location.href = '/products'}>
                            Browse Products
                        </Button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {favorites.map((product, index) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group h-full flex flex-col">
                                    {/* Image */}
                                    <div className="relative overflow-hidden aspect-[4/3]">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <button
                                            onClick={() => handleRemove(product.id, product.name)}
                                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center transition-colors shadow-lg"
                                        >
                                            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                        </button>
                                        <Badge className="absolute top-3 left-3 bg-primary">
                                            {product.category}
                                        </Badge>
                                    </div>

                                    <CardHeader className="flex-grow">
                                        <CardTitle className="text-lg">{product.name}</CardTitle>

                                        {/* Pricing */}
                                        <div className="mt-2 space-y-1">
                                            {product.price !== product.subscriptionPrice ? (
                                                <>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-sm text-muted-foreground">Regular:</span>
                                                        <span className="text-lg font-bold text-muted-foreground line-through">
                                                            ₹{product.price}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-sm text-muted-foreground">Subscription:</span>
                                                        <span className="text-xl font-bold text-green-600">
                                                            ₹{product.subscriptionPrice}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">per {product.unit}</span>
                                                    </div>
                                                    <div className="text-xs text-green-600 font-medium">
                                                        Save ₹{product.price - product.subscriptionPrice} (
                                                        {(((product.price - product.subscriptionPrice) / product.price) * 100).toFixed(1)}
                                                        %)
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-2xl font-bold text-primary">
                                                        ₹{product.price}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">per {product.unit}</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardFooter className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleRemove(product.id, product.name)}
                                            className="flex-1"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Remove
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddToCart(product)}
                                            className="flex-1"
                                        >
                                            <ShoppingCart className="w-4 h-4 mr-1" />
                                            Add to Cart
                                        </Button>
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
