// Product Management Page - Admin can manage products
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAdminProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Eye, EyeOff, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const ProductManagement = () => {
    const { data: products, isLoading } = useAdminProducts();
    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();
    const deleteProduct = useDeleteProduct();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<string | null>(null);
    const [productForm, setProductForm] = useState({
        product_name: "",
        category: "milk",
        price_per_unit: "",
        unit: "L",
        description: "",
        is_available: true,
    });

    const handleAddProduct = () => {
        setEditMode(false);
        setProductForm({
            product_name: "",
            category: "milk",
            price_per_unit: "",
            unit: "L",
            description: "",
            is_available: true,
        });
        setDialogOpen(true);
    };

    const handleEditProduct = (product: any) => {
        setEditMode(true);
        setSelectedProduct(product);
        setProductForm({
            product_name: product.product_name,
            category: product.category,
            price_per_unit: product.price_per_unit.toString(),
            unit: product.unit,
            description: product.description || "",
            is_available: product.is_available,
        });
        setDialogOpen(true);
    };

    const handleDeleteClick = (productId: string) => {
        setProductToDelete(productId);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (productToDelete) {
            deleteProduct.mutate(productToDelete);
            setDeleteConfirmOpen(false);
            setProductToDelete(null);
        }
    };

    const handleSaveProduct = () => {
        const productData = {
            ...productForm,
            price_per_unit: parseFloat(productForm.price_per_unit),
        };

        if (editMode && selectedProduct) {
            updateProduct.mutate({
                productId: selectedProduct.id,
                updates: productData,
            });
        } else {
            createProduct.mutate(productData);
        }
        setDialogOpen(false);
    };

    const handleToggleAvailability = (productId: string, currentStatus: boolean) => {
        updateProduct.mutate({
            productId,
            updates: { is_available: !currentStatus },
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Product Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage dairy products and pricing
                    </p>
                </div>
                <Button onClick={handleAddProduct}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                </Button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="p-6">
                            <Skeleton className="h-32 w-full" />
                        </Card>
                    ))
                ) : products && products.length > 0 ? (
                    products.map((product) => (
                        <Card key={product.id} className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-lg">{product.product_name}</h3>
                                    <Badge variant="secondary" className="mt-1">
                                        {product.category}
                                    </Badge>
                                </div>
                                <div className="flex gap-2">
                                    <Badge variant={product.is_available ? "default" : "destructive"}>
                                        {product.is_available ? "Available" : "Out of Stock"}
                                    </Badge>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive/90 -mt-1 -mr-2"
                                        onClick={() => handleDeleteClick(product.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Price:</span>
                                    <span className="font-semibold">₹{product.price_per_unit}/{product.unit}</span>
                                </div>
                                {product.description && (
                                    <p className="text-sm text-muted-foreground">{product.description}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditProduct(product)}
                                    className="flex-1"
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                                <Button
                                    size="sm"
                                    variant={product.is_available ? "destructive" : "default"}
                                    onClick={() => handleToggleAvailability(product.id, product.is_available)}
                                    className="flex-1"
                                >
                                    {product.is_available ? (
                                        <>
                                            <EyeOff className="w-4 h-4 mr-2" />
                                            Hide
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-4 h-4 mr-2" />
                                            Show
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="p-12 col-span-full text-center">
                        <p className="text-muted-foreground">No products found. Add your first product!</p>
                    </Card>
                )}
            </div>

            {/* Product Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editMode ? "Edit Product" : "Add New Product"}</DialogTitle>
                        <DialogDescription>
                            {editMode ? "Update product details" : "Create a new dairy product"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label>Product Name</Label>
                            <Input
                                value={productForm.product_name}
                                onChange={(e) => setProductForm({ ...productForm, product_name: e.target.value })}
                                placeholder="e.g., Cow Milk"
                            />
                        </div>
                        <div>
                            <Label>Category</Label>
                            <Select
                                value={productForm.category}
                                onValueChange={(value) => setProductForm({ ...productForm, category: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="milk">Milk</SelectItem>
                                    <SelectItem value="curd">Curd</SelectItem>
                                    <SelectItem value="butter">Butter</SelectItem>
                                    <SelectItem value="ghee">Ghee</SelectItem>
                                    <SelectItem value="paneer">Paneer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Price per Unit</Label>
                                <Input
                                    type="number"
                                    value={productForm.price_per_unit}
                                    onChange={(e) => setProductForm({ ...productForm, price_per_unit: e.target.value })}
                                    placeholder="60"
                                />
                            </div>
                            <div>
                                <Label>Unit</Label>
                                <Select
                                    value={productForm.unit}
                                    onValueChange={(value) => setProductForm({ ...productForm, unit: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="L">Liter (L)</SelectItem>
                                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                        <SelectItem value="g">Gram (g)</SelectItem>
                                        <SelectItem value="piece">Piece</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Description (Optional)</Label>
                            <Input
                                value={productForm.description}
                                onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                                placeholder="Fresh cow milk"
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={handleSaveProduct} className="flex-1">
                                {editMode ? "Update" : "Create"} Product
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Product?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this product? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmDelete}>
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProductManagement;
