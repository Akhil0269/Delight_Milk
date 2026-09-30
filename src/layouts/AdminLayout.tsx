// Admin Layout - Protected layout for admin pages
import { useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
    LayoutDashboard,
    Users,
    Package,
    Truck,
    Wallet,
    BarChart3,
    Bell,
    FileText,
    LogOut,
    Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const AdminLayout = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        // Check if user is admin
        const checkAdminAccess = async () => {
            if (!user) {
                navigate("/auth");
                return;
            }

            // TODO: Check if user has admin role
            // For now, allow all authenticated users
            // In production, check user.user_metadata.role === 'admin'
        };

        checkAdminAccess();
    }, [user, navigate]);

    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        const checkNotifications = () => {
            try {
                const stored = JSON.parse(localStorage.getItem('dev_admin_notifications') || '[]');
                const count = stored.filter((n: any) => !n.read).length;
                setUnreadCount(count);
            } catch (e) {
                console.error("Error reading notifications", e);
            }
        };

        checkNotifications();
        // Poll for new notifications
        const interval = setInterval(checkNotifications, 2000);
        return () => clearInterval(interval);
    }, []);

    const menuItems = [
        { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { path: "/admin/users", icon: Users, label: "Users" },
        { path: "/admin/products", icon: Package, label: "Products" },
        { path: "/admin/deliveries", icon: Truck, label: "Deliveries" },
        { path: "/admin/wallet", icon: Wallet, label: "Wallet" },
        { path: "/admin/reports", icon: BarChart3, label: "Reports" },
        { path: "/admin/notifications", icon: Bell, label: "Notifications", badge: unreadCount },
        { path: "/admin/logs", icon: FileText, label: "Logs" },
    ];

    const isActive = (path: string) => {
        if (path === "/admin") {
            return location.pathname === "/admin";
        }
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-muted/30 flex">
            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? "w-64" : "w-20"
                    } bg-card border-r border-border transition-all duration-300 flex flex-col`}
            >
                {/* Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                    {sidebarOpen && (
                        <h1 className="text-xl font-bold text-primary">Admin Panel</h1>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 p-4 space-y-2">
                    {menuItems.map((item) => (
                        <Link key={item.path} to={item.path}>
                            <Button
                                variant={isActive(item.path) ? "default" : "ghost"}
                                className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"}`}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                {sidebarOpen && <span className="ml-3 flex-1 text-left">{item.label}</span>}
                                {sidebarOpen && item.badge ? (
                                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ml-2">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </Button>
                        </Link>
                    ))}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-border">
                    <Button
                        variant="ghost"
                        className={`w-full ${sidebarOpen ? "justify-start" : "justify-center"}`}
                        onClick={() => signOut()}
                    >
                        <LogOut className="w-5 h-5" />
                        {sidebarOpen && <span className="ml-3">Logout</span>}
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
