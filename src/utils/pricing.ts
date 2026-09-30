/**
 * SAFE PRICING SYSTEM
 * 
 * Core Principles:
 * 1. Prices have "Effective From Date"
 * 2. New prices apply ONLY to future calendar dates
 * 3. Past entries are NEVER modified
 * 4. Two price types: Regular & Subscription
 * 5. Full audit trail
 */

export interface ProductPrice {
    id: string;
    product_id: string;
    product_name: string;
    regular_price: number;
    subscription_price: number;
    effective_from: string; // ISO date string "YYYY-MM-DD"
    effective_until?: string; // Optional end date
    is_active: boolean;
    created_by: string; // Admin who created this
    created_at: string;
    notes?: string;
}

export interface PriceHistory {
    id: string;
    product_id: string;
    product_name: string;
    old_regular_price?: number;
    new_regular_price: number;
    old_subscription_price?: number;
    new_subscription_price: number;
    effective_from: string;
    changed_by: string; // Admin name
    changed_at: string;
    reason?: string;
}

export interface ProductWithPricing {
    id: string;
    name: string;
    category: string;
    unit: string;
    current_regular_price: number;
    current_subscription_price: number;
    future_prices?: ProductPrice[];
}

/**
 * Master Product Pricing
 * Configured as per requirements
 */
export const INITIAL_PRODUCT_PRICES: Omit<ProductPrice, 'id' | 'created_by' | 'created_at'>[] = [
    {
        product_id: 'prod_buffalo_milk',
        product_name: 'Buffalo Milk',
        regular_price: 100, // ₹100 per liter
        subscription_price: 90, // ₹90 per liter (10% discount)
        effective_from: '2026-01-01',
        is_active: true,
        notes: 'Initial pricing - Buffalo Milk',
    },
    {
        product_id: 'prod_cow_milk',
        product_name: 'Cow Milk',
        regular_price: 70, // ₹70 per liter
        subscription_price: 60, // ₹60 per liter (14% discount)
        effective_from: '2026-01-01',
        is_active: true,
        notes: 'Initial pricing - Cow Milk',
    },
    {
        product_id: 'prod_curd',
        product_name: 'Curd',
        regular_price: 150, // ₹150 per kg
        subscription_price: 150, // Same price (no subscription discount)
        effective_from: '2026-01-01',
        is_active: true,
        notes: 'Initial pricing - Curd (no subscription discount)',
    },
    {
        product_id: 'prod_ghee',
        product_name: 'Ghee',
        regular_price: 999, // ₹999 per kg
        subscription_price: 999, // Same price (no subscription discount)
        effective_from: '2026-01-01',
        is_active: true,
        notes: 'Initial pricing - Ghee (no subscription discount)',
    },
    {
        product_id: 'prod_paneer',
        product_name: 'Paneer',
        regular_price: 350, // ₹350 per kg
        subscription_price: 320, // ₹320 per kg (8.5% discount)
        effective_from: '2026-01-01',
        is_active: true,
        notes: 'Initial pricing - Paneer',
    },
    {
        product_id: 'prod_butter',
        product_name: 'Butter',
        regular_price: 450, // ₹450 per kg
        subscription_price: 450, // Same price (addon product, no subscription)
        effective_from: '2026-01-01',
        is_active: true,
        notes: 'Initial pricing - Butter (addon product)',
    },
    {
        product_id: 'prod_cheese',
        product_name: 'Cheese',
        regular_price: 600, // ₹600 per kg
        subscription_price: 600, // Same price (addon product, no subscription)
        effective_from: '2026-01-01',
        is_active: true,
        notes: 'Initial pricing - Cheese (addon product)',
    },
];

/**
 * Get the correct price for a specific date and subscription status
 * This is the CORE function for pricing logic
 */
