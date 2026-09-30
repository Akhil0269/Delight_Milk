import { useEffect, useState } from 'react';
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

/**
 * Hook to get all product prices
 */
export function useProductPrices() {
    const [prices, setPrices] = useState<ProductPrice[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initialize pricing if needed
        initializeDevPricing();

        // Load prices
        const loadedPrices = getDevPrices();
        setPrices(loadedPrices);
        setIsLoading(false);

        // Listen for storage changes
        const handleStorageChange = () => {
            const updatedPrices = getDevPrices();
            setPrices(updatedPrices);
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    return { prices, isLoading };
}

/**
 * Hook to get price history (audit log)
 */
export function usePriceHistory() {
    const [history, setHistory] = useState<PriceHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadedHistory = getDevPriceHistory();
        setHistory(loadedHistory);
        setIsLoading(false);

        const handleStorageChange = () => {
            const updatedHistory = getDevPriceHistory();
            setHistory(updatedHistory);
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

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
