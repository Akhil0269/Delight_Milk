import { useState, useEffect, useCallback } from "react";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { useNavigate } from "react-router-dom";
import { Package, Search, Loader2, Milk, ShoppingBag, Tag } from "lucide-react";
import { useProductSearch, useSearchSuggestions, useProductCategories } from "@/hooks/useProductSearch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const SearchDialog = ({ open, onOpenChange }: SearchDialogProps) => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Debounce search query to avoid too many API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch search results
    const { data: searchResults, isLoading, error } = useProductSearch(debouncedQuery);
    const { data: suggestions } = useSearchSuggestions();
    const { data: categories } = useProductCategories();

    // Reset search when dialog closes
    useEffect(() => {
        if (!open) {
            setSearchQuery("");
            setDebouncedQuery("");
        }
    }, [open]);

    const handleSelect = useCallback((productId: string, productName: string) => {
        onOpenChange(false);
        // Navigate to products page with the selected product highlighted
        navigate(`/products?highlight=${productId}`);

        // Store search in recent searches (optional - can implement localStorage)
        const recentSearches = JSON.parse(localStorage.getItem("recentSearches") || "[]");
        const updatedSearches = [
            productName,
            ...recentSearches.filter((s: string) => s !== productName)
        ].slice(0, 5);
        localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
    }, [navigate, onOpenChange]);

    const handleCategorySelect = useCallback((category: string) => {
        onOpenChange(false);
        navigate(`/products?category=${encodeURIComponent(category)}`);
    }, [navigate, onOpenChange]);

    const handleBrowseAll = useCallback(() => {
        onOpenChange(false);
        navigate("/products");
    }, [navigate, onOpenChange]);

    // Show suggestions when no search query
    const showSuggestions = !searchQuery.trim() && suggestions && suggestions.length > 0;
    const showCategories = !searchQuery.trim() && categories && categories.length > 0;
    const showResults = debouncedQuery.trim().length > 0;

    return (
        <CommandDialog open={open} onOpenChange={onOpenChange}>
            <CommandInput
                placeholder="Search for milk, curd, ghee, and more..."
                value={searchQuery}
                onValueChange={setSearchQuery}
            />
            <CommandList>
                {/* Loading State */}
                {isLoading && showResults && (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                    </div>
                )}

                {/* Error State */}
                {error && showResults && (
                    <div className="py-6 text-center text-sm">
                        <p className="text-destructive">Failed to search products</p>
                        <p className="text-muted-foreground mt-1">Please try again</p>
                    </div>
                )}

                {/* No Results */}
                {!isLoading && showResults && searchResults?.length === 0 && (
                    <CommandEmpty>
                        <div className="py-6 text-center">
                            <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                            <p className="text-sm font-medium">No products found</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Try searching for "milk", "curd", or "ghee"
                            </p>
                        </div>
                    </CommandEmpty>
                )}

                {/* Search Results */}
                {!isLoading && showResults && searchResults && searchResults.length > 0 && (
                    <CommandGroup heading={`Found ${searchResults.length} product${searchResults.length !== 1 ? 's' : ''}`}>
                        {searchResults.map((product) => (
                            <CommandItem
                                key={product.id}
                                value={product.name}
                                onSelect={() => handleSelect(product.id, product.name)}
                                className="cursor-pointer"
                            >
                                <div className="flex items-center gap-3 w-full">
                                    {product.image_url ? (
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-10 h-10 rounded-md object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                                            <Milk className="h-5 w-5 text-primary" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{product.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge variant="secondary" className="text-xs">
                                                {product.category}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                ₹{product.price_per_unit}/{product.unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {/* Quick Actions - Always visible */}
                {!showResults && (
                    <>
                        <CommandGroup heading="Quick Actions">
                            <CommandItem onSelect={handleBrowseAll} className="cursor-pointer">
                                <ShoppingBag className="mr-2 h-4 w-4 text-primary" />
                                <span>Browse All Products</span>
                            </CommandItem>
                        </CommandGroup>

                        {/* Categories */}
                        {showCategories && (
                            <>
                                <Separator className="my-2" />
                                <CommandGroup heading="Browse by Category">
                                    {categories.filter(cat => cat !== "All").map((category) => (
                                        <CommandItem
                                            key={category}
                                            value={category}
                                            onSelect={() => handleCategorySelect(category)}
                                            className="cursor-pointer"
                                        >
                                            <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>{category}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}

                        {/* Popular Products */}
                        {showSuggestions && (
                            <>
                                <Separator className="my-2" />
                                <CommandGroup heading="Popular Products">
                                    {suggestions.slice(0, 5).map((product) => (
                                        <CommandItem
                                            key={product.id}
                                            value={product.name}
                                            onSelect={() => handleSelect(product.id, product.name)}
                                            className="cursor-pointer"
                                        >
                                            <Package className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>{product.name}</span>
                                            <Badge variant="outline" className="ml-auto text-xs">
                                                {product.category}
                                            </Badge>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </>
                )}
            </CommandList>

            {/* Footer hint */}
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                    <span className="text-xs">ESC</span>
                </kbd>
                {" "}to close
            </div>
        </CommandDialog>
    );
};

export default SearchDialog;
