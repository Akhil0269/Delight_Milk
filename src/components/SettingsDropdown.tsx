import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Settings,
    User,
    MapPin,
    Bell,
    Calendar,
    CreditCard,
    Globe,
    LogOut,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SettingsMenuItem {
    icon: any;
    label: string;
    description: string;
    path: string;
    color?: string;
}

const SettingsDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    const menuItems: SettingsMenuItem[] = [
        {
            icon: User,
            label: "Profile Settings",
            description: "Name, photo, phone, email",
            path: "/profile",
            color: "text-blue-500",
        },
        {
            icon: MapPin,
            label: "Manage Addresses",
            description: "Delivery locations",
            path: "/addresses",
            color: "text-green-500",
        },
        {
            icon: Bell,
            label: "Notification Preferences",
            description: "Enable/disable alerts",
            path: "/settings/notifications",
            color: "text-orange-500",
        },
        {
            icon: Calendar,
            label: "Subscription Settings",
            description: "Pause, resume, change plan",
            path: "/settings/subscriptions",
            color: "text-purple-500",
        },
        {
            icon: CreditCard,
            label: "Payment Methods",
            description: "Manage payment options",
            path: "/settings/payments",
            color: "text-pink-500",
        },
        {
            icon: Globe,
            label: "Language Preference",
            description: "Change app language",
            path: "/settings/language",
            color: "text-cyan-500",
        },
    ];

    const handleMenuClick = (path: string) => {
        navigate(path);
        setIsOpen(false);
    };

    const handleLogout = async () => {
        try {
            await signOut();
            toast.success("Logged out successfully");
            navigate("/auth");
            setIsOpen(false);
        } catch (error) {
            toast.error("Failed to logout");
        }
    };

    if (!user) {
        return null;
    }

    return (
        <div className="relative">
            {/* Settings Icon Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Settings className="w-5 h-5" />
            </Button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-2 w-80 bg-card border rounded-lg shadow-xl z-50 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-4 bg-gradient-to-r from-primary to-purple-600 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Settings</h3>
                                        <p className="text-sm opacity-90">{user.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="p-2">
                                {menuItems.map((item, index) => (
                                    <motion.button
                                        key={item.path}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => handleMenuClick(item.path)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${item.color}`}>
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium text-sm">{item.label}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.description}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                    </motion.button>
                                ))}
                            </div>

                            <Separator />

                            {/* Logout Button */}
                            <div className="p-2">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="w-4 h-4 mr-3" />
                                    Logout
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SettingsDropdown;
