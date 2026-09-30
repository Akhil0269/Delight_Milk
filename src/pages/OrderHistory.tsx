import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Calendar, IndianRupee, Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrders, useCancelOrder, type OrderStatus, type OrderPaymentStatus } from "@/hooks/useOrders";
import { format } from "date-fns";
import { toast } from "sonner";

const OrderHistory = () => {
    const navigate = useNavigate();
    const { data: orders, isLoading } = useOrders();
    const cancelOrder = useCancelOrder();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    // Filter and search logic
    const filteredOrders = orders?.filter((order) => {
        const productName = order.products?.name || "";
        const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === "all" || order.status === filterStatus;
        return matchesSearch && matchesStatus;
    }) || [];

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case "delivered":
                return "bg-green-500/10 text-green-500 border-green-500/20";
            case "scheduled":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case "confirmed":
                return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
            case "cancelled":
                return "bg-red-500/10 text-red-500 border-red-500/20";
            default:
                return "bg-gray-500/10 text-gray-500 border-gray-500/20";
        }
    };

    const getPaymentStatusColor = (status: OrderPaymentStatus) => {
        switch (status) {
            case "paid":
                return "text-green-600";
            case "pending":
                return "text-yellow-600";
            case "refunded":
                return "text-blue-600";
            case "failed":
                return "text-red-600";
            default:
                return "text-muted-foreground";
        }
    };

    const formatStatus = (status: string) => {
        return status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    };

    const formatPaymentMethod = (method: string) => {
        switch (method) {
            case "wallet": return "Wallet (Prepaid)";
            case "cod": return "Cash on Delivery";
            case "phonepe": return "PhonePe";
            default: return method;
        }
    };

    const handleCancel = async (orderId: string) => {
        try {
            await cancelOrder.mutateAsync(orderId);
            toast.success("Order cancelled successfully");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to cancel order";
            toast.error(message);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/dashboard")}
                            className="text-white hover:bg-white/20"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Order History</h1>
                            <p className="text-white/80 text-sm">View all your one-time orders</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Search & Filter Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-2xl border border-border shadow-soft p-6 mb-6"
                >
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by product name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <Filter className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Orders</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </motion.div>

                {/* Orders List */}
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="text-muted-foreground mt-4">Loading orders...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-12"
                    >
                        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No Orders Found</h3>
                        <p className="text-muted-foreground mb-6">
                            {searchTerm || filterStatus !== "all"
                                ? "Try adjusting your search or filters"
                                : "You haven't placed any one-time orders yet"}
                        </p>
                        <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        {filteredOrders.map((order, index) => (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Package className="w-6 h-6 text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">{order.products?.name || "Product"}</CardTitle>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>Delivery: {format(new Date(order.delivery_date), "dd MMM yyyy")}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        Ordered: {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={getStatusColor(order.status)}>
                                                {formatStatus(order.status)}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Qty:</span>
                                                    <span className="ml-1 font-medium">
                                                        {order.quantity} {order.products?.unit ?? ""}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <IndianRupee className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-semibold text-lg">
                                                        {(order.total_amount ?? order.quantity * order.price_per_unit).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="text-xs">
                                                    <span className="text-muted-foreground">Payment: </span>
                                                    <span>{formatPaymentMethod(order.payment_method)}</span>
                                                    {" · "}
                                                    <span className={getPaymentStatusColor(order.payment_status)}>
                                                        {formatStatus(order.payment_status)}
                                                    </span>
                                                </div>
                                            </div>
                                            {order.status === "confirmed" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                                                    disabled={cancelOrder.isPending}
                                                    onClick={() => handleCancel(order.id)}
                                                >
                                                    <X className="w-3 h-3 mr-1" />
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                        {order.delivery_id && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                ✓ Delivery scheduled by admin
                                            </p>
                                        )}
                                        {!order.delivery_id && order.status === "confirmed" && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                ⏳ Awaiting admin scheduling
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Summary Stats */}
                {filteredOrders.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 bg-card rounded-2xl border border-border shadow-soft p-6"
                    >
                        <h3 className="text-lg font-bold mb-4">Summary</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">{filteredOrders.length}</p>
                                <p className="text-sm text-muted-foreground">Total Orders</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-500">
                                    {filteredOrders.filter(o => o.status === "delivered").length}
                                </p>
                                <p className="text-sm text-muted-foreground">Delivered</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-yellow-500">
                                    {filteredOrders.filter(o => o.status === "confirmed").length}
                                </p>
                                <p className="text-sm text-muted-foreground">Confirmed</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-500">
                                    {filteredOrders.filter(o => o.status === "scheduled").length}
                                </p>
                                <p className="text-sm text-muted-foreground">Scheduled</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    );
};

export default OrderHistory;
