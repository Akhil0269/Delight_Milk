// Admin Dashboard Overview with Real-Time Authoritative Supabase Data
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Package, Truck, Wallet, TrendingUp, AlertCircle, Activity, ShoppingBag, RefreshCw, AlertTriangle } from "lucide-react";
import { useAdminDashboardMetrics } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const AdminDashboard = () => {
    const queryClient = useQueryClient();
    const { data: metrics, isLoading, isError, error, refetch, isRefetching } = useAdminDashboardMetrics();

    const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected'>('disconnected');
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Real-time subscriptions for live dashboard updates
    useEffect(() => {
        const invalidateDashboard = () => {
            setLastUpdate(new Date());
            queryClient.invalidateQueries({ queryKey: ["admin-dashboard-metrics"] });
        };

        // Subscribe to profiles changes
        const usersChannel = supabase
            .channel('admin-dashboard-users')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, invalidateDashboard)
            .subscribe((status) => {
                setRealtimeStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
            });

        // Subscribe to products changes
        const productsChannel = supabase
            .channel('admin-dashboard-products')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, invalidateDashboard)
            .subscribe();

        // Subscribe to deliveries changes
        const deliveriesChannel = supabase
            .channel('admin-dashboard-deliveries')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, invalidateDashboard)
            .subscribe();

        // Subscribe to orders changes
        const ordersChannel = supabase
            .channel('admin-dashboard-orders')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, invalidateDashboard)
            .subscribe();

        // Subscribe to subscriptions changes
        const subscriptionsChannel = supabase
            .channel('admin-dashboard-subscriptions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, invalidateDashboard)
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            supabase.removeChannel(usersChannel);
            supabase.removeChannel(productsChannel);
            supabase.removeChannel(deliveriesChannel);
            supabase.removeChannel(ordersChannel);
            supabase.removeChannel(subscriptionsChannel);
        };
    }, [queryClient]);

    const stats = [
        {
            title: "Total Customers",
            value: metrics?.totalCustomers ?? 0,
            icon: Users,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            badgeText: `${metrics?.activeCustomers ?? 0} active`,
            badgeVariant: "default" as const,
        },
        {
            title: "Active Products",
            value: metrics?.activeProducts ?? 0,
            icon: Package,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
            badgeText: `${metrics?.totalProducts ?? 0} in catalog`,
            badgeVariant: "secondary" as const,
        },
        {
            title: "Today's Deliveries",
            value: metrics?.todayDeliveries ?? 0,
            icon: Truck,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            badgeText: `${metrics?.completedTodayDeliveries ?? 0} completed`,
            badgeVariant: (metrics?.completedTodayDeliveries ?? 0) > 0 ? "default" as const : "outline" as const,
        },
        {
            title: "Pending Deliveries",
            value: metrics?.totalUpcomingDeliveries ?? 0,
            icon: AlertCircle,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            badgeText: "Awaiting fulfillment",
            badgeVariant: "secondary" as const,
        },
    ];

    const getDeliveryStatusBadge = (status: string) => {
        switch (status) {
            case "delivered":
                return <Badge className="bg-green-600 hover:bg-green-700 text-white">Delivered</Badge>;
            case "upcoming":
                return <Badge variant="secondary">Upcoming</Badge>;
            case "in_progress":
                return <Badge className="bg-amber-600 hover:bg-amber-700 text-white">In Progress</Badge>;
            case "cancelled":
                return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
            case "failed":
            case "missed":
                return <Badge variant="destructive">Missed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-8">
            {/* Header with Real-time Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-2">
                        Real-time overview of your dairy delivery business
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isRefetching}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>

                    {/* Real-time Status Indicator */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border"
                    >
                        <div className="relative">
                            <Activity className="w-4 h-4 text-primary" />
                            {realtimeStatus === 'connected' && (
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
                                />
                            )}
                        </div>
                        <div className="text-xs">
                            <div className="font-medium">
                                {realtimeStatus === 'connected' ? 'Live' : 'Connecting...'}
                            </div>
                            <div className="text-muted-foreground">
                                {format(lastUpdate, "hh:mm:ss a")}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Error Banner */}
            {isError && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-sm">Failed to load dashboard metrics</p>
                            <p className="text-xs opacity-90">
                                {error instanceof Error ? error.message : "An unexpected error occurred while querying statistics."}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="border-destructive/30">
                        Retry
                    </Button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                                    {isLoading ? (
                                        <Skeleton className="h-9 w-24 mt-2" />
                                    ) : (
                                        <motion.p
                                            key={stat.value}
                                            initial={{ scale: 1.1, color: '#3B82F6' }}
                                            animate={{ scale: 1, color: 'inherit' }}
                                            transition={{ duration: 0.3 }}
                                            className="text-3xl font-bold mt-2 tracking-tight"
                                        >
                                            {stat.value.toLocaleString('en-IN')}
                                        </motion.p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge
                                            variant={stat.badgeVariant}
                                            className="text-xs font-normal"
                                        >
                                            {stat.badgeText}
                                        </Badge>
                                    </div>
                                </div>
                                <div className={`${stat.bgColor} p-3 rounded-xl`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Two-Column Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Delivery Activity */}
                <Card className="p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Recent Fulfillment Activity</h3>
                                <p className="text-xs text-muted-foreground">Latest scheduled and completed deliveries</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                                Realtime
                            </Badge>
                        </div>
                        <div className="space-y-3">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                                ))
                            ) : metrics?.recentDeliveries && metrics.recentDeliveries.length > 0 ? (
                                metrics.recentDeliveries.map((delivery, index) => (
                                    <motion.div
                                        key={delivery.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">
                                                    {delivery.product_name}
                                                    <span className="text-xs font-normal text-muted-foreground ml-1.5">
                                                        ({delivery.quantity} {delivery.unit})
                                                    </span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Scheduled: {format(new Date(delivery.delivery_date), "dd MMM yyyy")}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            {getDeliveryStatusBadge(delivery.status)}
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="text-sm text-muted-foreground text-center py-12">
                                    No recent delivery activity found
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Financial & Operational Overview */}
                <Card className="p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold">Financial & Operational Overview</h3>
                        <p className="text-xs text-muted-foreground">Canonical order and revenue metrics from database</p>
                    </div>
                    <div className="space-y-4">
                        {/* Realized Revenue */}
                        <div className="flex justify-between items-center p-3.5 rounded-xl bg-muted/50 border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-muted-foreground">Total Realized Revenue</span>
                                    {isLoading ? (
                                        <Skeleton className="h-6 w-28 mt-1" />
                                    ) : (
                                        <p className="text-xl font-bold tracking-tight text-foreground">
                                            ₹{(metrics?.totalPaidRevenue ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Badge className="bg-green-600/10 text-green-700 hover:bg-green-600/20 border-green-200">
                                Paid & Verified
                            </Badge>
                        </div>

                        {/* Pending Payments */}
                        <div className="flex justify-between items-center p-3.5 rounded-xl bg-muted/50 border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                    <Wallet className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-muted-foreground">Pending Collections</span>
                                    {isLoading ? (
                                        <Skeleton className="h-6 w-28 mt-1" />
                                    ) : (
                                        <p className="text-xl font-bold tracking-tight text-foreground">
                                            ₹{(metrics?.pendingPayments ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">
                                Pending COD / In-flight
                            </Badge>
                        </div>

                        {/* Active Subscriptions */}
                        <div className="flex justify-between items-center p-3.5 rounded-xl bg-muted/50 border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <RefreshCw className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-muted-foreground">Active Subscriptions</span>
                                    {isLoading ? (
                                        <Skeleton className="h-6 w-16 mt-1" />
                                    ) : (
                                        <p className="text-xl font-bold tracking-tight text-foreground">
                                            {metrics?.activeSubscriptions ?? 0}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                                of {metrics?.totalSubscriptions ?? 0} Total
                            </Badge>
                        </div>

                        {/* Total Orders */}
                        <div className="flex justify-between items-center p-3.5 rounded-xl bg-muted/50 border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                                    <ShoppingBag className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-muted-foreground">Total Customer Orders</span>
                                    {isLoading ? (
                                        <Skeleton className="h-6 w-16 mt-1" />
                                    ) : (
                                        <p className="text-xl font-bold tracking-tight text-foreground">
                                            {metrics?.totalOrders ?? 0}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <Badge variant="outline">
                                {metrics?.todayOrders ?? 0} Placed Today
                            </Badge>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;
