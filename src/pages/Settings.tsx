import { useState } from "react";
import { motion } from "framer-motion";
import {
    User,
    MapPin,
    Calendar,
    CreditCard,
    Bell,
    Globe,
    Lock,
    Shield,
    LogOut,
    ArrowLeft,
    ChevronRight,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Eye,
    EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";

const Settings = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { data: profile } = useProfile();

    // Change Password Dialog State
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast.error("You must be logged in to update your password");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsUpdatingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) {
                toast.error(error.message || "Failed to update password");
                return;
            }

            toast.success("Password updated successfully!");
            setNewPassword("");
            setConfirmPassword("");
            setIsPasswordDialogOpen(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update password";
            toast.error(message);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut();
            toast.success("Logged out successfully");
            navigate("/auth");
        } catch {
            toast.error("Failed to log out");
        }
    };

    const settingsSections = [
        {
            title: "Profile & Identity",
            description: "Personal name, contact phone & email display",
            icon: User,
            color: "text-blue-500 bg-blue-500/10",
            path: "/profile",
            actionText: "View Profile",
        },
        {
            title: "Delivery Addresses",
            description: "Primary home address for daily 7:00 AM milk runs",
            icon: MapPin,
            color: "text-green-500 bg-green-500/10",
            path: "/settings/address",
            actionText: profile?.address ? "Manage" : "Add Address",
        },
        {
            title: "Daily Subscriptions",
            description: "Pause, resume, skip dates or adjust daily milk quantity",
            icon: Calendar,
            color: "text-purple-500 bg-purple-500/10",
            path: "/settings/subscriptions",
            actionText: "Manage Plans",
        },
        {
            title: "Payment Methods",
            description: "Delight Wallet prepaid balance, PhonePe & Cash on Delivery",
            icon: CreditCard,
            color: "text-amber-500 bg-amber-500/10",
            path: "/settings/payments",
            actionText: "Payment Modes",
        },
        {
            title: "Notification Preferences",
            description: "Control push alerts for orders, payments & morning deliveries",
            icon: Bell,
            color: "text-orange-500 bg-orange-500/10",
            path: "/settings/notifications",
            actionText: "Configure",
        },
        {
            title: "Language & Regional",
            description: "System interface language (English active, regional in dev)",
            icon: Globe,
            color: "text-cyan-500 bg-cyan-500/10",
            path: "/settings/language",
            actionText: "English",
        },
    ];

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
                                onClick={() => navigate("/dashboard")}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">Account Settings</h1>
                                <p className="text-sm text-muted-foreground">
                                    Manage your profile, preferences, and account security
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                            className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Log Out</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
                {/* Account Status Card */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="border shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-lg font-bold">
                                            {profile?.full_name || user?.user_metadata?.full_name || "Valued Customer"}
                                        </h2>
                                        {profile?.is_blocked ? (
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" />
                                                Account Suspended
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="flex items-center gap-1 bg-green-500/10 text-green-700 dark:text-green-400 border-green-200">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Active Account
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Registered Email: <span className="font-medium text-foreground">{user?.email || "N/A"}</span>
                                    </p>
                                    {profile?.phone && (
                                        <p className="text-xs text-muted-foreground">
                                            Primary Mobile: <span className="font-medium text-foreground">{profile.phone}</span>
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate("/profile/edit")}
                                    >
                                        Edit Profile
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => setIsPasswordDialogOpen(true)}
                                        className="gap-1.5"
                                    >
                                        <Lock className="w-3.5 h-3.5" />
                                        Change Password
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Settings Hub Cards Grid */}
                <div className="space-y-3">
                    <h3 className="text-base font-semibold">Preferences & Services</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {settingsSections.map((section, idx) => {
                            const IconComponent = section.icon;
                            return (
                                <motion.div
                                    key={section.path}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                >
                                    <Card
                                        className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group h-full flex flex-col justify-between"
                                        onClick={() => navigate(section.path)}
                                    >
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2.5 rounded-xl ${section.color} shrink-0 mt-0.5`}>
                                                        <IconComponent className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
                                                            {section.title}
                                                        </h4>
                                                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                            {section.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Security, Privacy & Compliance Disclosures */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="space-y-4"
                >
                    <h3 className="text-base font-semibold">Security & Compliance</h3>
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <CardTitle className="text-base">Authentication & Data Retention</CardTitle>
                            </div>
                            <CardDescription className="text-xs">
                                Information regarding security credentials and account status
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs text-muted-foreground">
                            <div className="p-3 bg-muted/40 rounded-lg border">
                                <p className="font-semibold text-foreground mb-1">Two-Factor Authentication (2FA)</p>
                                <p>
                                    Two-Factor Authentication is managed securely through your authentication provider. Ensure your registered email address remains active for secure login verification.
                                </p>
                            </div>

                            <div className="p-3 bg-muted/40 rounded-lg border">
                                <p className="font-semibold text-foreground mb-1">Account Deletion & Data Privacy</p>
                                <p>
                                    Automated self-service account deletion is not implemented to prevent accidental loss of active subscriptions and delivery ledger history. If you wish to permanently close your account or request data erasure under data protection laws, please contact our support team at <span className="font-medium text-foreground">support@delightmilk.com</span>.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Change Password Dialog */}
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" />
                            Update Account Password
                        </DialogTitle>
                        <DialogDescription>
                            Enter a new password for your Delight Milk customer account.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleChangePassword} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password (minimum 6 characters)</Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                    required
                                    disabled={isUpdatingPassword}
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input
                                id="confirm-password"
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter new password"
                                required
                                disabled={isUpdatingPassword}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPasswordDialogOpen(false)}
                                disabled={isUpdatingPassword}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isUpdatingPassword}
                                className="gap-2"
                            >
                                {isUpdatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                                Update Password
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Settings;
