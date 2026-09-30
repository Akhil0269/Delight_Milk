import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, X, TrendingUp, Clock, Filter, SlidersHorizontal, ShoppingCart,
    Star, Package, Zap, ArrowLeft, Loader2, ChevronDown,
    Grid3x3, List, Sparkles, Tag, Award, Heart
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProductSearch, useSearchSuggestions, useProductCategories } from "@/hooks/useProductSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

const SearchPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get("q") || "";

    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [sortBy, setSortBy] = useState<string>("relevance");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [showFilters, setShowFilters] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { addItem } = useCart();

    const handleAddToCart = (e: React.MouseEvent, product: any) => {
        e.stopPropagation();
        addItem({
            id: product.id,
            name: product.name,
            price: product.price_per_unit,
            image_url: product.image_url,
            unit: product.unit
        });
        toast.success(`Added ${product.name} to cart!`);
    };

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
            if (searchQuery) {
                setSearchParams({ q: searchQuery });
            } else {
                setSearchParams({});
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, setSearchParams]);

    // Fetch data
    const { data: searchResults, isLoading } = useProductSearch(debouncedQuery, selectedCategory);
    const { data: suggestions } = useSearchSuggestions();
    const { data: categories } = useProductCategories();

    // Load recent searches
    useEffect(() => {
        const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
        setRecentSearches(recent);
    }, []);

    // Auto-focus input
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Keyboard navigation (ESC to go back)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (window.history.length > 1) {
                    navigate(-1);
                } else {
                    navigate('/dashboard');
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        // Save to recent searches
        if (query.trim()) {
            const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
            localStorage.setItem("recentSearches", JSON.stringify(updated));
            setRecentSearches(updated);
        }
    }, [recentSearches]);

    const handleProductClick = useCallback((productId: string) => {
        navigate(`/products?highlight=${productId}`);
    }, [navigate]);

    const clearRecentSearches = useCallback(() => {
        localStorage.removeItem("recentSearches");
        setRecentSearches([]);
    }, []);

    // Sort results
    const sortedResults = useCallback(() => {
        if (!searchResults) return [];

        let sorted = [...searchResults];
        switch (sortBy) {
            case "price-low":
                sorted.sort((a, b) => a.price_per_unit - b.price_per_unit);
                break;
            case "price-high":
                sorted.sort((a, b) => b.price_per_unit - a.price_per_unit);
                break;
            case "name":
                sorted.sort((a, b) => a.name.localeCompare(b.name));
                break;
            default: // relevance
                break;
        }
        return sorted;
    }, [searchResults, sortBy]);

    const showResults = debouncedQuery.trim().length > 0;
    const showSuggestions = !searchQuery.trim() && suggestions && suggestions.length > 0;
    const showCategories = !searchQuery.trim() && categories && categories.length > 0;
    const showRecent = !searchQuery.trim() && recentSearches.length > 0;
    const results = sortedResults();

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
            {/* Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border"
            >
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        {/* Back Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                // Check if there's history to go back to
                                if (window.history.length > 1) {
                                    navigate(-1);
                                } else {
                                    // Fallback to dashboard if no history
                                    navigate('/dashboard');
                                }
                            }}
                            className="shrink-0 hover:bg-accent transition-colors"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>

                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                                placeholder="Search for milk, curd, ghee, paneer..."
                                className="w-full h-14 pl-12 pr-12 rounded-2xl border-2 border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base"
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        {/* Filter Toggle (Mobile) */}
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowFilters(!showFilters)}
                            className="md:hidden"
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Filters Bar */}
                    <AnimatePresence>
                        {(showFilters || window.innerWidth >= 768) && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mt-4 flex flex-wrap items-center gap-3"
                            >
                                {/* Category Filter */}
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="w-[140px]">
                                        <Tag className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories?.map((cat) => (
                                            <SelectItem key={cat} value={cat}>
                                                {cat}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Sort By */}
                                <Select value={sortBy} onValueChange={setSortBy}>
                                    <SelectTrigger className="w-[160px]">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Sort by" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="relevance">Relevance</SelectItem>
                                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                                        <SelectItem value="name">Name (A-Z)</SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* View Mode */}
                                <div className="flex items-center gap-1 ml-auto">
                                    <Button
                                        variant={viewMode === "grid" ? "default" : "ghost"}
                                        size="icon"
                                        onClick={() => setViewMode("grid")}
                                    >
                                        <Grid3x3 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={viewMode === "list" ? "default" : "ghost"}
                                        size="icon"
                                        onClick={() => setViewMode("list")}
                                    >
                                        <List className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8">
                {/* Loading State */}
                {isLoading && showResults && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                        <p className="text-lg font-medium">Searching products...</p>
                        <p className="text-sm text-muted-foreground">Finding the best matches for you</p>
                    </div>
                )}

                {/* No Results */}
                {!isLoading && showResults && results.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md mx-auto text-center py-20"
                    >
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                            <Search className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">No products found</h3>
                        <p className="text-muted-foreground mb-6">
                            We couldn't find any products matching "{searchQuery}"
                        </p>
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Try searching for:</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {["Milk", "Curd", "Ghee", "Paneer"].map((term) => (
                                    <Button
                                        key={term}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleSearch(term)}
                                    >
                                        {term}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Search Results */}
                {!isLoading && showResults && results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {/* Results Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-primary" />
                                <h2 className="text-xl font-bold">
                                    Found {results.length} product{results.length !== 1 ? 's' : ''}
                                </h2>
                            </div>
                        </div>

                        {/* Results Grid/List */}
                        <div className={cn(
                            "grid gap-6",
                            viewMode === "grid"
                                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                : "grid-cols-1"
                        )}>
                            {results.map((product, index) => (
                                <motion.div
                                    key={product.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card
                                        className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group h-full"
                                        onClick={() => handleProductClick(product.id)}
                                    >
                                        <div className={cn(
                                            "flex",
                                            viewMode === "grid" ? "flex-col" : "flex-row"
                                        )}>
                                            {/* Image */}
                                            <div className={cn(
                                                "relative overflow-hidden bg-muted",
                                                viewMode === "grid" ? "aspect-square" : "w-32 h-32"
                                            )}>
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package className="w-12 h-12 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <Badge className="absolute top-2 right-2 bg-primary">
                                                    {product.category}
                                                </Badge>
                                            </div>

                                            {/* Content */}
                                            <CardContent className={cn(
                                                "flex-1",
                                                viewMode === "grid" ? "p-4" : "p-3"
                                            )}>
                                                <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                                    {product.name}
                                                </h3>
                                                {product.description && (
                                                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                                        {product.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-2xl font-bold text-primary">
                                                            ₹{product.price_per_unit}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            per {product.unit}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => handleAddToCart(e, product)}
                                                        className="bg-primary hover:bg-primary/90"
                                                    >
                                                        <ShoppingCart className="w-4 h-4 mr-1" />
                                                        Add
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Default State - No Search Query */}
                {!showResults && (
                    <div className="max-w-4xl mx-auto space-y-12">
                        {/* Recent Searches */}
                        {showRecent && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-muted-foreground" />
                                        <h2 className="text-xl font-bold">Recent Searches</h2>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={clearRecentSearches}>
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
                                            onClick={() => handleSearch(search)}
                                            className="px-4 py-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-all font-medium"
                                        >
                                            {search}
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {/* Categories */}
                        {showCategories && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <Tag className="w-5 h-5 text-muted-foreground" />
                                    <h2 className="text-xl font-bold">Browse by Category</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {categories.filter(cat => cat !== "All").map((category, index) => (
                                        <motion.button
                                            key={category}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => {
                                                setSelectedCategory(category);
                                                handleSearch(category);
                                            }}
                                            className="p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 border-2 border-primary/20 hover:border-primary transition-all group"
                                        >
                                            <Package className="w-8 h-8 text-primary mb-2 mx-auto" />
                                            <p className="font-semibold group-hover:text-primary transition-colors">
                                                {category}
                                            </p>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.section>
                        )}

                        {/* Popular Products */}
                        {showSuggestions && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <div className="flex items-center gap-2 mb-4">
                                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                                    <h2 className="text-xl font-bold">Popular Products</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {suggestions.slice(0, 6).map((product, index) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Card
                                                className="p-4 hover:shadow-lg transition-all cursor-pointer group"
                                                onClick={() => handleProductClick(product.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all">
                                                        <Award className="w-8 h-8 text-primary" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-semibold group-hover:text-primary transition-colors">
                                                            {product.name}
                                                        </h3>
                                                        <Badge variant="outline" className="mt-1">
                                                            {product.category}
                                                        </Badge>
                                                    </div>
                                                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
