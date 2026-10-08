// Admin Layout - Protected layout for admin pages
import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
    Menu,
    Shield,
    CalendarCheck,
    ShoppingCart,
    Bike,
    ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnreadCount } from "@/hooks/useNotifications";

const AdminLayout = () => {
    const { user, loading: authLoading, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let isMounted = true;

        // If auth context is still loading session from storage/network, wait
        if (authLoading) {
            return;
        }

        const checkAdminAccess = async () => {
            if (!user) {
                if (isMounted) {
                    setIsAdmin(false);
                    setIsVerifyingAdmin(false);
                }
                navigate("/admin-auth", { replace: true });
                return;
            }

            try {
                // 1. Verify profile is not blocked
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("is_blocked")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (profileData?.is_blocked) {
                    if (isMounted) {
                        setIsAdmin(false);
                        setIsVerifyingAdmin(false);
                    }
                    toast.error("Your account has been suspended or blocked.");
                    await signOut();
                    navigate("/admin-auth", { replace: true });
                    return;
                }

                let userIsAdmin = false;

                // 2. Verify via canonical is_admin database RPC function
                const { data: rpcAdmin, error: rpcError } = await supabase.rpc("is_admin", {
                    user_id: user.id,
                });

                if (!rpcError && rpcAdmin === true) {
                    userIsAdmin = true;
                } else {
                    // 3. Direct user_roles table query fallback
                    const { data: roleData, error: roleError } = await supabase
                        .from("user_roles")
                        .select("role")
                        .eq("user_id", user.id)
                        .eq("role", "admin")
                        .maybeSingle();

                    if (!roleError && roleData?.role === "admin") {
                        userIsAdmin = true;
                    }
                }

                if (!isMounted) return;

                if (!userIsAdmin) {
                    toast.error("Access denied. Administrator privileges required.");
                    setIsAdmin(false);
                    setIsVerifyingAdmin(false);
                    navigate("/dashboard", { replace: true });
                    return;
                }

                setIsAdmin(true);
            } catch (error) {
                console.error("Admin role verification error:", error);
                if (isMounted) {
                    setIsAdmin(false);
                    toast.error("Failed to verify administrator privileges.");
                    navigate("/dashboard", { replace: true });
                }
            } finally {
                if (isMounted) {
                    setIsVerifyingAdmin(false);
                }
            }
        };

        checkAdminAccess();

        return () => {
            isMounted = false;
        };
    }, [user, authLoading, navigate, signOut]);

    const { data: dbUnreadCount = 0 } = useUnreadCount();
    const unreadCount = Number(dbUnreadCount || 0);

    const menuItems = [
        { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { path: "/admin/orders", icon: ShoppingCart, label: "Orders" },
        { path: "/admin/deliveries", icon: Truck, label: "Deliveries" },
        { path: "/admin/delivery-boys", icon: Bike, label: "Delivery Boys" },
        { path: "/admin/products", icon: Package, label: "Products" },
        { path: "/admin/subscriptions", icon: CalendarCheck, label: "Subscriptions" },
        { path: "/admin/users", icon: Users, label: "Users" },
        { path: "/admin/admins", icon: ShieldCheck, label: "Admins" },
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

    if (isVerifyingAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Verifying administrator access...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

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
                        onClick={async () => {
                            await signOut();
                            navigate("/admin-auth", { replace: true });
                        }}
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
