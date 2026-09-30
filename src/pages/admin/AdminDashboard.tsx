// Admin Dashboard Overview with Real-Time Data
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Users, Package, Truck, Wallet, TrendingUp, AlertCircle, Activity } from "lucide-react";
import { useAdminUsers, useAdminProducts, useAdminDeliveries } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

const AdminDashboard = () => {
    const queryClient = useQueryClient();
    const { data: users, isLoading: usersLoading } = useAdminUsers();
    const { data: products, isLoading: productsLoading } = useAdminProducts();
    const { data: deliveries, isLoading: deliveriesLoading } = useAdminDeliveries();

    const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected'>('disconnected');
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    // Real-time subscriptions
    useEffect(() => {
        console.log("🔴 Setting up real-time subscriptions for admin dashboard");

        // Subscribe to users table changes
        const usersChannel = supabase
            .channel('admin-users-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles'
                },
                (payload) => {
                    console.log('👤 User change detected:', payload);
                    setLastUpdate(new Date());
                    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
                }
            )
            .subscribe((status) => {
                console.log('Users subscription status:', status);
                setRealtimeStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
            });

        // Subscribe to products table changes
        const productsChannel = supabase
            .channel('admin-products-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'products'
                },
                (payload) => {
                    console.log('📦 Product change detected:', payload);
                    setLastUpdate(new Date());
                    queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
                }
            )
            .subscribe();

        // Subscribe to deliveries table changes
        const deliveriesChannel = supabase
            .channel('admin-deliveries-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'deliveries'
                },
                (payload) => {
                    console.log('🚚 Delivery change detected:', payload);
                    setLastUpdate(new Date());
                    queryClient.invalidateQueries({ queryKey: ['admin', 'deliveries'] });
                }
            )
            .subscribe();

        // Subscribe to orders table changes
        const ordersChannel = supabase
            .channel('admin-orders-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders'
                },
                (payload) => {
                    console.log('🛒 Order change detected:', payload);
                    setLastUpdate(new Date());
                }
            )
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            console.log("🔴 Cleaning up real-time subscriptions");
            supabase.removeChannel(usersChannel);
            supabase.removeChannel(productsChannel);
            supabase.removeChannel(deliveriesChannel);
            supabase.removeChannel(ordersChannel);
        };
    }, [queryClient]);

    const stats = [
        {
            title: "Total Users",
            value: users?.length || 0,
            icon: Users,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            change: "+12%",
            changeType: "increase" as const,
        },
        {
            title: "Active Products",
            value: products?.filter((p) => p.is_available).length || 0,
            icon: Package,
            color: "text-green-500",
            bgColor: "bg-green-500/10",
            change: "+5%",
            changeType: "increase" as const,
        },
        {
            title: "Today's Deliveries",
            value: deliveries?.filter((d) => d.delivery_date === new Date().toISOString().split('T')[0]).length || 0,
            icon: Truck,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            change: "+8%",
            changeType: "increase" as const,
        },
        {
            title: "Pending Deliveries",
            value: deliveries?.filter((d) => d.status === 'scheduled').length || 0,
            icon: AlertCircle,
            color: "text-red-500",
            bgColor: "bg-red-500/10",
            change: "-3%",
            changeType: "decrease" as const,
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header with Real-time Status */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-muted-foreground mt-2">
                        Overview of your dairy delivery business
                    </p>
                </div>
                <div className="flex items-center gap-3">
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
                                Updated {lastUpdate.toLocaleTimeString()}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Stats Grid with Animations */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                                    {usersLoading || productsLoading || deliveriesLoading ? (
                                        <Skeleton className="h-8 w-20 mt-2" />
                                    ) : (
                                        <motion.p
                                            key={stat.value}
                                            initial={{ scale: 1.2, color: '#3B82F6' }}
                                            animate={{ scale: 1, color: 'inherit' }}
                                            transition={{ duration: 0.3 }}
                                            className="text-3xl font-bold mt-2"
                                        >
                                            {stat.value}
                                        </motion.p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge
                                            variant={stat.changeType === 'increase' ? 'default' : 'secondary'}
                                            className="text-xs"
                                        >
                                            {stat.change}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">vs last week</span>
                                    </div>
                                </div>
                                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Recent Activity</h3>
                        <Badge variant="outline" className="text-xs">
                            Live
                        </Badge>
                    </div>
                    <div className="space-y-3">
                        {deliveries?.slice(0, 5).map((delivery, index) => (
                            <motion.div
                                key={delivery.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                    <div>
                                        <p className="text-sm font-medium">
                                            Delivery #{delivery.id.slice(0, 8)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {delivery.delivery_date}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant={
                                    delivery.status === 'delivered' ? 'default' :
                                        delivery.status === 'scheduled' ? 'secondary' :
                                            'outline'
                                }>
                                    {delivery.status}
                                </Badge>
                            </motion.div>
                        )) || (
                                <div className="text-sm text-muted-foreground text-center py-8">
                                    No recent activity
                                </div>
                            )}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Total Revenue</span>
                                    <p className="text-lg font-semibold">₹0.00</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-orange-500" />
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Pending Payments</span>
                                    <p className="text-lg font-semibold">₹0.00</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-500" />
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Active Subscriptions</span>
                                    <p className="text-lg font-semibold">0</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;
