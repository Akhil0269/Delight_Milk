// Admin Order Management — Phase 12.6
// Canonical data source: public.orders + order_items + profiles + products + deliveries
// No mock data, no localStorage, no service-role key in frontend, strict RLS enforced.
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    useAdminOrders,
    useAdminOrderDetail,
    useAdminCancelOrder,
    useAdminUpdateOrderStatus,
    AdminOrder,
    AdminOrderStatus,
    AdminOrderPaymentStatus,
    AdminOrderPaymentMethod,
} from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    ShoppingCart,
    Search,
    Filter,
    Calendar,
    User,
    Phone,
    Mail,
    Truck,
    CreditCard,
    CheckCircle2,
    Clock,
    XCircle,
    AlertCircle,
    Eye,
    Download,
    RefreshCw,
    Copy,
    Check,
    FileText,
    Ban,
    DollarSign,
    Package,
    ShieldAlert,
    RotateCcw,
} from 'lucide-react';
import { format, parseISO, isToday, isYesterday, subDays, isAfter } from 'date-fns';
import { downloadReceipt, ReceiptData } from '@/lib/receiptGenerator';
import { toast } from 'sonner';

// Status badge component
function OrderStatusBadge({ status }: { status: AdminOrderStatus }) {
    switch (status) {
        case 'delivered':
            return (
                <Badge className="bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/25 border-emerald-300 font-medium gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Delivered
                </Badge>
            );
        case 'scheduled':
            return (
                <Badge className="bg-blue-600/15 text-blue-700 hover:bg-blue-600/25 border-blue-300 font-medium gap-1">
                    <Clock className="w-3 h-3" /> Scheduled
                </Badge>
            );
        case 'confirmed':
            return (
                <Badge className="bg-amber-600/15 text-amber-700 hover:bg-amber-600/25 border-amber-300 font-medium gap-1">
                    <Clock className="w-3 h-3" /> Confirmed
                </Badge>
            );
        case 'cancelled':
            return (
                <Badge variant="destructive" className="font-medium gap-1">
                    <XCircle className="w-3 h-3" /> Cancelled
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

// Payment status badge
function PaymentStatusBadge({ status }: { status: AdminOrderPaymentStatus }) {
    switch (status) {
        case 'paid':
            return (
                <Badge className="bg-green-600/15 text-green-700 hover:bg-green-600/25 border-green-300 font-medium">
                    Paid
                </Badge>
            );
        case 'pending':
            return (
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-500/10 font-medium">
                    Pending
                </Badge>
            );
        case 'refunded':
            return (
                <Badge className="bg-purple-600/15 text-purple-700 hover:bg-purple-600/25 border-purple-300 font-medium">
                    Refunded
                </Badge>
            );
        case 'failed':
            return (
                <Badge variant="destructive" className="font-medium">
                    Failed
                </Badge>
            );
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

// Payment method badge
function PaymentMethodBadge({ method }: { method: AdminOrderPaymentMethod }) {
    switch (method) {
        case 'wallet':
            return (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    <CreditCard className="w-3 h-3" /> Wallet
                </span>
            );
        case 'cod':
            return (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <DollarSign className="w-3 h-3" /> COD
                </span>
            );
        case 'phonepe':
            return (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    <CreditCard className="w-3 h-3" /> PhonePe
                </span>
            );
        default:
            return <span className="text-xs text-muted-foreground uppercase">{method}</span>;
    }
}

export default function OrderManagement() {
    const { user } = useAuth();
    const { data: orders = [], isLoading, isError, error, refetch } = useAdminOrders();

    // Filters state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('all');

    // Selection & Modals
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Status change modal
    const [statusModalOrder, setStatusModalOrder] = useState<AdminOrder | null>(null);
    const [newStatus, setNewStatus] = useState<'scheduled' | 'delivered'>('scheduled');

    // Cancellation modal
    const [cancelModalOrder, setCancelModalOrder] = useState<AdminOrder | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    // Mutation hooks
    const updateStatusMutation = useAdminUpdateOrderStatus();
    const cancelOrderMutation = useAdminCancelOrder();

    // Fetch full order detail for modal inspection
    const { data: orderDetail, isLoading: isDetailLoading } = useAdminOrderDetail(
        isDetailOpen ? selectedOrderId : null
    );

    // Copy order ID helper
    const handleCopyId = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        toast.success('Order ID copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Filtered orders
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            // Search query matches Order ID, customer name, email, or phone
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchesId = order.id.toLowerCase().includes(query);
                const matchesName = (order.customer_name || '').toLowerCase().includes(query);
                const matchesEmail = (order.customer_email || '').toLowerCase().includes(query);
                const matchesPhone = (order.customer_phone || '').toLowerCase().includes(query);
                const matchesProduct = (order.product_name || '').toLowerCase().includes(query);
                if (!matchesId && !matchesName && !matchesEmail && !matchesPhone && !matchesProduct) {
                    return false;
                }
            }

            // Order status filter
            if (statusFilter !== 'all' && order.status !== statusFilter) {
                return false;
            }

            // Payment status filter
            if (paymentStatusFilter !== 'all' && order.payment_status !== paymentStatusFilter) {
                return false;
            }

            // Payment method filter
            if (paymentMethodFilter !== 'all' && order.payment_method !== paymentMethodFilter) {
                return false;
            }

            // Date filter based on order created_at
            if (dateFilter !== 'all') {
                try {
                    const orderDate = parseISO(order.created_at);
                    const now = new Date();
                    if (dateFilter === 'today' && !isToday(orderDate)) return false;
                    if (dateFilter === 'yesterday' && !isYesterday(orderDate)) return false;
                    if (dateFilter === 'week' && !isAfter(orderDate, subDays(now, 7))) return false;
                    if (dateFilter === 'month' && !isAfter(orderDate, subDays(now, 30))) return false;
                } catch {
                    // ignore parse errors
                }
            }

            return true;
        });
    }, [orders, searchQuery, statusFilter, paymentStatusFilter, paymentMethodFilter, dateFilter]);

    // KPI Metrics calculation (strictly from authoritative database records)
    const metrics = useMemo(() => {
        const total = orders.length;
        const delivered = orders.filter((o) => o.status === 'delivered').length;
        const active = orders.filter((o) => o.status === 'confirmed' || o.status === 'scheduled').length;
        const cancelled = orders.filter((o) => o.status === 'cancelled').length;
        const totalPaidRevenue = orders
            .filter((o) => o.payment_status === 'paid')
            .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

        return { total, delivered, active, cancelled, totalPaidRevenue };
    }, [orders]);

    // Handle view detail
    const handleViewDetail = (order: AdminOrder) => {
        setSelectedOrderId(order.id);
        setIsDetailOpen(true);
    };

    // Handle status change submit
    const handleStatusSubmit = async () => {
        if (!statusModalOrder || !user?.id) return;
        try {
            await updateStatusMutation.mutateAsync({
                orderId: statusModalOrder.id,
                adminId: user.id,
                newStatus,
            });
            setStatusModalOrder(null);
        } catch {
            // Handled in mutation onError
        }
    };

    // Handle cancel submit
    const handleCancelSubmit = async () => {
        if (!cancelModalOrder || !user?.id) return;
        try {
            await cancelOrderMutation.mutateAsync({
                orderId: cancelModalOrder.id,
                adminId: user.id,
                reason: cancelReason.trim() || undefined,
            });
            setCancelModalOrder(null);
            setCancelReason('');
            // If detail modal was open for this order, close or keep synced
            if (selectedOrderId === cancelModalOrder.id) {
                refetch();
            }
        } catch {
            // Handled in mutation onError
        }
    };

    // Handle download receipt
    const handleDownloadReceipt = (order: AdminOrder) => {
        const receiptData: ReceiptData = {
            transactionId: order.id,
            amount: Number(order.total_amount),
            paymentMethod: order.payment_method.toUpperCase(),
            purpose: 'Dairy Order Fulfillment',
            date: order.created_at,
            userName: order.customer_name || 'Customer',
            userEmail: order.customer_email || undefined,
            deliveryDate: order.delivery_date,
            productName: order.product_name || 'Milk / Dairy Product',
            quantity: Number(order.quantity),
        };
        downloadReceipt(receiptData);
        toast.success('Official receipt generated and downloaded');
    };

    // Clear filters helper
    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setPaymentStatusFilter('all');
        setPaymentMethodFilter('all');
        setDateFilter('all');
    };

    const hasActiveFilters =
        searchQuery.trim() !== '' ||
        statusFilter !== 'all' ||
        paymentStatusFilter !== 'all' ||
        paymentMethodFilter !== 'all' ||
        dateFilter !== 'all';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Authoritative Supabase orders, fulfillment tracking, and atomic refunds
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="p-4 bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Total Orders</p>
                        <ShoppingCart className="w-4 h-4 text-primary" />
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                        <p className="text-2xl font-bold mt-1 tracking-tight">{metrics.total}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">All historical orders</p>
                </Card>

                <Card className="p-4 bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Delivered</p>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                        <p className="text-2xl font-bold mt-1 tracking-tight text-emerald-700">
                            {metrics.delivered}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                        {metrics.total > 0 ? `${Math.round((metrics.delivered / metrics.total) * 100)}% fulfilled` : '0%'}
                    </p>
                </Card>

                <Card className="p-4 bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Awaiting Delivery</p>
                        <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                        <p className="text-2xl font-bold mt-1 tracking-tight text-amber-700">
                            {metrics.active}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Confirmed / Scheduled</p>
                </Card>

                <Card className="p-4 bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Cancelled</p>
                        <XCircle className="w-4 h-4 text-destructive" />
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                        <p className="text-2xl font-bold mt-1 tracking-tight text-destructive">
                            {metrics.cancelled}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Refunded / Cancelled</p>
                </Card>

                <Card className="p-4 col-span-2 lg:col-span-1 bg-card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">Paid Revenue</p>
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    {isLoading ? (
                        <Skeleton className="h-8 w-24 mt-2" />
                    ) : (
                        <p className="text-2xl font-bold mt-1 tracking-tight text-emerald-700">
                            ₹{metrics.totalPaidRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Authoritative settled</p>
                </Card>
            </div>

            {/* Search & Filters Bar */}
            <Card className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search Order ID, Customer name, phone, or product..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9"
                        />
                    </div>

                    {/* Order Status */}
                    <div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Order Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Order Statuses</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Payment Status */}
                    <div>
                        <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Payment Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Payment Statuses</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Payment Method */}
                    <div>
                        <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                            <SelectTrigger className="h-9">
                                <SelectValue placeholder="Payment Method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Payment Methods</SelectItem>
                                <SelectItem value="wallet">Wallet</SelectItem>
                                <SelectItem value="cod">Cash on Delivery</SelectItem>
                                <SelectItem value="phonepe">PhonePe</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Sub-bar: Date Filter & Reset */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> Date:
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {[
                                { key: 'all', label: 'All Time' },
                                { key: 'today', label: 'Today' },
                                { key: 'yesterday', label: 'Yesterday' },
                                { key: 'week', label: 'Last 7 Days' },
                                { key: 'month', label: 'Last 30 Days' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setDateFilter(tab.key)}
                                    className={`px-2.5 py-1 rounded transition-colors ${
                                        dateFilter === tab.key
                                            ? 'bg-primary text-primary-foreground font-medium'
                                            : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">
                            Showing <strong className="text-foreground">{filteredOrders.length}</strong> of{' '}
                            <strong>{orders.length}</strong> orders
                        </span>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetFilters}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" /> Clear Filters
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* Error State */}
            {isError && (
                <Card className="p-6 border-destructive/50 bg-destructive/5 text-destructive flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Failed to load orders</p>
                            <p className="text-sm opacity-90">{error?.message || 'Database error occurred'}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => refetch()} className="border-destructive/30">
                        Retry
                    </Button>
                </Card>
            )}

            {/* Orders Table */}
            <Card className="overflow-hidden border border-border/60 shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="w-[140px]">Order ID</TableHead>
                                <TableHead className="min-w-[180px]">Customer</TableHead>
                                <TableHead className="min-w-[180px]">Product / Items</TableHead>
                                <TableHead className="w-[110px] text-right">Amount</TableHead>
                                <TableHead className="w-[130px]">Payment</TableHead>
                                <TableHead className="w-[120px]">Order Status</TableHead>
                                <TableHead className="w-[130px]">Delivery</TableHead>
                                <TableHead className="w-[130px]">Created At</TableHead>
                                <TableHead className="w-[140px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <ShoppingCart className="w-8 h-8 text-muted-foreground/60" />
                                            <p className="text-base font-semibold">No orders found</p>
                                            <p className="text-xs text-muted-foreground max-w-sm">
                                                {hasActiveFilters
                                                    ? 'No orders match your filter criteria. Try adjusting or clearing your filters.'
                                                    : 'No customer orders have been recorded in the database yet.'}
                                            </p>
                                            {hasActiveFilters && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleResetFilters}
                                                    className="mt-2 text-xs"
                                                >
                                                    Clear All Filters
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => {
                                    const isDelivered = order.status === 'delivered';
                                    const isCancelled = order.status === 'cancelled';
                                    const canMutate = !isDelivered && !isCancelled;

                                    return (
                                        <TableRow
                                            key={order.id}
                                            className="hover:bg-muted/30 transition-colors cursor-pointer"
                                            onClick={() => handleViewDetail(order)}
                                        >
                                            {/* Order ID */}
                                            <TableCell className="font-mono text-xs font-semibold">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-foreground">#{order.id.slice(0, 8)}</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopyId(order.id, e)}
                                                        className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                                                        title="Copy full Order UUID"
                                                    >
                                                        {copiedId === order.id ? (
                                                            <Check className="w-3 h-3 text-green-600" />
                                                        ) : (
                                                            <Copy className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </div>
                                            </TableCell>

                                            {/* Customer */}
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium text-sm text-foreground">
                                                            {order.customer_name || 'Guest User'}
                                                        </span>
                                                        {order.customer_is_blocked && (
                                                            <Badge variant="destructive" className="h-4 px-1 text-[10px] gap-0.5">
                                                                <Ban className="w-2.5 h-2.5" /> Suspended
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {order.customer_phone || order.customer_email || 'No contact'}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Product / Items */}
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {order.product_name || 'Dairy Product'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Qty: {order.quantity} {order.product_unit || 'units'}
                                                        {order.item_count > 1 && ` (+${order.item_count - 1} items)`}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Amount */}
                                            <TableCell className="text-right font-semibold text-sm">
                                                ₹{order.total_amount.toFixed(2)}
                                            </TableCell>

                                            {/* Payment */}
                                            <TableCell>
                                                <div className="flex flex-col gap-1 items-start">
                                                    <PaymentMethodBadge method={order.payment_method} />
                                                    <PaymentStatusBadge status={order.payment_status} />
                                                </div>
                                            </TableCell>

                                            {/* Order Status */}
                                            <TableCell>
                                                <OrderStatusBadge status={order.status} />
                                            </TableCell>

                                            {/* Delivery */}
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-medium text-foreground">
                                                        {order.delivery_date}
                                                    </span>
                                                    <span className="text-muted-foreground capitalize">
                                                        {order.delivery_status || 'Pending Dispatch'}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Created At */}
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(parseISO(order.created_at), 'MMM dd, yyyy')}
                                                <div className="text-[11px] opacity-75">
                                                    {format(parseISO(order.created_at), 'hh:mm a')}
                                                </div>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewDetail(order)}
                                                        className="h-8 px-2 text-xs"
                                                        title="Inspect full order details"
                                                    >
                                                        <Eye className="w-3.5 h-3.5 mr-1" /> Details
                                                    </Button>

                                                    {canMutate && (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setStatusModalOrder(order);
                                                                    setNewStatus(order.status === 'confirmed' ? 'scheduled' : 'delivered');
                                                                }}
                                                                className="h-8 px-2 text-xs"
                                                                title="Update order status"
                                                            >
                                                                Update
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setCancelModalOrder(order);
                                                                    setCancelReason('');
                                                                }}
                                                                className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                title="Cancel order and refund if paid"
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* ========================================================================= */}
            {/* 1. ORDER DETAILS INSPECTION MODAL */}
            {/* ========================================================================= */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between pr-6">
                            <div>
                                <DialogTitle className="text-xl flex items-center gap-2">
                                    Order #{orderDetail ? orderDetail.id.slice(0, 8) : selectedOrderId?.slice(0, 8)}
                                    {orderDetail && <OrderStatusBadge status={orderDetail.status} />}
                                </DialogTitle>
                                <DialogDescription className="font-mono text-xs mt-1">
                                    UUID: {selectedOrderId}
                                </DialogDescription>
                            </div>
                            {orderDetail && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadReceipt(orderDetail)}
                                    className="gap-1.5 text-xs"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download Receipt
                                </Button>
                            )}
                        </div>
                    </DialogHeader>

                    {isDetailLoading || !orderDetail ? (
                        <div className="space-y-4 py-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-32 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : (
                        <div className="space-y-5 py-2">
                            {/* Customer Information Card */}
                            <Card className="p-4 bg-muted/20 border-border/60">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-primary" /> Customer Profile
                                    </h4>
                                    {orderDetail.customer_is_blocked && (
                                        <Badge variant="destructive" className="gap-1 text-xs">
                                            <ShieldAlert className="w-3 h-3" /> Account Suspended
                                        </Badge>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Full Name</p>
                                        <p className="font-semibold text-foreground mt-0.5">
                                            {orderDetail.customer_name || 'Anonymous User'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Phone Number</p>
                                        <p className="font-semibold text-foreground mt-0.5">
                                            {orderDetail.customer_phone || 'None provided'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Email</p>
                                        <p className="font-semibold text-foreground mt-0.5 truncate">
                                            {orderDetail.customer_email || 'None provided'}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Order Items Table (HISTORICAL PRICING PRESERVED) */}
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-primary" /> Order Items & Historical Pricing
                                </h4>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40">
                                                <TableHead>Product</TableHead>
                                                <TableHead className="text-center">Quantity</TableHead>
                                                <TableHead className="text-right">Unit Price (Historical)</TableHead>
                                                <TableHead className="text-right">Subtotal</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {orderDetail.order_items && orderDetail.order_items.length > 0 ? (
                                                orderDetail.order_items.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">
                                                                    {item.products?.name || orderDetail.product_name || 'Dairy Product'}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    Unit: {item.products?.unit || orderDetail.product_unit || 'unit'}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-semibold">
                                                            {item.quantity}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            ₹{item.price_per_unit.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-semibold">
                                                            ₹{item.total_amount.toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">
                                                                {orderDetail.product_name || 'Dairy Product'}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                Unit: {orderDetail.product_unit || 'unit'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold">
                                                        {orderDetail.quantity}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        ₹{orderDetail.price_per_unit.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-semibold">
                                                        ₹{orderDetail.total_amount.toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    <div className="bg-muted/30 p-3 px-4 flex justify-between items-center border-t">
                                        <span className="text-xs text-muted-foreground">
                                            Authoritative total recorded in database
                                        </span>
                                        <span className="text-base font-bold text-foreground">
                                            Total: ₹{orderDetail.total_amount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment & Fulfillment Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Payment Details */}
                                <Card className="p-4 bg-muted/20 border-border/60">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                                        <CreditCard className="w-3.5 h-3.5 text-primary" /> Payment Architecture
                                    </h4>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Method:</span>
                                            <PaymentMethodBadge method={orderDetail.payment_method} />
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Payment Status:</span>
                                            <PaymentStatusBadge status={orderDetail.payment_status} />
                                        </div>
                                        {orderDetail.notes && (
                                            <div className="pt-2 border-t border-border/40">
                                                <span className="text-muted-foreground block mb-0.5">Payment Notes / Gateway Reference:</span>
                                                <p className="font-mono bg-background p-1.5 rounded text-[11px] break-all border">
                                                    {orderDetail.notes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Card>

                                {/* Delivery & Fulfillment */}
                                <Card className="p-4 bg-muted/20 border-border/60">
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                                        <Truck className="w-3.5 h-3.5 text-primary" /> Delivery Linkage
                                    </h4>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Scheduled Date:</span>
                                            <span className="font-semibold">{orderDetail.delivery_date}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Delivery Status:</span>
                                            <Badge variant="outline" className="capitalize">
                                                {orderDetail.delivery_status || 'Unassigned'}
                                            </Badge>
                                        </div>
                                        {orderDetail.delivery?.delivery_partner_name && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Delivery Partner:</span>
                                                <span className="font-medium">{orderDetail.delivery.delivery_partner_name}</span>
                                            </div>
                                        )}
                                        {orderDetail.delivery_id && (
                                            <div className="pt-2 border-t border-border/40">
                                                <span className="text-muted-foreground block mb-0.5">Linked Delivery ID:</span>
                                                <p className="font-mono text-[11px] truncate text-muted-foreground">
                                                    {orderDetail.delivery_id}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            {/* Timestamps */}
                            <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-md">
                                <span>Placed: {format(parseISO(orderDetail.created_at), 'PPP p')}</span>
                                <span>Last Updated: {format(parseISO(orderDetail.updated_at), 'PPP p')}</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center border-t pt-4">
                        <div className="flex items-center gap-2">
                            {orderDetail && orderDetail.status !== 'delivered' && orderDetail.status !== 'cancelled' && (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setStatusModalOrder(orderDetail);
                                            setNewStatus(orderDetail.status === 'confirmed' ? 'scheduled' : 'delivered');
                                        }}
                                        className="text-xs"
                                    >
                                        Update Status
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            setCancelModalOrder(orderDetail);
                                            setCancelReason('');
                                        }}
                                        className="text-xs"
                                    >
                                        Cancel Order
                                    </Button>
                                </>
                            )}
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* 2. UPDATE ORDER STATUS MODAL */}
            {/* ========================================================================= */}
            <Dialog open={!!statusModalOrder} onOpenChange={(open) => !open && setStatusModalOrder(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Update Order Status</DialogTitle>
                        <DialogDescription>
                            Authoritatively progress order #{statusModalOrder?.id.slice(0, 8)} in Supabase.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5 text-xs">
                            <span className="text-muted-foreground">Current Status:</span>
                            <div>
                                {statusModalOrder && <OrderStatusBadge status={statusModalOrder.status} />}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status-select">Select New Status</Label>
                            <Select
                                value={newStatus}
                                onValueChange={(val) => setNewStatus(val as 'scheduled' | 'delivered')}
                            >
                                <SelectTrigger id="status-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">Scheduled (In Delivery Queue)</SelectItem>
                                    <SelectItem value="delivered">Delivered (Fulfillment Completed)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {newStatus === 'delivered' && (
                            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-md text-xs space-y-1 border border-emerald-200">
                                <p className="font-semibold flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Fulfillment Impact
                                </p>
                                <p>• Marks order as permanently delivered (protected from subsequent cancellation).</p>
                                {statusModalOrder?.payment_method === 'cod' && (
                                    <p>• Automatically settles pending Cash-on-Delivery payment to Paid.</p>
                                )}
                                <p>• Synchronizes linked delivery record to delivered with audit timestamp.</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setStatusModalOrder(null)}
                            disabled={updateStatusMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleStatusSubmit}
                            disabled={updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending ? 'Updating...' : 'Confirm Status Update'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* 3. CANCEL ORDER MODAL (ATOMIC REFUND & AUDIT LOG) */}
            {/* ========================================================================= */}
            <Dialog open={!!cancelModalOrder} onOpenChange={(open) => !open && setCancelModalOrder(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" /> Cancel Customer Order
                        </DialogTitle>
                        <DialogDescription>
                            Confirm cancellation for order #{cancelModalOrder?.id.slice(0, 8)}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="p-3 bg-destructive/10 rounded-md text-xs space-y-1.5 border border-destructive/20 text-destructive">
                            <p className="font-semibold">Authoritative Cancellation Guards:</p>
                            <p>• Historical order record is preserved (never deleted).</p>
                            {cancelModalOrder?.payment_method === 'wallet' && cancelModalOrder.payment_status === 'paid' ? (
                                <p className="font-bold text-emerald-700">
                                    • Wallet Order: Full amount of ₹{cancelModalOrder.total_amount.toFixed(2)} will be atomically refunded to customer wallet balance.
                                </p>
                            ) : (
                                <p>• Non-wallet / unpaid order will be marked cancelled with no wallet deduction.</p>
                            )}
                            <p>• Any upcoming linked delivery will be updated to cancelled.</p>
                            <p>• Admin action is permanently logged to admin_logs.</p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="cancel-reason" className="text-xs">
                                Cancellation Reason (Recorded in audit logs)
                            </Label>
                            <Textarea
                                id="cancel-reason"
                                placeholder="e.g. Customer requested cancellation / address unreachable"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="text-xs h-20"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCancelModalOrder(null)}
                            disabled={cancelOrderMutation.isPending}
                        >
                            Dismiss
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancelSubmit}
                            disabled={cancelOrderMutation.isPending}
                        >
                            {cancelOrderMutation.isPending ? 'Processing...' : 'Confirm Order Cancellation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
