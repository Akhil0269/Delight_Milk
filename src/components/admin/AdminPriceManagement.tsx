import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, History, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useProductPrices, usePriceHistory } from '@/hooks/usePricing';
import { addNewPrice, validatePriceChange, ProductPrice } from '@/utils/pricing';
import { toast } from 'sonner';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const AdminPriceManagement = () => {
    const { prices } = useProductPrices();
    const { history } = usePriceHistory();

    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        product_id: '',
        product_name: '',
        regular_price: '',
        subscription_price: '',
        effective_from: '',
        notes: '',
    });

    const products = [
        { id: 'prod_buffalo_milk', name: 'Buffalo Milk' },
        { id: 'prod_cow_milk', name: 'Cow Milk' },
        { id: 'prod_curd', name: 'Curd' },
        { id: 'prod_ghee', name: 'Ghee' },
        { id: 'prod_paneer', name: 'Paneer' },
        { id: 'prod_butter', name: 'Butter' },
        { id: 'prod_cheese', name: 'Cheese' },
    ];

    const handleProductChange = (productId: string) => {
        const product = products.find(p => p.id === productId);
        setFormData({
            ...formData,
            product_id: productId,
            product_name: product?.name || '',
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form
        if (!formData.product_id || !formData.regular_price || !formData.subscription_price || !formData.effective_from) {
            toast.error('Please fill in all required fields');
            return;
        }

        const newPrice = {
            product_id: formData.product_id,
            product_name: formData.product_name,
            regular_price: parseFloat(formData.regular_price),
            subscription_price: parseFloat(formData.subscription_price),
            effective_from: formData.effective_from,
            is_active: true,
            notes: formData.notes,
        };

        // Validate price change
        const validation = validatePriceChange(newPrice, prices);

        if (!validation.isValid) {
            toast.error('Validation Failed', {
                description: validation.errors.join('. ')
            });
            return;
        }

        // Show warnings if any
        if (validation.warnings.length > 0) {
            toast.warning('Price Change Warnings', {
                description: validation.warnings.join('. ')
            });
        }

        // Add price
        const result = addNewPrice(newPrice, 'Admin'); // In production, use actual admin name

        if (result.success) {
            toast.success('Price Updated!', {
                description: result.message
            });

            // Reset form
            setFormData({
                product_id: '',
                product_name: '',
                regular_price: '',
                subscription_price: '',
                effective_from: '',
                notes: '',
            });
            setShowAddForm(false);

            // Trigger storage event to update other hooks
            window.dispatchEvent(new Event('storage'));
        } else {
            toast.error('Failed to Update Price', {
                description: result.message
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold">Price Management</h2>
                    <p className="text-muted-foreground">Manage product pricing with future-only changes</p>
                </div>
                <Button onClick={() => setShowAddForm(!showAddForm)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Price
                </Button>
            </div>

            {/* Safety Notice */}
            <Card className="border-orange-200 bg-orange-50">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-700 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-orange-900 mb-1">Safe Pricing Rules</h4>
                            <ul className="text-sm text-orange-800 space-y-1">
                                <li>• Prices must have an "Effective From Date" in the <strong>future</strong></li>
                                <li>• New prices apply ONLY to future calendar dates</li>
                                <li>• Past calendar entries and receipts are <strong>NEVER modified</strong></li>
                                <li>• All price changes are logged with full audit trail</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add Price Form */}
            {showAddForm && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>Add New Price</CardTitle>
                            <CardDescription>Set future pricing for a product</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Product Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="product">Product *</Label>
                                    <Select value={formData.product_id} onValueChange={handleProductChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map(product => (
                                                <SelectItem key={product.id} value={product.id}>
                                                    {product.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Pricing */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="regular_price">Regular Price (₹) *</Label>
                                        <Input
                                            id="regular_price"
                                            type="number"
                                            step="0.01"
                                            value={formData.regular_price}
                                            onChange={(e) => setFormData({ ...formData, regular_price: e.target.value })}
                                            placeholder="100.00"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="subscription_price">Subscription Price (₹) *</Label>
                                        <Input
                                            id="subscription_price"
                                            type="number"
                                            step="0.01"
                                            value={formData.subscription_price}
                                            onChange={(e) => setFormData({ ...formData, subscription_price: e.target.value })}
                                            placeholder="90.00"
                                        />
                                    </div>
                                </div>

                                {/* Effective Date */}
                                <div className="space-y-2">
                                    <Label htmlFor="effective_from">Effective From Date *</Label>
                                    <Input
                                        id="effective_from"
                                        type="date"
                                        value={formData.effective_from}
                                        onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Must be a future date. Past dates are not allowed.
                                    </p>
                                </div>

                                {/* Notes */}
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes (Optional)</Label>
                                    <Textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Reason for price change..."
                                    />
                                </div>

                                {/* Submit */}
                                <div className="flex gap-2">
                                    <Button type="submit" className="flex-1">
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Save Price
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Current Prices */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Prices</CardTitle>
                    <CardDescription>Active pricing for all products</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {products.map(product => {
                            const currentPrice = prices
                                .filter(p => p.product_id === product.id && p.is_active)
                                .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())[0];

                            return (
                                <div key={product.id} className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold">{product.name}</h4>
                                        <span className="text-sm text-muted-foreground">
                                            Since {currentPrice ? new Date(currentPrice.effective_from).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                    {currentPrice ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Regular</p>
                                                <p className="text-2xl font-bold">₹{currentPrice.regular_price.toFixed(2)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Subscription</p>
                                                <p className="text-2xl font-bold text-green-600">₹{currentPrice.subscription_price.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No pricing set</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Price History */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Price Change History
                    </CardTitle>
                    <CardDescription>Audit log of all price changes</CardDescription>
                </CardHeader>
                <CardContent>
                    {history.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No price changes yet</p>
                    ) : (
                        <div className="space-y-3">
                            {history.slice().reverse().map((entry, index) => (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="p-4 border rounded-lg bg-muted/30"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h5 className="font-semibold">{entry.product_name}</h5>
                                            <p className="text-sm text-muted-foreground">
                                                Changed by {entry.changed_by} on {new Date(entry.changed_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                            Effective: {new Date(entry.effective_from).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Regular Price</p>
                                            <p>
                                                {entry.old_regular_price !== undefined && (
                                                    <span className="line-through text-muted-foreground mr-2">
                                                        ₹{entry.old_regular_price.toFixed(2)}
                                                    </span>
                                                )}
                                                <span className="font-semibold">₹{entry.new_regular_price.toFixed(2)}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Subscription Price</p>
                                            <p>
                                                {entry.old_subscription_price !== undefined && (
                                                    <span className="line-through text-muted-foreground mr-2">
                                                        ₹{entry.old_subscription_price.toFixed(2)}
                                                    </span>
                                                )}
                                                <span className="font-semibold text-green-600">₹{entry.new_subscription_price.toFixed(2)}</span>
                                            </p>
                                        </div>
                                    </div>
                                    {entry.reason && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Reason: {entry.reason}
                                        </p>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminPriceManagement;
