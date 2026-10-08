import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    MapPin,
    Plus,
    Edit,
    Home,
    Check,
    Loader2,
    Phone,
    User,
    Trash2,
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { isValidIndianPhone, isValidIndianPincode } from "@/lib/utils";

const AddressManagement = () => {
    const navigate = useNavigate();
    const { data: profile, isLoading, error } = useProfile();
    const updateProfile = useUpdateProfile();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        address: "",
        pincode: "",
    });

    useEffect(() => {
        if (profile) {
            // Extract trailing 6-digit pincode if present
            const pinMatch = profile.address?.match(/\b([1-9][0-9]{5})\b$/);
            setFormData({
                full_name: profile.full_name || "",
                phone: profile.phone || "",
                address: profile.address || "",
                pincode: pinMatch ? pinMatch[1] : "",
            });
        }
    }, [profile]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedAddress = formData.address.trim();

        if (!trimmedAddress) {
            toast.error("Please enter your complete delivery address");
            return;
        }

        if (trimmedAddress.length < 5) {
            toast.error("Address must be at least 5 characters long");
            return;
        }

        // Validate Indian Phone if provided
        if (formData.phone.trim() && !isValidIndianPhone(formData.phone)) {
            toast.error("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)");
            return;
        }

        // Validate Pincode if provided
        if (formData.pincode.trim() && !isValidIndianPincode(formData.pincode)) {
            toast.error("Please enter a valid 6-digit Indian PIN code (e.g. 560066)");
            return;
        }

        // Append pincode if entered and not already in address
        let finalAddress = trimmedAddress;
        if (formData.pincode.trim() && !finalAddress.includes(formData.pincode.trim())) {
            finalAddress = `${finalAddress} - ${formData.pincode.trim()}`;
        }

        try {
            await updateProfile.mutateAsync({
                full_name: formData.full_name.trim() || null,
                phone: formData.phone.trim() || null,
                address: finalAddress,
            });
            toast.success("Delivery address saved successfully");
            setIsDialogOpen(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to save address";
            toast.error(message);
        }
    };

    const handleDeleteAddress = async () => {
        try {
            await updateProfile.mutateAsync({
                address: null,
            });
            toast.success("Delivery address removed");
            setIsDeleteDialogOpen(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete address";
            toast.error(message);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30">
            <DashboardNavbar />

            {/* Header */}
            <div className="bg-card border-b sticky top-16 md:top-20 z-30">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(-1)}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">Manage Delivery Addresses</h1>
                                <p className="text-sm text-muted-foreground">
                                    Primary address for your morning milk & dairy delivery
                                </p>
                            </div>
                        </div>

                        {profile?.address && (
                            <Button
                                onClick={() => setIsDialogOpen(true)}
                                size="sm"
                                className="flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Edit Address
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p>Loading your saved address...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-16 bg-card rounded-2xl border p-8">
                        <p className="text-destructive font-medium mb-2">Unable to load profile address</p>
                        <p className="text-sm text-muted-foreground mb-4">
                            Please check your network connection and try again.
                        </p>
                        <Button variant="outline" onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                    </div>
                ) : !profile?.address ? (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20 bg-card rounded-2xl border p-8 shadow-sm"
                    >
                        <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-4">
                            <MapPin className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">No Delivery Address Set</h2>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                            Add your house, apartment, or society address to receive fresh farm milk before 7:00 AM every morning.
                        </p>
                        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Delivery Address
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <Card className="border-2 border-primary/20 shadow-sm relative overflow-hidden">
                            <div className="h-1.5 bg-primary w-full absolute top-0 left-0" />
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-600 text-xs">
                                                <Check className="w-3 h-3" />
                                                Primary Delivery Address
                                            </Badge>
                                            <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                                <Home className="w-3 h-3" />
                                                Home
                                            </Badge>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-foreground font-semibold">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span>{profile.full_name || "Valued Customer"}</span>
                                            </div>
                                            {profile.phone && (
                                                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                    <Phone className="w-4 h-4" />
                                                    <span>{profile.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-start gap-2 pt-2 border-t text-sm">
                                            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                            <p className="text-foreground leading-relaxed whitespace-pre-line">
                                                {profile.address}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsDialogOpen(true)}
                                            className="gap-1.5"
                                        >
                                            <Edit className="w-3.5 h-3.5" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                            className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="p-4 bg-muted/40 rounded-xl border text-xs text-muted-foreground flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                            <span>
                                This address is automatically linked to your subscriptions and morning 7:00 AM delivery runs.
                            </span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Edit / Add Address Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {profile?.address ? "Edit Delivery Address" : "Add Delivery Address"}
                        </DialogTitle>
                        <DialogDescription>
                            Your daily deliveries will arrive at this location.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Recipient Name</Label>
                            <Input
                                id="full_name"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder="e.g. Priya Sharma"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Contact Phone Number</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="e.g. +91 9876543210"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pincode">PIN Code (6 digits)</Label>
                            <Input
                                id="pincode"
                                maxLength={6}
                                value={formData.pincode}
                                onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '') })}
                                placeholder="e.g. 560066"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Full Address / Flat / Building / Street / Landmark *</Label>
                            <Textarea
                                id="address"
                                required
                                rows={4}
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Flat 402, Sunshine Towers, 14th Main, Near City Mall, Whitefield, Bengaluru"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                                disabled={updateProfile.isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateProfile.isPending} className="gap-2">
                                {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Address
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Address Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Delivery Address?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove your saved delivery address? You will need to enter an address again before placing new orders or renewing subscriptions.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={updateProfile.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteAddress();
                            }}
                            disabled={updateProfile.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {updateProfile.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Delete Address
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AddressManagement;
