import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Eye, EyeOff, Package, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface Product {
    id: string;
    name: string;
    description: string;
    category: string;
    unit: string;
    regular_price: number;
    subscription_price: number;
    image_url: string;
    is_active: boolean;
    is_featured: boolean;
    subscription_enabled: boolean;
    addon_product: boolean;
    stock_status: string;
}

const INITIAL_PRODUCTS: Product[] = [
    {
        id: 'prod_buffalo_milk',
        name: 'Buffalo Milk',
        description: 'Fresh farm buffalo milk, rich in protein and calcium',
        category: 'Milk',
        unit: 'L',
        regular_price: 100,
        subscription_price: 90,
        image_url: '/images/buffalo-milk.jpg',
        is_active: true,
        is_featured: true,
        subscription_enabled: true,
        addon_product: false,
        stock_status: 'in_stock',
    },
    {
        id: 'prod_cow_milk',
        name: 'Cow Milk',
        description: 'Pure and fresh cow milk, ideal for daily consumption',
        category: 'Milk',
        unit: 'L',
        regular_price: 70,
        subscription_price: 60,
        image_url: '/images/cow-milk.jpg',
        is_active: true,
        is_featured: true,
        subscription_enabled: true,
        addon_product: false,
        stock_status: 'in_stock',
    },
    {
        id: 'prod_curd',
        name: 'Fresh Curd',
        description: 'Creamy homemade-style curd, rich in probiotics',
        category: 'Dairy',
        unit: 'kg',
        regular_price: 150,
        subscription_price: 150,
        image_url: '/images/curd.jpg',
        is_active: true,
        is_featured: true,
        subscription_enabled: true,
        addon_product: false,
        stock_status: 'in_stock',
    },
    {
        id: 'prod_ghee',
        name: 'Pure Desi Ghee',
        description: 'Traditional hand-churned ghee made from pure buffalo butter',
        category: 'Dairy',
        unit: 'kg',
        regular_price: 999,
        subscription_price: 999,
        image_url: '/images/ghee.jpg',
        is_active: true,
        is_featured: true,
        subscription_enabled: false,
        addon_product: true,
        stock_status: 'in_stock',
    },
    {
        id: 'prod_paneer',
        name: 'Fresh Paneer',
        description: 'Soft and fresh paneer made daily from pure milk',
        category: 'Dairy',
        unit: 'kg',
        regular_price: 350,
        subscription_price: 320,
        image_url: '/images/paneer.jpg',
        is_active: true,
        is_featured: false,
        subscription_enabled: true,
        addon_product: false,
        stock_status: 'in_stock',
    },
    {
        id: 'prod_butter',
        name: 'Pure Butter',
        description: 'Creamy fresh butter churned from pure cream',
        category: 'Dairy',
        unit: 'kg',
        regular_price: 450,
        subscription_price: 450,
        image_url: '/images/butter.jpg',
        is_active: true,
        is_featured: false,
        subscription_enabled: false,
        addon_product: true,
        stock_status: 'in_stock',
    },
    {
        id: 'prod_cheese',
        name: 'Cheddar Cheese',
        description: 'Premium quality cheddar cheese',
        category: 'Dairy',
        unit: 'kg',
        regular_price: 600,
        subscription_price: 600,
        image_url: '/images/cheese.jpg',
        is_active: true,
        is_featured: false,
        subscription_enabled: false,
        addon_product: true,
        stock_status: 'in_stock',
    },
];

