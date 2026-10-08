import { useState, useMemo } from "react";
import {
    Plus, Edit, Eye, EyeOff, Search, Package,
    CheckCircle2, XCircle, Filter, Loader2, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAdminProducts, useCreateProduct, useUpdateProduct } from "@/hooks/useAdmin";
import { ProductImagePicker } from "@/components/admin/ProductImagePicker";

interface ProductItem {
    id: string;
    name: string;
    category: string;
    price_per_unit: number;
    unit: string;
    description?: string | null;
    image_url?: string | null;
    is_active?: boolean;
    created_at?: string;
}

const CATEGORY_OPTIONS = [
    { value: "milk", label: "Milk" },
    { value: "curd", label: "Curd" },
    { value: "butter", label: "Butter" },
    { value: "ghee", label: "Ghee" },
    { value: "paneer", label: "Paneer" },
    { value: "Buttermilk", label: "Buttermilk" },
    { value: "Lassi", label: "Lassi" },
    { value: "dairy", label: "General Dairy" },
];

const UNIT_OPTIONS = [
    { value: "L", label: "Liter (L)" },
    { value: "500 ml", label: "500 ml" },
    { value: "kg", label: "Kilogram (kg)" },
    { value: "500 g", label: "500 g" },
    { value: "250 g", label: "250 g" },
    { value: "piece", label: "Piece" },
    { value: "pack", label: "Pack" },
];

