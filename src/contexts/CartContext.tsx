import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
    unit?: string;
    category?: string;
    is_active?: boolean;
}

interface CartContextType {
    items: CartItem[];
    itemCount: number;
    totalPrice: number;
    hasUnavailableItems: boolean;
    unavailableItems: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'> & { is_active?: boolean }, quantity?: number) => boolean;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    removeUnavailableItems: () => void;
    syncWithCatalog: () => Promise<void>;
}

const CART_STORAGE_KEY = 'delightmilk_cart';
const MAX_ITEM_QUANTITY = 99;

/**
 * Validates and sanitizes raw cart data from localStorage or external input.
 * Quarantines corrupted or unparseable items.
 */
function sanitizeCartItems(raw: unknown): CartItem[] {
    if (!Array.isArray(raw)) return [];

    const validItems: CartItem[] = [];

    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue;
        const item = entry as Record<string, unknown>;

        const id = typeof item.id === 'string' ? item.id.trim() : '';
        if (!id) continue;

        const name = typeof item.name === 'string' && item.name.trim()
            ? item.name.trim()
            : 'Dairy Product';

        let price = 0;
        if (typeof item.price === 'number' && !isNaN(item.price) && isFinite(item.price) && item.price >= 0) {
            price = item.price;
        } else if (typeof item.price === 'string' && !isNaN(parseFloat(item.price)) && parseFloat(item.price) >= 0) {
            price = parseFloat(item.price);
        }

        let quantity = 1;
        if (typeof item.quantity === 'number' && !isNaN(item.quantity)) {
            quantity = Math.floor(item.quantity);
        } else if (typeof item.quantity === 'string' && !isNaN(parseInt(item.quantity, 10))) {
            quantity = parseInt(item.quantity, 10);
        }
        quantity = Math.max(1, Math.min(MAX_ITEM_QUANTITY, quantity));

        const image_url = typeof item.image_url === 'string' && item.image_url.trim()
            ? item.image_url.trim()
            : undefined;

        const unit = typeof item.unit === 'string' && item.unit.trim()
            ? item.unit.trim()
            : 'unit';

        const category = typeof item.category === 'string' && item.category.trim()
            ? item.category.trim()
            : undefined;

        const is_active = typeof item.is_active === 'boolean' ? item.is_active : true;

        validItems.push({
            id,
            name,
            price: Math.round(price * 100) / 100,
            quantity,
            image_url,
            unit,
            category,
            is_active,
        });
    }

    return validItems;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
    const [items, setItems] = useState<CartItem[]>(() => {
        try {
            const saved = localStorage.getItem(CART_STORAGE_KEY);
            if (!saved) return [];
            return sanitizeCartItems(JSON.parse(saved));
        } catch (e) {
            console.error("Failed to load initial cart from localStorage:", e);
            return [];
        }
    });

    // Save validated cart items to localStorage on state changes
    useEffect(() => {
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
        } catch (e) {
            console.error("Failed to persist cart to localStorage:", e);
        }
    }, [items]);

    // Live catalog synchronization: verifies cart items against canonical database records
    const syncWithCatalog = useCallback(async () => {
        if (items.length === 0) return;

        try {
            const itemIds = items.map((i) => i.id);
            const { data: dbProducts, error } = await supabase
                .from("products")
                .select("id, name, category, price_per_unit, unit, image_url, is_active")
                .in("id", itemIds);

            if (error) {
                console.warn("Catalog sync failed, preserving local cart state:", error.message);
                return;
            }

            const dbMap = new Map((dbProducts || []).map((p) => [p.id, p]));

            setItems((currentItems) => {
                let hasChanges = false;
                const updated = currentItems.map((cartItem) => {
                    const fresh = dbMap.get(cartItem.id);
                    if (!fresh) {
                        // Product was deleted from database
                        if (cartItem.is_active !== false) {
                            hasChanges = true;
                            return { ...cartItem, is_active: false };
                        }
                        return cartItem;
                    }

                    const canonicalPrice = Number(fresh.price_per_unit) || 0;
                    const canonicalActive = Boolean(fresh.is_active);
                    const canonicalName = fresh.name || cartItem.name;
                    const canonicalImage = fresh.image_url || cartItem.image_url;
                    const canonicalUnit = fresh.unit || cartItem.unit;

                    if (
                        cartItem.is_active !== canonicalActive ||
                        cartItem.price !== canonicalPrice ||
                        cartItem.name !== canonicalName ||
                        cartItem.image_url !== canonicalImage ||
                        cartItem.unit !== canonicalUnit
                    ) {
                        hasChanges = true;
                        return {
                            ...cartItem,
                            is_active: canonicalActive,
                            price: canonicalPrice,
                            name: canonicalName,
                            image_url: canonicalImage,
                            unit: canonicalUnit,
                        };
                    }

                    return cartItem;
                });

                return hasChanges ? updated : currentItems;
            });
        } catch (err) {
            console.warn("Unexpected error during cart catalog sync:", err);
        }
    }, [items]);

    // Trigger catalog sync once on mount
    useEffect(() => {
        syncWithCatalog();
    }, [syncWithCatalog]);

    // Derived states
    const unavailableItems = items.filter((item) => item.is_active === false);
    const hasUnavailableItems = unavailableItems.length > 0;

    const itemCount = items.reduce((sum, item) => {
        const q = Number(item.quantity) || 0;
        return sum + Math.max(0, q);
    }, 0);

    const totalPrice = Number(
        items.reduce((sum, item) => {
            // Unavailable products do not contribute to payable checkout amount
            if (item.is_active === false) return sum;
            const p = Number(item.price) || 0;
            const q = Number(item.quantity) || 0;
            return sum + (p * q);
        }, 0).toFixed(2)
    );

    const addItem = (
        newItem: Omit<CartItem, 'quantity'> & { is_active?: boolean },
        quantity = 1
    ): boolean => {
        if (newItem.is_active === false) {
            toast.error(`${newItem.name} is currently unavailable and cannot be added to cart.`);
            return false;
        }

        const validAddQty = Math.max(1, Math.min(MAX_ITEM_QUANTITY, Math.floor(Number(quantity) || 1)));

        let added = false;
        setItems((prev) => {
            const existing = prev.find((item) => item.id === newItem.id);
            if (existing) {
                const newQuantity = Math.min(MAX_ITEM_QUANTITY, existing.quantity + validAddQty);
                toast.success(`Updated ${newItem.name} quantity to ${newQuantity}`);
                added = true;
                return prev.map((item) =>
                    item.id === newItem.id
                        ? { ...item, quantity: newQuantity }
                        : item
                );
            }

            const sanitizedPrice = typeof newItem.price === 'number' && !isNaN(newItem.price) && newItem.price >= 0
                ? newItem.price
                : 0;

            const sanitizedItem: CartItem = {
                id: newItem.id,
                name: newItem.name || 'Dairy Product',
                price: Math.round(sanitizedPrice * 100) / 100,
                quantity: validAddQty,
                image_url: newItem.image_url || undefined,
                unit: newItem.unit || 'unit',
                category: newItem.category || undefined,
                is_active: true,
            };

            toast.success(`Added ${validAddQty > 1 ? `${validAddQty}x ` : ''}${newItem.name} to cart`);
            added = true;
            return [...prev, sanitizedItem];
        });

        return added;
    };

    const removeItem = (id: string) => {
        setItems((prev) => {
            const target = prev.find((item) => item.id === id);
            const remaining = prev.filter((item) => item.id !== id);
            if (target) {
                toast.info(`Removed ${target.name} from cart`);
            }
            return remaining;
        });
    };

    const updateQuantity = (id: string, quantity: number) => {
        const rawQty = Math.floor(Number(quantity));

        if (isNaN(rawQty) || rawQty <= 0) {
            removeItem(id);
            return;
        }

        const validQty = Math.min(MAX_ITEM_QUANTITY, rawQty);

        setItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, quantity: validQty } : item
            )
        );
    };

    const removeUnavailableItems = () => {
        setItems((prev) => {
            const activeOnly = prev.filter((item) => item.is_active !== false);
            const removedCount = prev.length - activeOnly.length;
            if (removedCount > 0) {
                toast.info(`Removed ${removedCount} unavailable item${removedCount > 1 ? 's' : ''} from cart`);
            }
            return activeOnly;
        });
    };

    const clearCart = () => {
        setItems([]);
        try {
            localStorage.removeItem(CART_STORAGE_KEY);
        } catch {
            // ignore localStorage quota error
        }
        toast.info("Cart cleared");
    };

    return (
        <CartContext.Provider
            value={{
                items,
                itemCount,
                totalPrice,
                hasUnavailableItems,
                unavailableItems,
                addItem,
                removeItem,
                updateQuantity,
                clearCart,
                removeUnavailableItems,
                syncWithCatalog,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};
