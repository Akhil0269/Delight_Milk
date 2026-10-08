import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
    ProductPrice,
    PriceHistory,
    getDevPrices,
    getDevPriceHistory,
    initializeDevPricing,
    getCurrentPrice,
    getPriceForDate,
    calculateSubscriptionSavings,
    getFuturePriceChanges,
} from '@/utils/pricing';

interface SupabaseProductPriceRow {
    id: string;
    product_id: string;
    products?: { name?: string } | null;
    regular_price: number | string;
    subscription_price: number | string;
    effective_from: string;
    effective_until?: string | null;
    is_active: boolean;
    created_by?: string | null;
    created_at: string;
    notes?: string | null;
}

interface SupabasePriceHistoryRow {
    id: string;
    product_id: string;
    product_name: string;
    old_regular_price?: number | string | null;
    new_regular_price: number | string;
    old_subscription_price?: number | string | null;
    new_subscription_price: number | string;
    effective_from: string;
    changed_by_name?: string | null;
    changed_at: string;
    reason?: string | null;
}

/**
 * Hook to get all product prices
 */
export function useProductPrices() {
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
    const [prices, setPrices] = useState<ProductPrice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isDevMode) {
            initializeDevPricing();
            const loadedPrices = getDevPrices();
            setPrices(loadedPrices);
            setIsLoading(false);

            const handleStorageChange = () => {
                const updatedPrices = getDevPrices();
                setPrices(updatedPrices);
            };

            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        } else {
            // Production Supabase query
            const fetchPrices = async () => {
                try {
                    setIsLoading(true);
                    const { data, error } = await supabase
                        .from('product_prices')
                        .select('*, products(name)')
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('Error fetching product prices from Supabase:', error);
                        setPrices(getDevPrices());
                    } else if (data && data.length > 0) {
                        const mapped: ProductPrice[] = (data as unknown as SupabaseProductPriceRow[]).map((item) => ({
                            id: item.id,
                            product_id: item.product_id,
                            product_name: item.products?.name || 'Dairy Product',
                            regular_price: Number(item.regular_price),
                            subscription_price: Number(item.subscription_price),
                            effective_from: item.effective_from,
                            effective_until: item.effective_until || undefined,
                            is_active: item.is_active,
                            created_by: item.created_by || 'Admin',
                            created_at: item.created_at,
                            notes: item.notes || undefined,
                        }));
                        setPrices(mapped);
                    } else {
                        // Fallback to default prices if table is empty
                        setPrices(getDevPrices());
                    }
                } catch (err) {
                    console.error('Failed to fetch prices:', err);
                    setPrices(getDevPrices());
                } finally {
                    setIsLoading(false);
                }
            };

            fetchPrices();

            // Refresh when price changes occur
            const handleRefresh = () => fetchPrices();
            window.addEventListener('pricing-updated', handleRefresh);
            return () => window.removeEventListener('pricing-updated', handleRefresh);
        }
    }, [isDevMode]);

    return { prices, isLoading };
}

/**
 * Hook to get price history (audit log)
 */
export function usePriceHistory() {
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
    const [history, setHistory] = useState<PriceHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isDevMode) {
            const loadedHistory = getDevPriceHistory();
            setHistory(loadedHistory);
            setIsLoading(false);

            const handleStorageChange = () => {
                const updatedHistory = getDevPriceHistory();
                setHistory(updatedHistory);
            };

            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        } else {
            const fetchHistory = async () => {
                try {
                    setIsLoading(true);
                    const { data, error } = await supabase
                        .from('price_history')
                        .select('*')
                        .order('changed_at', { ascending: false });

                    if (error) {
                        console.error('Error fetching price history:', error);
                        setHistory(getDevPriceHistory());
                    } else if (data) {
                        const mapped: PriceHistory[] = (data as unknown as SupabasePriceHistoryRow[]).map((item) => ({
                            id: item.id,
                            product_id: item.product_id,
                            product_name: item.product_name,
                            old_regular_price: item.old_regular_price ? Number(item.old_regular_price) : undefined,
                            new_regular_price: Number(item.new_regular_price),
                            old_subscription_price: item.old_subscription_price ? Number(item.old_subscription_price) : undefined,
                            new_subscription_price: Number(item.new_subscription_price),
                            effective_from: item.effective_from,
                            changed_by: item.changed_by_name || 'Admin',
                            changed_at: item.changed_at,
                            reason: item.reason || undefined,
                        }));
                        setHistory(mapped);
                    }
                } catch (err) {
                    console.error('Failed to fetch price history:', err);
                    setHistory(getDevPriceHistory());
                } finally {
                    setIsLoading(false);
                }
            };

            fetchHistory();

            const handleRefresh = () => fetchHistory();
            window.addEventListener('pricing-updated', handleRefresh);
            return () => window.removeEventListener('pricing-updated', handleRefresh);
        }
    }, [isDevMode]);

    return { history, isLoading };
}

/**
 * Hook to get current price for a product
 */
export function useCurrentPrice(
    productId: string,
    hasActiveSubscription: boolean = false
) {
    const { prices, isLoading } = useProductPrices();
    const [currentPrice, setCurrentPrice] = useState<number>(0);

    useEffect(() => {
        if (!isLoading && prices.length > 0) {
            const price = getCurrentPrice(productId, hasActiveSubscription, prices);
            setCurrentPrice(price);
        }
    }, [productId, hasActiveSubscription, prices, isLoading]);

    return { price: currentPrice, isLoading };
}

/**
 * Hook to get price for a specific date
 */
export function usePriceForDate(
    productId: string,
    date: string,
    hasActiveSubscription: boolean = false
) {
    const { prices, isLoading } = useProductPrices();
    const [price, setPrice] = useState<number>(0);

    useEffect(() => {
        if (!isLoading && prices.length > 0) {
            const calculatedPrice = getPriceForDate(productId, date, hasActiveSubscription, prices);
            setPrice(calculatedPrice);
        }
    }, [productId, date, hasActiveSubscription, prices, isLoading]);

    return { price, isLoading };
}

/**
 * Hook to calculate subscription savings
 */
export function useSubscriptionSavings(
    productId: string,
    quantity: number = 1
) {
    const { prices, isLoading } = useProductPrices();
    const [savings, setSavings] = useState({
        regularPrice: 0,
        subscriptionPrice: 0,
        savings: 0,
        savingsPercentage: 0,
    });

    useEffect(() => {
        if (!isLoading && prices.length > 0) {
            const calculated = calculateSubscriptionSavings(productId, quantity, prices);
            setSavings(calculated);
        }
    }, [productId, quantity, prices, isLoading]);

    return { ...savings, isLoading };
}

/**
 * Hook to get future price changes
 */
export function useFuturePriceChanges(productId: string) {
    const { prices, isLoading } = useProductPrices();
    const [futureChanges, setFutureChanges] = useState<ProductPrice[]>([]);

    useEffect(() => {
        if (!isLoading && prices.length > 0) {
            const changes = getFuturePriceChanges(productId, prices);
            setFutureChanges(changes);
        }
    }, [productId, prices, isLoading]);

    return { futureChanges, isLoading };
}
