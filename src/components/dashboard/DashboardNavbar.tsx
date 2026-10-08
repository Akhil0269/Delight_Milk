import { useState } from "react";
import { motion } from "framer-motion";
import { Milk, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import UserProfileAvatar from "@/components/UserProfileAvatar";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import SettingsDropdown from "@/components/SettingsDropdown";
import CartSheet from "./CartSheet";

const DashboardNavbar = () => {
    const { itemCount } = useCart();
    const [showCart, setShowCart] = useState(false);

    return (
        <>
            <div className="bg-card border-b border-border sticky top-0 z-40 w-full mb-0">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16 md:h-20">
                        {/* Logo */}
                        <Link to="/dashboard" className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                                <Milk className="w-6 h-6 text-primary-foreground" />
                            </div>
                            <span className="text-xl font-bold">
                                Delight <span className="text-primary">Milk</span>
                            </span>
                        </Link>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 md:gap-3">
                            {/* Shopping Cart Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowCart(true)}
                                className="text-muted-foreground hover:text-foreground relative"
                                title="Shopping Cart"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                {itemCount > 0 && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center px-1"
                                    >
                                        {itemCount}
                                    </motion.span>
                                )}
                            </Button>

                            {/* Notifications */}
                            <NotificationsDropdown />

                            {/* Settings */}
                            <SettingsDropdown />

                            {/* User Profile Avatar with Dropdown */}
                            <UserProfileAvatar showName={false} size="md" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Shopping Cart Drawer */}
            <CartSheet open={showCart} onOpenChange={setShowCart} />
        </>
    );
};

export default DashboardNavbar;