const ProductManagement = () => {
    const { data: rawProducts, isLoading, error } = useAdminProducts();
    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();

    const [searchFilter, setSearchFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "available" | "unavailable">("all");

    // Modal state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

    // Form state
    const [formName, setFormName] = useState("");
    const [formCategory, setFormCategory] = useState("milk");
    const [formPrice, setFormPrice] = useState("");
    const [formUnit, setFormUnit] = useState("L");
    const [formDescription, setFormDescription] = useState("");
    const [formIsActive, setFormIsActive] = useState(true);
    const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const products: ProductItem[] = useMemo(() => {
        return (rawProducts || []).map((p) => ({
            id: p.id,
            name: p.name || (p as { product_name?: string }).product_name || "Product",
            category: p.category || "dairy",
            price_per_unit: Number(p.price_per_unit) || 0,
            unit: p.unit || "unit",
            description: p.description || null,
            image_url: p.image_url || null,
            is_active: p.is_active ?? (p as { is_available?: boolean }).is_available ?? true,
            created_at: p.created_at,
        }));
    }, [rawProducts]);

    // Summary counts
    const counts = useMemo(() => {
        const total = products.length;
        const available = products.filter((p) => p.is_active).length;
        const unavailable = total - available;
        return { total, available, unavailable };
    }, [products]);

    // Filtered products list
    const filteredProducts = useMemo(() => {
        const query = searchFilter.trim().toLowerCase();
        return products.filter((p) => {
            const matchesSearch =
                !query ||
                p.name.toLowerCase().includes(query) ||
                p.category.toLowerCase().includes(query) ||
                (p.description && p.description.toLowerCase().includes(query));

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "available" && p.is_active) ||
                (statusFilter === "unavailable" && !p.is_active);

            return matchesSearch && matchesStatus;
        });
    }, [products, searchFilter, statusFilter]);

    const handleOpenAddDialog = () => {
        setEditMode(false);
        setSelectedProduct(null);
        setFormName("");
        setFormCategory("milk");
        setFormPrice("");
        setFormUnit("L");
        setFormDescription("");
        setFormIsActive(true);
        setFormImageUrl(null);
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleOpenEditDialog = (product: ProductItem) => {
        setEditMode(true);
        setSelectedProduct(product);
        setFormName(product.name);
        setFormCategory(product.category);
        setFormPrice(product.price_per_unit.toString());
        setFormUnit(product.unit);
        setFormDescription(product.description || "");
        setFormIsActive(Boolean(product.is_active));
        setFormImageUrl(product.image_url || null);
        setFormErrors({});
        setDialogOpen(true);
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        const trimmedName = formName.trim();
        if (!trimmedName || trimmedName.length < 2) {
            errors.name = "Product name must be at least 2 characters.";
        }
        const numericPrice = parseFloat(formPrice);
        if (!Number.isFinite(numericPrice) || isNaN(numericPrice) || numericPrice <= 0) {
            errors.price = "Please enter a valid price greater than 0.";
        } else if (numericPrice > 100000) {
            errors.price = "Price cannot exceed ₹100,000.";
        }
        if (!formCategory?.trim()) {
            errors.category = "Category is required.";
        }
        if (!formUnit?.trim()) {
            errors.unit = "Unit is required.";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveProduct = async () => {
        if (!validateForm()) {
            toast.error("Please correct the form errors before saving.");
            return;
        }

        const numericPrice = Math.round(parseFloat(formPrice) * 100) / 100;

        const payload = {
            name: formName.trim(),
            category: formCategory.trim(),
            price_per_unit: numericPrice,
            unit: formUnit.trim(),
            description: formDescription.trim() || null,
            is_active: formIsActive,
            image_url: formImageUrl,
        };

        if (editMode && selectedProduct) {
            updateProduct.mutate(
                { productId: selectedProduct.id, updates: payload },
                {
                    onSuccess: () => {
                        setDialogOpen(false);
                    },
                }
            );
        } else {
            createProduct.mutate(payload, {
                onSuccess: () => {
                    setDialogOpen(false);
                },
            });
        }
    };

    const handleToggleAvailability = (productId: string, currentStatus: boolean, productName: string) => {
        const newStatus = !currentStatus;
        updateProduct.mutate(
            { productId, updates: { is_active: newStatus } },
            {
                onSuccess: () => {
                    toast.success(
                        `${productName} is now marked as ${newStatus ? "Available" : "Unavailable"}`
                    );
                },
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage dairy catalog items, availability, imagery, and pricing.
                    </p>
                </div>
                <Button onClick={handleOpenAddDialog} className="gap-2 shadow-sm">
                    <Plus className="w-4 h-4" />
                    Add Product
                </Button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card
                    onClick={() => setStatusFilter("all")}
                    className={`cursor-pointer transition-all border ${
                        statusFilter === "all" ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                >
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs uppercase font-semibold">Total Products</CardDescription>
                        <CardTitle className="text-2xl font-bold">{counts.total}</CardTitle>
                    </CardHeader>
                </Card>

                <Card
                    onClick={() => setStatusFilter("available")}
                    className={`cursor-pointer transition-all border ${
                        statusFilter === "available"
                            ? "ring-2 ring-green-600 bg-green-500/5"
                            : "hover:border-green-600/50"
                    }`}
                >
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs uppercase font-semibold text-green-700">Available Products</CardDescription>
                        <CardTitle className="text-2xl font-bold text-green-600">{counts.available}</CardTitle>
                    </CardHeader>
                </Card>

                <Card
                    onClick={() => setStatusFilter("unavailable")}
                    className={`cursor-pointer transition-all border ${
                        statusFilter === "unavailable"
                            ? "ring-2 ring-red-600 bg-red-500/5"
                            : "hover:border-red-600/50"
                    }`}
                >
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs uppercase font-semibold text-red-700">Unavailable Products</CardDescription>
                        <CardTitle className="text-2xl font-bold text-red-600">{counts.unavailable}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Search by name, category, or description..."
                        className="pl-9 h-9 text-sm bg-muted/30"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted rounded-lg p-1 text-xs font-medium">
                        <button
                            type="button"
                            onClick={() => setStatusFilter("all")}
                            className={`px-3 py-1 rounded-md transition-all ${
                                statusFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                            }`}
                        >
                            All ({counts.total})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("available")}
                            className={`px-3 py-1 rounded-md transition-all ${
                                statusFilter === "available" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                            }`}
                        >
                            Available ({counts.available})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("unavailable")}
                            className={`px-3 py-1 rounded-md transition-all ${
                                statusFilter === "unavailable" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                            }`}
                        >
                            Unavailable ({counts.unavailable})
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading / Error States */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                </div>
            ) : error ? (
                <Card className="p-8 text-center border-destructive/20 bg-destructive/5">
                    <p className="text-destructive font-semibold">Failed to load products from database</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {error instanceof Error ? error.message : "Database connection issue."}
                    </p>
                </Card>
            ) : filteredProducts.length === 0 ? (
                <Card className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-2xl">
                        🥛
                    </div>
                    <h3 className="font-semibold text-lg">No products found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        {searchFilter
                            ? `No items match the search query "${searchFilter}".`
                            : "There are no products in this category yet."}
                    </p>
                    {searchFilter && (
                        <Button variant="outline" size="sm" onClick={() => setSearchFilter("")}>
                            Clear search
                        </Button>
                    )}
                </Card>
            ) : (
                <>
                    {/* DESKTOP & TABLET VIEW: CLEAN TABLE */}
                    <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="w-16">Image</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.map((product) => {
                                    const isActive = Boolean(product.is_active);
                                    return (
                                        <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                                            {/* Image Column */}
                                            <TableCell>
                                                <div className="w-12 h-12 rounded-lg bg-muted border overflow-hidden flex items-center justify-center text-xl flex-shrink-0">
                                                    {product.image_url ? (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.currentTarget as HTMLElement).style.display = "none";
                                                                const sib = (e.currentTarget as HTMLElement).nextElementSibling;
                                                                if (sib) (sib as HTMLElement).style.display = "flex";
                                                            }}
                                                        />
                                                    ) : null}
                                                    <span
                                                        className="w-full h-full items-center justify-center text-lg"
                                                        style={{ display: product.image_url ? "none" : "flex" }}
                                                    >
                                                        🥛
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Product Column */}
                                            <TableCell>
                                                <div className="font-semibold text-foreground text-sm">
                                                    {product.name}
                                                </div>
                                                {product.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-md mt-0.5">
                                                        {product.description}
                                                    </p>
                                                )}
                                            </TableCell>

                                            {/* Category Column */}
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize text-xs font-medium">
                                                    {product.category}
                                                </Badge>
                                            </TableCell>

                                            {/* Price Column */}
                                            <TableCell>
                                                <div className="font-semibold text-sm">
                                                    ₹{product.price_per_unit.toFixed(2)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    per {product.unit}
                                                </div>
                                            </TableCell>

                                            {/* Status Column */}
                                            <TableCell>
                                                {isActive ? (
                                                    <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs font-medium">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                        Available
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 gap-1.5 text-xs font-medium">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                        Unavailable
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            {/* Actions Column */}
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleToggleAvailability(product.id, isActive, product.name)}
                                                        title={isActive ? "Mark Unavailable" : "Mark Available"}
                                                        className="h-8 px-2 text-xs"
                                                    >
                                                        {isActive ? (
                                                            <>
                                                                <EyeOff className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                                                                <span className="hidden lg:inline">Make Unavailable</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-3.5 h-3.5 mr-1 text-green-600" />
                                                                <span className="hidden lg:inline text-green-600">Make Available</span>
                                                            </>
                                                        )}
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOpenEditDialog(product)}
                                                        className="h-8 gap-1 text-xs"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                        Edit
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* MOBILE VIEW: RESPONSIVE CARDS */}
                    <div className="grid grid-cols-1 gap-3 md:hidden">
                        {filteredProducts.map((product) => {
                            const isActive = Boolean(product.is_active);
                            return (
                                <Card key={product.id} className="p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-16 h-16 rounded-lg bg-muted border overflow-hidden flex items-center justify-center text-2xl flex-shrink-0">
                                            {product.image_url ? (
                                                <img
                                                    src={product.image_url}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLElement).style.display = "none";
                                                        const sib = (e.currentTarget as HTMLElement).nextElementSibling;
                                                        if (sib) (sib as HTMLElement).style.display = "flex";
                                                    }}
                                                />
                                            ) : null}
                                            <span
                                                className="w-full h-full items-center justify-center text-2xl"
                                                style={{ display: product.image_url ? "none" : "flex" }}
                                            >
                                                🥛
                                            </span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-1">
                                                <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                                                {isActive ? (
                                                    <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0 h-5">
                                                        Available
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                                                        Unavailable
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[10px] capitalize">
                                                    {product.category}
                                                </Badge>
                                                <span className="text-xs font-bold text-primary">
                                                    ₹{product.price_per_unit.toFixed(2)} / {product.unit}
                                                </span>
                                            </div>
                                            {product.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                                    {product.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleToggleAvailability(product.id, isActive, product.name)}
                                            className="flex-1 text-xs h-8"
                                        >
                                            {isActive ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1 text-green-600" />}
                                            {isActive ? "Set Unavailable" : "Set Available"}
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="default"
                                            onClick={() => handleOpenEditDialog(product)}
                                            className="flex-1 text-xs h-8"
                                        >
                                            <Edit className="w-3.5 h-3.5 mr-1" />
                                            Edit
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ADD / EDIT PRODUCT DIALOG */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl">
                            {editMode ? "Edit Product" : "Add New Dairy Product"}
                        </DialogTitle>
                        <DialogDescription>
                            {editMode
                                ? "Update product details, pricing, availability, and image."
                                : "Fill in the details to add a new product to the customer catalog."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="product-name" className="text-xs font-semibold">
                                Product Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="product-name"
                                value={formName}
                                onChange={(e) => {
                                    setFormName(e.target.value);
                                    if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                                }}
                                placeholder="e.g. Buffalo Milk, Fresh Paneer"
                                className={formErrors.name ? "border-destructive" : ""}
                            />
                            {formErrors.name && (
                                <p className="text-xs text-destructive">{formErrors.name}</p>
                            )}
                        </div>

                        {/* Category & Unit */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="product-category" className="text-xs font-semibold">
                                    Category <span className="text-destructive">*</span>
                                </Label>
                                <Select value={formCategory} onValueChange={setFormCategory}>
                                    <SelectTrigger id="product-category">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORY_OPTIONS.map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="product-unit" className="text-xs font-semibold">
                                    Unit <span className="text-destructive">*</span>
                                </Label>
                                <Select value={formUnit} onValueChange={setFormUnit}>
                                    <SelectTrigger id="product-unit">
                                        <SelectValue placeholder="Select Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {UNIT_OPTIONS.map((u) => (
                                            <SelectItem key={u.value} value={u.value}>
                                                {u.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Price & Availability */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="product-price" className="text-xs font-semibold">
                                    Price per Unit (₹) <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="product-price"
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={formPrice}
                                    onChange={(e) => {
                                        setFormPrice(e.target.value);
                                        if (formErrors.price) setFormErrors({ ...formErrors, price: "" });
                                    }}
                                    placeholder="e.g. 70"
                                    className={formErrors.price ? "border-destructive" : ""}
                                />
                                {formErrors.price && (
                                    <p className="text-xs text-destructive">{formErrors.price}</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Availability Status</Label>
                                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`w-2.5 h-2.5 rounded-full ${
                                                formIsActive ? "bg-green-500" : "bg-red-500"
                                            }`}
                                        />
                                        <span className="text-sm font-medium">
                                            {formIsActive ? "Available" : "Unavailable"}
                                        </span>
                                    </div>
                                    <Switch
                                        checked={formIsActive}
                                        onCheckedChange={setFormIsActive}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <Label htmlFor="product-description" className="text-xs font-semibold">
                                Description (Optional)
                            </Label>
                            <Textarea
                                id="product-description"
                                value={formDescription}
                                onChange={(e) => setFormDescription(e.target.value)}
                                placeholder="Pure farm fresh dairy product delivered daily to your doorstep."
                                rows={2}
                                className="text-sm"
                            />
                        </div>

                        {/* PRODUCT IMAGE PICKER */}
                        <div className="pt-2 border-t">
                            <ProductImagePicker
                                currentImageUrl={formImageUrl}
                                productName={formName}
                                category={formCategory}
                                onImageSelected={(url) => setFormImageUrl(url)}
                                onImageRemoved={() => setFormImageUrl(null)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDialogOpen(false)}
                            disabled={createProduct.isPending || updateProduct.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSaveProduct}
                            disabled={createProduct.isPending || updateProduct.isPending}
                            className="gap-2"
                        >
                            {(createProduct.isPending || updateProduct.isPending) && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            {editMode ? "Save Changes" : "Create Product"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProductManagement;
