import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Calendar, IndianRupee, Filter, Search, X, RotateCcw, Eye, AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOrders, useCancelOrder, useRepeatOrder, type Order, type OrderStatus, type OrderPaymentStatus } from "@/hooks/useOrders";
import { OrderDetailsDialog } from "@/components/dashboard/OrderDetailsDialog";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

const OrderHistory = () => {
    const navigate = useNavigate();
    const { data: orders, isLoading, isError, error, refetch } = useOrders();
    const cancelOrder = useCancelOrder();
    const repeatOrder = useRepeatOrder();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [repeatingOrderId, setRepeatingOrderId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    // Filter and search logic (supports header product and multi-item orders)
    const filteredOrders = orders?.filter((order) => {
        const productName = order.products?.name || "";
        const itemNames = order.order_items?.map(i => i.products?.name || "").join(" ") || "";
        const combined = `${productName} ${itemNames}`.toLowerCase();
        const matchesSearch = combined.includes(searchTerm.toLowerCase());
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
            if (selectedOrder?.id === orderId) {
                setDetailsOpen(false);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to cancel order";
            toast.error(message);
        }
    };

    const handleRepeatOrder = async (orderId: string, productName?: string) => {
        try {
            setRepeatingOrderId(orderId);
            const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
            await repeatOrder.mutateAsync({
                orderId,
                targetDate: tomorrow,
            });
            toast.success(`Repeat order placed for ${productName || 'product'}! Delivery tomorrow via Cash on Delivery.`);
            if (selectedOrder?.id === orderId) {
                setDetailsOpen(false);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to repeat order";
            toast.error(message);
        } finally {
            setRepeatingOrderId(null);
        }
    };

    const handleOpenDetails = (order: Order) => {
        setSelectedOrder(order);
        setDetailsOpen(true);
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
                ) : isError ? (
                    <div className="text-center py-12 bg-card rounded-2xl border border-destructive/20 p-8 max-w-md mx-auto shadow-sm">
                        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-3" />
                        <h3 className="text-lg font-bold">Failed to Load Orders</h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                            {error?.message || "An error occurred while fetching your authoritative order history."}
                        </p>
                        <Button onClick={() => refetch()} variant="outline" className="gap-2">
                            <RefreshCcw className="w-4 h-4" />
                            Retry
                        </Button>
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
                                    <CardHeader className="pb-3 cursor-pointer" onClick={() => handleOpenDetails(order)}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    {order.products?.image_url ? (
                                                        <img
                                                            src={order.products.image_url}
                                                            alt={order.products?.name || "Product"}
                                                            className="w-full h-full object-cover rounded-full"
                                                        />
                                                    ) : (
                                                        <Package className="w-6 h-6 text-primary" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <CardTitle className="text-lg hover:text-primary transition-colors">
                                                            {order.products?.name || (order.order_items?.[0]?.products?.name) || "Product (Catalog Updated)"}
                                                        </CardTitle>
                                                        {order.order_items && order.order_items.length > 1 && (
                                                            <Badge variant="secondary" className="text-[11px] font-normal">
                                                                +{order.order_items.length - 1} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>Delivery: {format(new Date(order.delivery_date), "dd MMM yyyy")}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        Order #{order.id.slice(0, 8)} · Placed {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
                                                    </div>
                                                </div>
                                            </div>
                                            <Badge className={getStatusColor(order.status)}>
                                                {formatStatus(order.status)}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Qty:</span>
                                                    <span className="ml-1 font-medium">
                                                        {order.quantity} {order.products?.unit ?? ""}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <IndianRupee className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-semibold text-lg">
                                                        {(order.total_amount ?? (order.quantity * order.price_per_unit)).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="text-xs">
                                                    <span className="text-muted-foreground">Payment: </span>
                                                    <span className="font-medium">{formatPaymentMethod(order.payment_method)}</span>
                                                    {" · "}
                                                    <span className={getPaymentStatusColor(order.payment_status)}>
                                                        {formatStatus(order.payment_status)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs"
                                                    onClick={() => handleOpenDetails(order)}
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                                    Details
                                                </Button>

                                                {order.status === "confirmed" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-destructive border-destructive/40 hover:bg-destructive/10 text-xs"
                                                        disabled={cancelOrder.isPending}
                                                        onClick={() => handleCancel(order.id)}
                                                    >
                                                        <X className="w-3 h-3 mr-1" />
                                                        Cancel
                                                    </Button>
                                                )}

                                                {order.status === "delivered" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-primary border-primary/40 hover:bg-primary/10 text-xs"
                                                        disabled={repeatingOrderId === order.id}
                                                        onClick={() => handleRepeatOrder(order.id, order.products?.name)}
                                                    >
                                                        <RotateCcw className="w-3 h-3 mr-1" />
                                                        {repeatingOrderId === order.id ? "Placing..." : "Repeat"}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {order.delivery_id && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                ✓ Delivery scheduled ({order.deliveries?.status || "upcoming"})
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

                {/* Order Details Dialog */}
                <OrderDetailsDialog
                    order={selectedOrder}
                    open={detailsOpen}
                    onOpenChange={setDetailsOpen}
                    onCancelOrder={handleCancel}
                    onRepeatOrder={handleRepeatOrder}
                    isCancelling={cancelOrder.isPending}
                    isRepeating={repeatingOrderId === selectedOrder?.id}
                />
            </main>
        </div>
    );
};

export default OrderHistory;
