import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, User, Phone, MapPin, Save, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isValidIndianPhone } from "@/lib/utils";

const EditProfile = () => {
    const navigate = useNavigate();
    const { user, updateProfile: updateAuthMetadata } = useAuth();
    const { data: profile, isLoading, isError, error, refetch } = useProfile();
    const updateProfileMutation = useUpdateProfile();

    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || user?.user_metadata?.full_name || "");
            setPhone(profile.phone || user?.phone || "");
            setAddress(profile.address || "");
        } else if (user) {
            setFullName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
            setPhone(user.phone || "");
        }
    }, [profile, user]);

    const getInitials = (name?: string) => {
        if (!name) return "U";
        const parts = name.trim().split(" ");
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (profile?.is_blocked) {
            toast.error("Your account has been suspended. Profile updates are restricted.");
            return;
        }

        const trimmedName = fullName.trim();
        if (!trimmedName) {
            toast.error("Full name is required");
            return;
        }

        const trimmedPhone = phone.trim();
        if (trimmedPhone && !isValidIndianPhone(trimmedPhone)) {
            toast.error("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)");
            return;
        }

        setSaving(true);
        try {
            // 1. Update Supabase public.profiles table (safe whitelisted fields only)
            await updateProfileMutation.mutateAsync({
                full_name: trimmedName,
                phone: trimmedPhone || null,
                address: address.trim() || null,
            });

            // 2. Also sync auth user metadata if supported
            if (updateAuthMetadata) {
                await updateAuthMetadata({
                    full_name: trimmedName,
                    phone: trimmedPhone || undefined,
                });
            }

            toast.success("Profile updated successfully!");
            navigate("/profile");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update profile";
            toast.error(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background py-8">
            <div className="container mx-auto px-4 max-w-2xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate("/profile")}
                        className="rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Edit Profile</h1>
                        <p className="text-sm text-muted-foreground">
                            Update your personal information and contact details
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <Card className="p-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
                        <p className="text-muted-foreground">Loading profile details...</p>
                    </Card>
                ) : isError ? (
                    <Card className="p-12 text-center border-destructive/50">
                        <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
                        <h2 className="text-lg font-semibold mb-2">Unable to Load Profile</h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            {error?.message || "Failed to load profile data from the database."}
                        </p>
                        <Button onClick={() => refetch()}>Retry</Button>
                    </Card>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card>
                            <CardHeader className="text-center pb-2">
                                <div className="flex justify-center mb-3">
                                    <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={fullName} />
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-xl font-semibold">
                                            {getInitials(fullName)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <CardTitle>{user?.email}</CardTitle>
                                <CardDescription>Email address is managed by your account authentication</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-5 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="full_name"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                placeholder="Your full name"
                                                className="pl-10"
                                                disabled={saving}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="phone"
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="e.g. 9876543210"
                                                className="pl-10"
                                                disabled={saving}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Used for delivery notifications and driver contact
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="address">Delivery Address</Label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                                            <Textarea
                                                id="address"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                placeholder="Complete delivery address (house/flat no, street, landmark, city, pincode)"
                                                className="pl-10 min-h-[100px]"
                                                disabled={saving}
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Your primary morning delivery address
                                        </p>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => navigate("/profile")}
                                            className="w-1/2"
                                            disabled={saving}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="w-1/2"
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default EditProfile;
