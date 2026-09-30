import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    MapPin,
    Plus,
    Edit,
    Trash2,
    Home,
    Briefcase,
    MapPinned,
    Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

interface Address {
    id: string;
    type: "home" | "work" | "other";
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
}

const AddressManagement = () => {
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState<Address[]>([
        {
            id: "1",
            type: "home",
            name: "John Doe",
            phone: "9876543210",
            addressLine1: "123 Main Street",
            addressLine2: "Apartment 4B",
            landmark: "Near City Mall",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400001",
            isDefault: true,
        },
    ]);

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [formData, setFormData] = useState<Partial<Address>>({
        type: "home",
        isDefault: false,
    });

    const handleAddAddress = () => {
        if (!formData.name || !formData.phone || !formData.addressLine1 || !formData.city || !formData.pincode) {
            toast.error("Please fill all required fields");
            return;
        }

        const newAddress: Address = {
            id: Date.now().toString(),
            type: formData.type as "home" | "work" | "other",
            name: formData.name,
            phone: formData.phone,
            addressLine1: formData.addressLine1,
            addressLine2: formData.addressLine2,
            landmark: formData.landmark,
            city: formData.city,
            state: formData.state || "",
            pincode: formData.pincode,
            isDefault: formData.isDefault || false,
        };

        if (newAddress.isDefault) {
            setAddresses(prev => prev.map(addr => ({ ...addr, isDefault: false })));
        }

        setAddresses(prev => [...prev, newAddress]);
        setShowAddDialog(false);
        setFormData({ type: "home", isDefault: false });
        toast.success("Address added successfully");
    };

    const handleUpdateAddress = () => {
        if (!editingAddress) return;

        setAddresses(prev =>
            prev.map(addr =>
                addr.id === editingAddress.id
                    ? { ...editingAddress, ...formData }
                    : formData.isDefault
                        ? { ...addr, isDefault: false }
                        : addr
            )
        );

        setEditingAddress(null);
        setFormData({ type: "home", isDefault: false });
        toast.success("Address updated successfully");
    };

    const handleDeleteAddress = (id: string) => {
        setAddresses(prev => prev.filter(addr => addr.id !== id));
        toast.success("Address deleted successfully");
    };

    const handleSetDefault = (id: string) => {
        setAddresses(prev =>
            prev.map(addr => ({
                ...addr,
                isDefault: addr.id === id,
            }))
        );
        toast.success("Default address updated");
    };

    const getAddressIcon = (type: string) => {
        switch (type) {
            case "home":
                return Home;
            case "work":
                return Briefcase;
            default:
                return MapPinned;
        }
    };

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate("/dashboard")}
                                className="text-white hover:bg-white/20"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">Delivery Addresses</h1>
                                <p className="text-white/80 text-sm">Manage your delivery locations</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setShowAddDialog(true)}
                            className="bg-white text-primary hover:bg-white/90"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {addresses.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                    >
                        <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Addresses Added</h3>
                        <p className="text-muted-foreground mb-6">Add your first delivery address to get started</p>
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Address
                        </Button>
                    </motion.div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {addresses.map((address, index) => {
                            const Icon = getAddressIcon(address.type);
                            return (
                                <motion.div
                                    key={address.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="relative hover:shadow-lg transition-shadow">
                                        {address.isDefault && (
                                            <Badge className="absolute top-4 right-4 bg-green-500">
                                                <Check className="w-3 h-3 mr-1" />
                                                Default
                                            </Badge>
                                        )}
                                        <CardContent className="p-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                    <Icon className="w-6 h-6 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-semibold text-lg">{address.name}</h3>
                                                        <Badge variant="outline" className="capitalize">
                                                            {address.type}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-1">{address.phone}</p>
                                                    <p className="text-sm">
                                                        {address.addressLine1}
                                                        {address.addressLine2 && `, ${address.addressLine2}`}
                                                    </p>
                                                    {address.landmark && (
                                                        <p className="text-sm text-muted-foreground">
                                                            Landmark: {address.landmark}
                                                        </p>
                                                    )}
                                                    <p className="text-sm">
                                                        {address.city}, {address.state} - {address.pincode}
                                                    </p>

                                                    <div className="flex gap-2 mt-4">
                                                        {!address.isDefault && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleSetDefault(address.id)}
                                                            >
                                                                Set as Default
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingAddress(address);
                                                                setFormData(address);
                                                            }}
                                                        >
                                                            <Edit className="w-4 h-4 mr-1" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDeleteAddress(address.id)}
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-1" />
                                                            Delete
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Add/Edit Address Dialog */}
            <Dialog open={showAddDialog || !!editingAddress} onOpenChange={(open) => {
                if (!open) {
                    setShowAddDialog(false);
                    setEditingAddress(null);
                    setFormData({ type: "home", isDefault: false });
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingAddress ? "Edit Address" : "Add New Address"}</DialogTitle>
                        <DialogDescription>
                            {editingAddress ? "Update your delivery address details" : "Enter your delivery address details"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name">Full Name *</Label>
                                <Input
                                    id="name"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone">Phone Number *</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone || ""}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="9876543210"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Address Type *</Label>
                            <RadioGroup
                                value={formData.type}
                                onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                                className="flex gap-4 mt-2"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="home" id="home" />
                                    <Label htmlFor="home" className="cursor-pointer">Home</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="work" id="work" />
                                    <Label htmlFor="work" className="cursor-pointer">Work</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="other" id="other" />
                                    <Label htmlFor="other" className="cursor-pointer">Other</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div>
                            <Label htmlFor="addressLine1">Address Line 1 *</Label>
                            <Input
                                id="addressLine1"
                                value={formData.addressLine1 || ""}
                                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                                placeholder="House No., Building Name"
                            />
                        </div>

                        <div>
                            <Label htmlFor="addressLine2">Address Line 2</Label>
                            <Input
                                id="addressLine2"
                                value={formData.addressLine2 || ""}
                                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                                placeholder="Road Name, Area, Colony"
                            />
                        </div>

                        <div>
                            <Label htmlFor="landmark">Landmark</Label>
                            <Input
                                id="landmark"
                                value={formData.landmark || ""}
                                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                                placeholder="Near City Mall"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="city">City *</Label>
                                <Input
                                    id="city"
                                    value={formData.city || ""}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Mumbai"
                                />
                            </div>
                            <div>
                                <Label htmlFor="state">State</Label>
                                <Input
                                    id="state"
                                    value={formData.state || ""}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    placeholder="Maharashtra"
                                />
                            </div>
                            <div>
                                <Label htmlFor="pincode">Pincode *</Label>
                                <Input
                                    id="pincode"
                                    value={formData.pincode || ""}
                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                    placeholder="400001"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                checked={formData.isDefault}
                                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                className="rounded border-gray-300"
                            />
                            <Label htmlFor="isDefault" className="cursor-pointer">
                                Set as default delivery address
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAddDialog(false);
                                setEditingAddress(null);
                                setFormData({ type: "home", isDefault: false });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={editingAddress ? handleUpdateAddress : handleAddAddress}>
                            {editingAddress ? "Update Address" : "Add Address"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AddressManagement;