export function getPriceForDate(
    productId: string,
    date: string, // "YYYY-MM-DD"
    hasActiveSubscription: boolean,
    allPrices: ProductPrice[]
): number {
    // Get all prices for this product
    const productPrices = allPrices
        .filter(p => p.product_id === productId && p.is_active)
        .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());

    // Find the price effective for this specific date
    const targetDate = new Date(date);

    for (const price of productPrices) {
        const effectiveFrom = new Date(price.effective_from);

        // Check if this price is effective for the target date
        if (targetDate >= effectiveFrom) {
            // If there's an effective_until date, check it
            if (price.effective_until) {
                const effectiveUntil = new Date(price.effective_until);
                if (targetDate <= effectiveUntil) {
                    return hasActiveSubscription ? price.subscription_price : price.regular_price;
                }
            } else {
                // No end date, this price is current
                return hasActiveSubscription ? price.subscription_price : price.regular_price;
            }
        }
    }

    // Fallback: Return first price if no matching date found
    const fallbackPrice = productPrices[0];
    return fallbackPrice
        ? (hasActiveSubscription ? fallbackPrice.subscription_price : fallbackPrice.regular_price)
        : 0;
}

/**
 * Get current price for a product (today's date)
 */
export function getCurrentPrice(
    productId: string,
    hasActiveSubscription: boolean,
    allPrices: ProductPrice[]
): number {
    const today = new Date().toISOString().split('T')[0];
    return getPriceForDate(productId, today, hasActiveSubscription, allPrices);
}

/**
 * Get future price changes for a product
 */
export function getFuturePriceChanges(
    productId: string,
    allPrices: ProductPrice[]
): ProductPrice[] {
    const today = new Date().toISOString().split('T')[0];

    return allPrices
        .filter(p =>
            p.product_id === productId &&
            p.is_active &&
            p.effective_from > today
        )
        .sort((a, b) => new Date(a.effective_from).getTime() - new Date(b.effective_from).getTime());
}

/**
 * Calculate savings for subscription users
 */
export function calculateSubscriptionSavings(
    productId: string,
    quantity: number,
    allPrices: ProductPrice[]
): {
    regularPrice: number;
    subscriptionPrice: number;
    savings: number;
    savingsPercentage: number;
} {
    const today = new Date().toISOString().split('T')[0];
    const regularPrice = getPriceForDate(productId, today, false, allPrices);
    const subscriptionPrice = getPriceForDate(productId, today, true, allPrices);

    const regularTotal = regularPrice * quantity;
    const subscriptionTotal = subscriptionPrice * quantity;
    const savings = regularTotal - subscriptionTotal;
    const savingsPercentage = regularPrice > 0 ? (savings / regularTotal) * 100 : 0;

    return {
        regularPrice,
        subscriptionPrice,
        savings,
        savingsPercentage,
    };
}

/**
 * Validate price change to ensure it's safe
 */