const AdminProductManagement = () => {
    const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
    const [showDialog, setShowDialog] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '',
        description: '',
        category: 'Milk',
        unit: 'L',
        regular_price: 0,
        subscription_price: 0,
        image_url: '',
        is_active: true,
        is_featured: false,
        subscription_enabled: true,
        addon_product: false,
        stock_status: 'in_stock',
    });

    const handleAddProduct = () => {
        setEditingProduct(null);
        setFormData({
            name: '',
            description: '',
            category: 'Milk',
            unit: 'L',
            regular_price: 0,
            subscription_price: 0,
            image_url: '',
            is_active: true,
            is_featured: false,
            subscription_enabled: true,
            addon_product: false,
            stock_status: 'in_stock',
        });
        setShowDialog(true);
    };

    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setFormData(product);
        setShowDialog(true);
    };

    const handleSaveProduct = () => {
        // Validation
        if (!formData.name || !formData.category || !formData.unit) {
            toast.error('Please fill in all required fields');
            return;
        }

        if ((formData.regular_price || 0) <= 0) {
            toast.error('Regular price must be greater than 0');
            return;
        }

        if ((formData.subscription_price || 0) > (formData.regular_price || 0)) {
            toast.error('Subscription price cannot be higher than regular price');
            return;
        }

        if (editingProduct) {
            // Update existing product
            setProducts(products.map(p =>
                p.id === editingProduct.id ? { ...p, ...formData } : p
            ));
            toast.success('Product updated successfully!');
        } else {
            // Add new product
            const newProduct: Product = {
                id: `prod_${Date.now()}`,
                ...formData as Product,
            };
            setProducts([...products, newProduct]);
            toast.success('Product added successfully!');
        }

        setShowDialog(false);
    };

    const handleToggleActive = (productId: string) => {
        setProducts(products.map(p =>
            p.id === productId ? { ...p, is_active: !p.is_active } : p
        ));
        const product = products.find(p => p.id === productId);
        toast.success(`${product?.name} ${product?.is_active ? 'disabled' : 'enabled'}`);
    };

    const handleDeleteProduct = (productId: string) => {
        const product = products.find(p => p.id === productId);
        if (window.confirm(`Are you sure you want to delete ${product?.name}?`)) {
            setProducts(products.filter(p => p.id !== productId));
            toast.success('Product deleted successfully');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Product Management</h2>
                    <p className="text-muted-foreground">Manage dairy products and pricing</p>
                </div>
                <Button onClick={handleAddProduct}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                </Button>
            </div>

            {/* Information Banner */}
            <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-blue-900 mb-1">Product Management Guidelines</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• Set both <strong>Regular</strong> and <strong>Subscription</strong> prices</li>
                                <li>• Mark products as subscription-enabled for daily delivery</li>
                                <li>• Add-on products are one-time purchases only</li>
                                <li>• Price changes should be made via Price Management for audit trail</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                    <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className={`h-full ${!product.is_active ? 'opacity-60' : ''}`}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="flex items-center gap-2">
                                            {product.name}
                                            {!product.is_active && (
                                                <Badge variant="secondary">Disabled</Badge>
                                            )}
                                            {product.is_featured && (
                                                <Badge className="bg-yellow-500">Featured</Badge>
                                            )}
                                        </CardTitle>
                                        <CardDescription className="mt-2">
                                            {product.description}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Category & Unit */}
                                <div className="flex gap-2">
                                    <Badge variant="outline">{product.category}</Badge>
                                    <Badge variant="outline">{product.unit}</Badge>
                                    {product.subscription_enabled && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700">
                                            Subscription
                                        </Badge>
                                    )}
                                    {product.addon_product && (
                                        <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                            <Package className="w-3 h-3 mr-1" />
                                            Add-on
                                        </Badge>
                                    )}
                                </div>

                                {/* Pricing */}
                                <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Regular Price:</span>
                                        <span className="font-semibold">₹{product.regular_price}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-muted-foreground">Subscription Price:</span>
                                        <span className="font-semibold text-green-600">
                                            ₹{product.subscription_price}
                                        </span>
                                    </div>
                                    {product.regular_price !== product.subscription_price && (
                                        <div className="text-xs text-green-600 font-medium pt-1 border-t">
                                            Save ₹{product.regular_price - product.subscription_price} (
                                            {(((product.regular_price - product.subscription_price) / product.regular_price) * 100).toFixed(1)}%)
                                        </div>
                                    )}
                                </div>

                                {/* Stock Status */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Stock:</span>
                                    <Badge
                                        variant={product.stock_status === 'in_stock' ? 'default' : 'destructive'}
                                    >
                                        {product.stock_status.replace('_', ' ')}
                                    </Badge>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleEditProduct(product)}
                                        className="flex-1"
                                    >
                                        <Edit className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleToggleActive(product.id)}
                                    >
                                        {product.is_active ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeleteProduct(product.id)}
                                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Add/Edit Product Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingProduct ? 'Edit Product' : 'Add New Product'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingProduct ? 'Update product details and pricing' : 'Create a new dairy product'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="name">Product Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Buffalo Milk"
                                />
                            </div>

                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Product description..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Milk">Milk</SelectItem>
                                        <SelectItem value="Dairy">Dairy</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="unit">Unit *</Label>
                                <Select
                                    value={formData.unit}
                                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="L">Litre (L)</SelectItem>
                                        <SelectItem value="kg">Kilogram (kg)</SelectItem>
                                        <SelectItem value="pack">Pack</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="regular_price">Regular Price (₹) *</Label>
                                <Input
                                    id="regular_price"
                                    type="number"
                                    step="0.01"
                                    value={formData.regular_price}
                                    onChange={(e) => setFormData({ ...formData, regular_price: parseFloat(e.target.value) })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subscription_price">Subscription Price (₹) *</Label>
                                <Input
                                    id="subscription_price"
                                    type="number"
                                    step="0.01"
                                    value={formData.subscription_price}
                                    onChange={(e) => setFormData({ ...formData, subscription_price: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        {/* Image */}
                        <div className="space-y-2">
                            <Label htmlFor="image_url">Image URL</Label>
                            <Input
                                id="image_url"
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="/images/product.jpg"
                            />
                        </div>

                        {/* Stock Status */}
                        <div className="space-y-2">
                            <Label htmlFor="stock_status">Stock Status</Label>
                            <Select
                                value={formData.stock_status}
                                onValueChange={(value) => setFormData({ ...formData, stock_status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in_stock">In Stock</SelectItem>
                                    <SelectItem value="low_stock">Low Stock</SelectItem>
                                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Switches */}
                        <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_active">Active</Label>
                                <Switch
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_featured">Featured</Label>
                                <Switch
                                    id="is_featured"
                                    checked={formData.is_featured}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="subscription_enabled">Subscription Enabled</Label>
                                <Switch
                                    id="subscription_enabled"
                                    checked={formData.subscription_enabled}
                                    onCheckedChange={(checked) => setFormData({ ...formData, subscription_enabled: checked })}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="addon_product">Add-on Product (One-time only)</Label>
                                <Switch
                                    id="addon_product"
                                    checked={formData.addon_product}
                                    onCheckedChange={(checked) => setFormData({ ...formData, addon_product: checked })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveProduct}>
                            {editingProduct ? 'Update Product' : 'Add Product'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminProductManagement;
