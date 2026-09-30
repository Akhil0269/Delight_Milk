import { motion } from "framer-motion";
import { Milk } from "lucide-react";
import { Link } from "react-router-dom";
import UserProfileAvatar from "@/components/UserProfileAvatar";
import NotificationsDropdown from "@/components/NotificationsDropdown";
import SettingsDropdown from "@/components/SettingsDropdown";

const DashboardNavbar = () => {
    return (
        <div className="bg-card border-b border-border sticky top-0 z-40 w-full mb-0">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16 md:h-20">
                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <Milk className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold">
                            Daily<span className="text-primary">Dairy</span>
                        </span>
                    </Link>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 md:gap-3">
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
    );
};

export default DashboardNavbar;