export function validatePriceChange(
    newPrice: Omit<ProductPrice, 'id' | 'created_by' | 'created_at'>,
    existingPrices: ProductPrice[]
): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
} {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: Effective date must be in the future
    const effectiveDate = new Date(newPrice.effective_from);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for date comparison

    if (effectiveDate < today) {
        errors.push('Effective date must be in the future. Past dates are not allowed.');
    }

    // Rule 2: Prices must be positive
    if (newPrice.regular_price <= 0) {
        errors.push('Regular price must be greater than 0');
    }
    if (newPrice.subscription_price <= 0) {
        errors.push('Subscription price must be greater than 0');
    }

    // Rule 3: Subscription price should not be higher than regular price
    if (newPrice.subscription_price > newPrice.regular_price) {
        warnings.push('Subscription price is higher than regular price. This is unusual.');
    }

    // Rule 4: Check for overlapping effective dates
    const overlapping = existingPrices.filter(p =>
        p.product_id === newPrice.product_id &&
        p.is_active &&
        p.effective_from === newPrice.effective_from
    );

    if (overlapping.length > 0) {
        errors.push('A price with the same effective date already exists for this product.');
    }

    // Rule 5: Large price changes should be warned
    const currentPrices = existingPrices
        .filter(p => p.product_id === newPrice.product_id && p.is_active)
        .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime());

    if (currentPrices.length > 0) {
        const currentPrice = currentPrices[0];
        const regularChange = Math.abs(newPrice.regular_price - currentPrice.regular_price);
        const regularChangePercent = (regularChange / currentPrice.regular_price) * 100;

        if (regularChangePercent > 20) {
            warnings.push(`Regular price change is ${regularChangePercent.toFixed(1)}% - please verify this is correct.`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Create a price history entry for audit logging
 */
export function createPriceHistoryEntry(
    oldPrice: ProductPrice | null,
    newPrice: ProductPrice,
    adminName: string,
    reason?: string
): PriceHistory {
    return {
        id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        product_id: newPrice.product_id,
        product_name: newPrice.product_name,
        old_regular_price: oldPrice?.regular_price,
        new_regular_price: newPrice.regular_price,
        old_subscription_price: oldPrice?.subscription_price,
        new_subscription_price: newPrice.subscription_price,
        effective_from: newPrice.effective_from,
        changed_by: adminName,
        changed_at: new Date().toISOString(),
        reason,
    };
}

/**
 * Initialize pricing in dev mode (localStorage)
 */
export function initializeDevPricing(): void {
    const pricesKey = 'dev_product_prices';
    const historyKey = 'dev_price_history';

    // Check if prices already exist
    const existingPrices = localStorage.getItem(pricesKey);

    if (!existingPrices) {
        const initialPrices = INITIAL_PRODUCT_PRICES.map(p => ({
            ...p,
            id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            created_by: 'System',
            created_at: new Date().toISOString(),
        }));

        localStorage.setItem(pricesKey, JSON.stringify(initialPrices));

        // Initialize empty history
        localStorage.setItem(historyKey, JSON.stringify([]));

        console.log('✅ Initialized product pricing in dev mode');
    }
}

/**
 * Get all prices from localStorage (dev mode)
 */
export function getDevPrices(): ProductPrice[] {
    const pricesKey = 'dev_product_prices';
    const pricesData = localStorage.getItem(pricesKey);
    return pricesData ? JSON.parse(pricesData) : [];
}

/**
 * Get price history from localStorage (dev mode)
 */
export function getDevPriceHistory(): PriceHistory[] {
    const historyKey = 'dev_price_history';
    const historyData = localStorage.getItem(historyKey);
    return historyData ? JSON.parse(historyData) : [];
}

/**
 * Add a new price (admin function)
 */
export function addNewPrice(
    newPrice: Omit<ProductPrice, 'id' | 'created_by' | 'created_at'>,
    adminName: string
): {
    success: boolean;
    message: string;
    price?: ProductPrice;
} {
    const existingPrices = getDevPrices();

    // Validate
    const validation = validatePriceChange(newPrice, existingPrices);
    if (!validation.isValid) {
        return {
            success: false,
            message: validation.errors.join('; '),
        };
    }

    // Create new price entry
    const priceEntry: ProductPrice = {
        ...newPrice,
        id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_by: adminName,
        created_at: new Date().toISOString(),
    };

    // Add to prices
    existingPrices.push(priceEntry);
    localStorage.setItem('dev_product_prices', JSON.stringify(existingPrices));

    // Create history entry
    const oldPrice = existingPrices
        .filter(p => p.product_id === newPrice.product_id && p.id !== priceEntry.id && p.is_active)
        .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())[0];

    const history = createPriceHistoryEntry(oldPrice || null, priceEntry, adminName);
    const existingHistory = getDevPriceHistory();
    existingHistory.push(history);
    localStorage.setItem('dev_price_history', JSON.stringify(existingHistory));

    return {
        success: true,
        message: `Price updated successfully. Effective from ${newPrice.effective_from}`,
        price: priceEntry,
    };
}
