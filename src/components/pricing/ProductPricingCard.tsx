import { motion } from 'framer-motion';
import { Tag, TrendingDown, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProductPrices, useSubscriptionSavings } from '@/hooks/usePricing';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductPricingCardProps {
    productId: string;
    productName: string;
    unit: string;
    hasActiveSubscription?: boolean;
    quantity?: number;
}

const ProductPricingCard = ({
    productId,
    productName,
    unit,
    hasActiveSubscription = false,
    quantity = 1
}: ProductPricingCardProps) => {
    const { prices, isLoading } = useProductPrices();
    const savings = useSubscriptionSavings(productId, quantity);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        );
    }

    // Get current prices
    const currentPriceEntry = prices
        .filter(p => p.product_id === productId && p.is_active)
        .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())[0];

    if (!currentPriceEntry) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{productName}</CardTitle>
                    <CardDescription>No pricing available</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const regularPrice = currentPriceEntry.regular_price;
    const subscriptionPrice = currentPriceEntry.subscription_price;
    const hasDiscount = subscriptionPrice < regularPrice;

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            {productName}
                            {hasActiveSubscription && hasDiscount && (
                                <Badge className="bg-green-500">Subscribed</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>Per {unit}</CardDescription>
                    </div>
                    <Tag className="w-5 h-5 text-primary" />
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Pricing Display */}
                <div className="space-y-3">
                    {/* Regular Price */}
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                            <p className="text-sm text-muted-foreground">Regular Price</p>
                            <p className={`text-2xl font-bold ${hasActiveSubscription && hasDiscount ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                ₹{regularPrice.toFixed(2)}
                            </p>
                        </div>
                        {!hasActiveSubscription && (
                            <Badge variant="outline">Current</Badge>
                        )}
                    </div>

                    {/* Subscription Price (if different) */}
                    {hasDiscount && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center justify-between p-3 rounded-lg ${hasActiveSubscription
                                    ? 'bg-green-50 border-2 border-green-200'
                                    : 'bg-blue-50 border-2 border-blue-200'
                                }`}
                        >
                            <div>
                                <p className={`text-sm font-medium ${hasActiveSubscription ? 'text-green-700' : 'text-blue-700'
                                    }`}>
                                    Subscription Price
                                </p>
                                <p className={`text-2xl font-bold ${hasActiveSubscription ? 'text-green-900' : 'text-blue-900'
                                    }`}>
                                    ₹{subscriptionPrice.toFixed(2)}
                                </p>
                            </div>
                            <div className="text-right">
                                {hasActiveSubscription ? (
                                    <Badge className="bg-green-600">Your Price</Badge>
                                ) : (
                                    <Badge className="bg-blue-600">Subscribe & Save</Badge>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* No Discount Message */}
                    {!hasDiscount && subscriptionPrice === regularPrice && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-700 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Same price for subscription and regular customers
                            </p>
                        </div>
                    )}
                </div>

                {/* Savings Display (if subscription available and user doesn't have it) */}
                {!hasActiveSubscription && hasDiscount && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-5 h-5 text-orange-700" />
                            <span className="font-semibold text-orange-900">Subscription Savings</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-900">
                            ₹{savings.savings.toFixed(2)}
                        </p>
                        <p className="text-sm text-orange-700">
                            Save {savings.savingsPercentage.toFixed(0)}% with subscription!
                        </p>
                    </motion.div>
                )}

                {/* Active Subscription Savings (if user has subscription) */}
                {hasActiveSubscription && hasDiscount && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-green-50 border border-green-200 rounded-lg p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="w-5 h-5 text-green-700" />
                            <span className="font-semibold text-green-900">You're Saving</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900">
                            ₹{savings.savings.toFixed(2)} per {unit}
                        </p>
                        <p className="text-sm text-green-700">
                            {savings.savingsPercentage.toFixed(0)}% discount applied!
                        </p>
                    </motion.div>
                )}

                {/* Effective Date */}
                <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Effective from: {new Date(currentPriceEntry.effective_from).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </p>
                </div>

                {/* Price Lock Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                        🔒 <strong>Price Lock Guarantee:</strong> This price is locked for all future deliveries scheduled at this rate. Price changes apply only to future dates.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

export default ProductPricingCard;
