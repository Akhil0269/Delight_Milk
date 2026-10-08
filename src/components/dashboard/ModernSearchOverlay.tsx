import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, X, TrendingUp, Clock, Package, Tag, ArrowRight,
    Milk, Sparkles, Zap, Star, ChevronRight, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductSearch, useSearchSuggestions, useProductCategories } from "@/hooks/useProductSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ModernSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const ModernSearchOverlay = ({ isOpen, onClose }: ModernSearchOverlayProps) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch search results
    const { data: searchResults, isLoading, error } = useProductSearch(debouncedQuery);
    const { data: suggestions } = useSearchSuggestions();
    const { data: categories } = useProductCategories();

    // Load recent searches from localStorage
    useEffect(() => {
        const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
        setRecentSearches(recent);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        } else {
            setSearchQuery("");
            setDebouncedQuery("");
        }
    }, [isOpen]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onClose]);

    const handleProductSelect = useCallback((productId: string, productName: string) => {
        // Save to recent searches
        const updated = [productName, ...recentSearches.filter(s => s !== productName)].slice(0, 5);
        localStorage.setItem("recentSearches", JSON.stringify(updated));
        setRecentSearches(updated);

        onClose();
        navigate(`/products?highlight=${productId}`);
    }, [navigate, onClose, recentSearches]);

    const handleCategorySelect = useCallback((category: string) => {
        onClose();
        navigate(`/products?category=${encodeURIComponent(category)}`);
    }, [navigate, onClose]);

    const handleRecentSearch = useCallback((query: string) => {
        setSearchQuery(query);
        setDebouncedQuery(query);
    }, []);

    const clearRecentSearches = useCallback(() => {
        localStorage.removeItem("recentSearches");
        setRecentSearches([]);
    }, []);

    const showResults = debouncedQuery.trim().length > 0;
    const showSuggestions = !searchQuery.trim() && suggestions && suggestions.length > 0;
    const showCategories = !searchQuery.trim() && categories && categories.length > 0;
    const showRecent = !searchQuery.trim() && recentSearches.length > 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    {/* Search Overlay */}
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-20 px-4"
                    >
                        <div className="w-full max-w-3xl">
                            {/* Search Box */}
                            <motion.div
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
                            >
                                {/* Search Input Header */}
                                <div className="relative">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
                                        <Search className="w-6 h-6 text-primary" />
                                    </div>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search for milk, curd, ghee, paneer..."
                                        className="w-full h-20 pl-16 pr-16 text-lg bg-transparent border-0 outline-none focus:ring-0 placeholder:text-muted-foreground"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onClose}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full hover:bg-muted"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                <Separator />

                                {/* Results Container */}
                                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {/* Loading State */}
                                    {isLoading && showResults && (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                            <span className="ml-3 text-muted-foreground">Searching...</span>
                                        </div>
                                    )}

                                    {/* Error State */}
                                    {error && showResults && (
                                        <div className="py-12 text-center">
                                            <p className="text-destructive font-medium">Failed to search products</p>
                                            <p className="text-sm text-muted-foreground mt-1">Please try again</p>
                                        </div>
                                    )}

                                    {/* No Results */}
                                    {!isLoading && showResults && searchResults?.length === 0 && (
                                        <div className="py-16 text-center">
                                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                                                <Search className="w-10 h-10 text-muted-foreground" />
                                            </div>
                                            <h3 className="text-xl font-semibold mb-2">No products found</h3>
                                            <p className="text-muted-foreground">
                                                Try searching for "milk", "curd", or "ghee"
                                            </p>
                                        </div>
                                    )}

                                    {/* Search Results */}
                                    {!isLoading && showResults && searchResults && searchResults.length > 0 && (
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Sparkles className="w-4 h-4 text-primary" />
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    Found {searchResults.length} product{searchResults.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {searchResults.map((product) => (
                                                    <motion.button
                                                        key={product.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        onClick={() => handleProductSelect(product.id, product.name)}
                                                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-all group text-left"
                                                    >
                                                        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center ring-2 ring-border group-hover:ring-primary transition-all flex-shrink-0 relative overflow-hidden">
                                                            {product.image_url ? (
                                                                <img
                                                                    src={product.image_url}
                                                                    alt={product.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <Milk className="w-8 h-8 text-primary absolute -z-10" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-base mb-1 truncate group-hover:text-primary transition-colors">
                                                                {product.name}
                                                            </h4>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {product.category}
                                                                </Badge>
                                                                <span className="text-sm font-medium text-primary">
                                                                    ₹{product.price_per_unit}/{product.unit}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Default State - Recent, Trending, Categories */}
                                    {!showResults && (
                                        <div className="p-6 space-y-6">
                                            {/* Recent Searches */}
                                            {showRecent && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                                            <h3 className="font-semibold text-sm">Recent Searches</h3>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={clearRecentSearches}
                                                            className="text-xs h-7"
                                                        >
                                                            Clear all
                                                        </Button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {recentSearches.map((search, index) => (
                                                            <motion.button
                                                                key={index}
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: index * 0.05 }}
                                                                onClick={() => handleRecentSearch(search)}
                                                                className="px-4 py-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all text-sm font-medium"
                                                            >
                                                                {search}
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Categories */}
                                            {showCategories && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.1 }}
                                                >
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Tag className="w-4 h-4 text-muted-foreground" />
                                                        <h3 className="font-semibold text-sm">Browse by Category</h3>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {categories.filter(cat => cat !== "All").map((category, index) => (
                                                            <motion.button
                                                                key={category}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: index * 0.05 }}
                                                                onClick={() => handleCategorySelect(category)}
                                                                className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border border-primary/20 hover:border-primary transition-all group"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                                                                        {category}
                                                                    </span>
                                                                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                                                </div>
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Popular Products */}
                                            {showSuggestions && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.2 }}
                                                >
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                                                        <h3 className="font-semibold text-sm">Popular Products</h3>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {suggestions.slice(0, 5).map((product, index) => (
                                                            <motion.button
                                                                key={product.id}
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: index * 0.05 }}
                                                                onClick={() => handleProductSelect(product.id, product.name)}
                                                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all group text-left"
                                                            >
                                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                                                                    <Package className="w-5 h-5 text-primary" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                                                        {product.name}
                                                                    </p>
                                                                    <Badge variant="outline" className="text-xs mt-1">
                                                                        {product.category}
                                                                    </Badge>
                                                                </div>
                                                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                                            </motion.button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Quick Action */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 }}
                                            >
                                                <Button
                                                    onClick={() => {
                                                        onClose();
                                                        navigate("/products");
                                                    }}
                                                    variant="outline"
                                                    className="w-full h-12 text-base font-medium group"
                                                >
                                                    <Zap className="w-5 h-5 mr-2 group-hover:text-primary transition-colors" />
                                                    Browse All Products
                                                    <ArrowRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </motion.div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Helper Text */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="text-center mt-4 text-sm text-muted-foreground"
                            >
                                Press <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">ESC</kbd> to close
                            </motion.div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ModernSearchOverlay;
