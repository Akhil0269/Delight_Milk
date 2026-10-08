import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export const FAVORITES_STORAGE_KEY = "delight_favorite_ids";

export function useFavorites() {
    const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) ? parsed : [];
            }
            return [];
        } catch {
            return [];
        }
    });

    const syncFavorites = useCallback(() => {
        try {
            const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setFavoriteIds(parsed);
                    return;
                }
            }
            setFavoriteIds([]);
        } catch {
            setFavoriteIds([]);
        }
    }, []);

    useEffect(() => {
        const handleCustomSync = () => syncFavorites();
        window.addEventListener("delight-favorites-changed", handleCustomSync);
        window.addEventListener("storage", handleCustomSync);

        return () => {
            window.removeEventListener("delight-favorites-changed", handleCustomSync);
            window.removeEventListener("storage", handleCustomSync);
        };
    }, [syncFavorites]);

    const saveFavorites = useCallback((next: string[]) => {
        setFavoriteIds(next);
        try {
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
            window.dispatchEvent(new Event("delight-favorites-changed"));
        } catch {
            // ignore localStorage quota error
        }
    }, []);

    const isFavorite = useCallback(
        (id: string) => favoriteIds.includes(id),
        [favoriteIds]
    );

    const addFavorite = useCallback(
        (id: string, name?: string) => {
            if (!id) return;
            if (favoriteIds.includes(id)) return; // duplicate prevention
            const next = [...favoriteIds, id];
            saveFavorites(next);
            toast.success(`Added ${name || "product"} to favorites`);
        },
        [favoriteIds, saveFavorites]
    );

    const removeFavorite = useCallback(
        (id: string, name?: string) => {
            if (!id) return;
            const next = favoriteIds.filter((favId) => favId !== id);
            saveFavorites(next);
            toast.success(`Removed ${name || "product"} from favorites`);
        },
        [favoriteIds, saveFavorites]
    );

    const toggleFavorite = useCallback(
        (id: string, name?: string) => {
            if (!id) return false;
            if (favoriteIds.includes(id)) {
                removeFavorite(id, name);
                return false;
            } else {
                addFavorite(id, name);
                return true;
            }
        },
        [favoriteIds, addFavorite, removeFavorite]
    );

    return {
        favoriteIds,
        count: favoriteIds.length,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite,
    };
}
