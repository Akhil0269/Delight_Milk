import { useState } from "react";
import { motion } from "framer-motion";
import { Milk, Search, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useCart } from "@/contexts/CartContext";
import UserProfileAvatar from "@/components/UserProfileAvatar";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import SettingsDropdown from "@/components/SettingsDropdown";
import CartSheet from "./CartSheet";

const DashboardHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { itemCount } = useCart();
  const [showCart, setShowCart] = useState(false);

  const currentHour = new Date().getHours();
  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) greeting = "Good afternoon";
  else if (currentHour >= 17) greeting = "Good evening";

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border-b border-border sticky top-0 z-40"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Milk className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">
                Delight <span className="text-primary">Milk</span>
              </span>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/search")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Search className="w-5 h-5" />
              </Button>

              {/* Cart with Badge */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCart(true)}
                className="text-muted-foreground hover:text-foreground relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {/* Cart Badge - Shows item count */}
                {itemCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
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

          {/* Greeting */}
          <div className="py-4 border-t border-border">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-2xl md:text-3xl font-bold">
                {greeting}, <span className="text-primary">{displayName}</span> 👋
              </h1>
              <p className="text-muted-foreground">
                Here's your dairy dashboard for today
              </p>
            </motion.div>
          </div>
        </div>
      </motion.header>
      <CartSheet open={showCart} onOpenChange={setShowCart} />
    </>
  );
};

export default DashboardHeader;
