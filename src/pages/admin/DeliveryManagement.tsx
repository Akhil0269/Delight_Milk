// Upgraded Delivery Management Page - Admin can assign, reassign, unassign, and monitor deliveries
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    useAdminDeliveries,
    useAssignDeliveryBoy,
    useUnassignDeliveryBoy,
    useDeliveryBoys,
    useUpdateDeliveryStatus,
} from "@/hooks/useAdmin";
import {
    Truck,
    Calendar,
    MapPin,
    Search,
    UserCheck,
    UserX,
    RotateCcw,
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    Phone,
    RefreshCw,
    ExternalLink,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface AdminDeliveryItem {
    id: string;
    user_id: string;
    product_id: string;
    order_id?: string | null;
    subscription_id?: string | null;
    quantity: number;
    price_per_unit: number;
    delivery_date: string;
    status: "upcoming" | "in_progress" | "delivered" | "failed" | "cancelled" | string;
    delivery_boy_id?: string | null;
    delivery_partner_name?: string | null;
    assigned_at?: string | null;
    delivery_time?: string | null;
    notes?: string | null;
    area?: string | null;
    created_at: string;
    delivery_type?: string;
    user?: {
        full_name?: string | null;
        email?: string | null;
        phone?: string | null;
        address?: string | null;
    };
    product?: {
        product_name?: string;
        unit?: string;
    };
    delivery_boy?: {
        id?: string | null;
        full_name?: string | null;
        phone?: string | null;
    };
}

export default function DeliveryManagement() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [assignmentFilter, setAssignmentFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const { data: rawDeliveries = [], isLoading, isError, error, refetch } = useAdminDeliveries(selectedDate);
    const deliveries = (rawDeliveries as unknown) as AdminDeliveryItem[];
    const { data: deliveryBoys = [] } = useDeliveryBoys();

    const assignMutation = useAssignDeliveryBoy();
    const unassignMutation = useUnassignDeliveryBoy();
    const updateStatusMutation = useUpdateDeliveryStatus();

    // Assign / Reassign Dialog State
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<AdminDeliveryItem | null>(null);
    const [selectedBoyId, setSelectedBoyId] = useState("");
    const [assignNotes, setAssignNotes] = useState("");

    // Unassign Dialog State
    const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
    const [unassignReason, setUnassignReason] = useState("");

    // Status Update Dialog State
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [targetNewStatus, setTargetNewStatus] = useState<"upcoming" | "in_progress" | "delivered" | "failed" | "cancelled">("delivered");
    const [statusNotes, setStatusNotes] = useState("");

    // Active unblocked delivery boys
    const activeDeliveryBoys = useMemo(() => {
        return deliveryBoys.filter((b) => !b.is_blocked);
    }, [deliveryBoys]);

    // Filtered deliveries
    const filteredDeliveries = useMemo(() => {
        let result = deliveries;

        // Assignment filter
        if (assignmentFilter === "assigned") {
            result = result.filter((d: AdminDeliveryItem) => Boolean(d.delivery_boy_id));
        } else if (assignmentFilter === "unassigned") {
            result = result.filter((d: AdminDeliveryItem) => !d.delivery_boy_id);
        }

        // Status filter
        if (statusFilter !== "all") {
            result = result.filter((d: AdminDeliveryItem) => d.status === statusFilter);
        }

        // Search query
        const q = searchQuery.toLowerCase().trim();
        if (q) {
            result = result.filter((d: AdminDeliveryItem) => {
                const userName = d.user?.full_name?.toLowerCase() || "";
                const userPhone = d.user?.phone || "";
                const userAddress = d.user?.address?.toLowerCase() || "";
                const productName = d.product?.product_name?.toLowerCase() || "";
                const boyName = d.delivery_boy?.full_name?.toLowerCase() || "";
                const idMatch = d.id?.toLowerCase().includes(q) || (d.order_id && d.order_id.toLowerCase().includes(q));

                return (
                    userName.includes(q) ||
                    userPhone.includes(q) ||
                    userAddress.includes(q) ||
                    productName.includes(q) ||
                    boyName.includes(q) ||
                    idMatch
                );
            });
        }

        return result;
    }, [deliveries, assignmentFilter, statusFilter, searchQuery]);

    // Stats calculations
    const stats = useMemo(() => {
        const total = deliveries.length;
        const unassigned = deliveries.filter((d: AdminDeliveryItem) => !d.delivery_boy_id).length;
        const assigned = deliveries.filter((d: AdminDeliveryItem) => Boolean(d.delivery_boy_id)).length;
        const upcoming = deliveries.filter((d: AdminDeliveryItem) => d.status === "upcoming").length;
        const inProgress = deliveries.filter((d: AdminDeliveryItem) => d.status === "in_progress").length;
        const delivered = deliveries.filter((d: AdminDeliveryItem) => d.status === "delivered").length;
        const failedOrCancelled = deliveries.filter(
            (d: AdminDeliveryItem) => d.status === "failed" || d.status === "cancelled"
        ).length;

        return { total, unassigned, assigned, upcoming, inProgress, delivered, failedOrCancelled };
    }, [deliveries]);

    const handleOpenAssign = (delivery: AdminDeliveryItem) => {
        setSelectedDelivery(delivery);
        setSelectedBoyId(delivery.delivery_boy_id || "");
        setAssignNotes("");
        setAssignDialogOpen(true);
    };

    const handleSaveAssignment = async () => {
        if (!selectedDelivery || !selectedBoyId) return;
        await assignMutation.mutateAsync({
            deliveryId: selectedDelivery.id,
            deliveryBoyId: selectedBoyId,
            notes: assignNotes.trim() || undefined,
        });
        setAssignDialogOpen(false);
        setSelectedDelivery(null);
    };

    const handleOpenUnassign = (delivery: AdminDeliveryItem) => {
        setSelectedDelivery(delivery);
        setUnassignReason("");
        setUnassignDialogOpen(true);
    };

    const handleConfirmUnassign = async () => {
        if (!selectedDelivery) return;
        await unassignMutation.mutateAsync({
            deliveryId: selectedDelivery.id,
            reason: unassignReason.trim() || undefined,
        });
        setUnassignDialogOpen(false);
        setSelectedDelivery(null);
    };

    const handleOpenStatusDialog = (delivery: AdminDeliveryItem, status: "upcoming" | "in_progress" | "delivered" | "failed" | "cancelled") => {
        setSelectedDelivery(delivery);
        setTargetNewStatus(status);
        setStatusNotes("");
        setStatusDialogOpen(true);
    };

    const handleConfirmStatusUpdate = async () => {
        if (!selectedDelivery) return;
        await updateStatusMutation.mutateAsync({
            deliveryId: selectedDelivery.id,
            newStatus: targetNewStatus,
            notes: statusNotes.trim() || undefined,
        });
        setStatusDialogOpen(false);
        setSelectedDelivery(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "upcoming":
                return (
                    <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50/50">
                        Upcoming
                    </Badge>
                );
            case "in_progress":
                return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">In Progress</Badge>;
            case "delivered":
                return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Delivered</Badge>;
            case "cancelled":
                return <Badge variant="destructive">Cancelled</Badge>;
            case "failed":
                return <Badge variant="destructive">Failed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6 p-1 md:p-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Truck className="w-8 h-8 text-primary" />
                        Delivery Management
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Assign, reassign, and track daily delivery routes and worker workloads.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <div className="flex items-center gap-2 bg-card border rounded-md px-3 py-1.5 shadow-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <Card>
                    <CardContent className="p-3.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Total</p>
                        <p className="text-xl font-bold mt-0.5">{stats.total}</p>
                    </CardContent>
                </Card>
                <Card className={stats.unassigned > 0 ? "border-amber-300 bg-amber-50/20" : ""}>
                    <CardContent className="p-3.5">
                        <p className="text-xs font-medium text-amber-700 uppercase">Unassigned</p>
                        <p className="text-xl font-bold mt-0.5 text-amber-800">{stats.unassigned}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Assigned</p>
                        <p className="text-xl font-bold mt-0.5 text-blue-600">{stats.assigned}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase">In Progress</p>
                        <p className="text-xl font-bold mt-0.5 text-amber-600">{stats.inProgress}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Delivered</p>
                        <p className="text-xl font-bold mt-0.5 text-emerald-600">{stats.delivered}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3.5">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Issues</p>
                        <p className="text-xl font-bold mt-0.5 text-rose-600">{stats.failedOrCancelled}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by customer, phone, address, product, or worker..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Assignment" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Assignments</SelectItem>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Deliveries List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-5">
                            <Skeleton className="h-16 w-full" />
                        </Card>
                    ))}
                </div>
            ) : isError ? (
                <Card className="p-8 text-center border-destructive/20 bg-destructive/5">
                    <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="font-semibold text-destructive">Failed to load deliveries</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {(error as Error)?.message || "An unexpected error occurred"}
                    </p>
                    <Button variant="outline" onClick={() => refetch()} className="mt-4">
                        Retry
                    </Button>
                </Card>
            ) : filteredDeliveries.length === 0 ? (
                <Card className="p-12 text-center">
                    <Truck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg">No deliveries found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery || statusFilter !== "all" || assignmentFilter !== "all"
                            ? "No deliveries match your active filters."
                            : `No deliveries scheduled for ${format(new Date(selectedDate), "MMMM d, yyyy")}.`}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredDeliveries.map((delivery: AdminDeliveryItem) => {
                        const isDelivered = delivery.status === "delivered";
                        const isCancelled = delivery.status === "cancelled";
                        const isTerminal = isDelivered || isCancelled;
                        const isAssigned = Boolean(delivery.delivery_boy_id);

                        return (
                            <Card
                                key={delivery.id}
                                className={`transition-all hover:shadow-sm ${
                                    !isAssigned && !isTerminal ? "border-amber-300/80 bg-amber-50/10" : ""
                                }`}
                            >
                                <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Left: Customer & Product Info */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-base text-foreground">
                                                {delivery.user?.full_name || "Customer"}
                                            </span>
                                            {getStatusBadge(delivery.status)}
                                            {delivery.delivery_type && (
                                                <Badge variant="outline" className="text-[10px] uppercase">
                                                    {delivery.delivery_type}
                                                </Badge>
                                            )}
                                            {delivery.order_id && (
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    #{delivery.order_id.slice(0, 8)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <p className="font-medium text-foreground">
                                                {delivery.product?.product_name} × {delivery.quantity}{" "}
                                                {delivery.product?.unit}
                                            </p>
                                            {delivery.user?.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    <span>{delivery.user.phone}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>6:00 AM – 8:00 AM</span>
                                            </div>
                                        </div>

                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80" />
                                            <span className="truncate max-w-md">
                                                {delivery.user?.address || "Address not provided"}
                                            </span>
                                            {delivery.user?.address && (
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                        delivery.user.address
                                                    )}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline text-[11px] flex items-center gap-0.5 ml-1"
                                                >
                                                    Map <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Middle: Delivery Worker Assignment info */}
                                    <div className="flex flex-col sm:items-end justify-center min-w-[200px] border-t sm:border-t-0 sm:border-l sm:pl-4 pt-3 sm:pt-0">
                                        <div className="text-xs text-muted-foreground">Assigned Worker</div>
                                        {isAssigned ? (
                                            <div className="text-sm font-semibold flex items-center gap-1.5 mt-0.5">
                                                <UserCheck className="w-4 h-4 text-emerald-600" />
                                                <span>{delivery.delivery_boy?.full_name}</span>
                                            </div>
                                        ) : (
                                            <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50/50 mt-1">
                                                Unassigned
                                            </Badge>
                                        )}
                                        {delivery.delivery_boy?.phone && (
                                            <span className="text-[11px] text-muted-foreground mt-0.5">
                                                {delivery.delivery_boy.phone}
                                            </span>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                                        {!isTerminal && (
                                            <>
                                                {isAssigned ? (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleOpenAssign(delivery)}
                                                            className="gap-1.5 h-8 text-xs"
                                                            title="Reassign to another delivery boy"
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                            Reassign
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleOpenUnassign(delivery)}
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2 text-xs"
                                                            title="Unassign delivery boy"
                                                        >
                                                            <UserX className="w-3.5 h-3.5" />
                                                            Unassign
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleOpenAssign(delivery)}
                                                        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-8 text-xs"
                                                    >
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                        Assign Boy
                                                    </Button>
                                                )}

                                                {/* Status transition controls */}
                                                {delivery.status === "upcoming" && (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => handleOpenStatusDialog(delivery, "in_progress")}
                                                        className="h-8 text-xs"
                                                    >
                                                        Start Route
                                                    </Button>
                                                )}
                                                {delivery.status === "in_progress" && (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => handleOpenStatusDialog(delivery, "delivered")}
                                                        className="h-8 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                                    >
                                                        Mark Delivered
                                                    </Button>
                                                )}
                                            </>
                                        )}
                                        {isDelivered && (
                                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                                <CheckCircle2 className="w-4 h-4" /> Completed
                                            </span>
                                        )}
                                        {isCancelled && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <XCircle className="w-4 h-4 text-rose-500" /> Cancelled
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Assign / Reassign Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-primary" />
                            {selectedDelivery?.delivery_boy_id ? "Reassign Delivery Boy" : "Assign Delivery Boy"}
                        </DialogTitle>
                        <DialogDescription>
                            Select a delivery worker for this morning route. Workload counts reflect active
                            deliveries.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {selectedDelivery?.delivery_boy_id && (
                            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-md text-xs space-y-1">
                                <p className="font-semibold">Reassignment Notice</p>
                                <p>
                                    Currently assigned to:{" "}
                                    <strong>{selectedDelivery.delivery_boy?.full_name}</strong>. Reassigning
                                    will notify both workers and log an audit record.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Choose Delivery Worker</Label>
                            {activeDeliveryBoys.length === 0 ? (
                                <p className="text-xs text-muted-foreground p-3 border rounded-md bg-muted/40">
                                    No active delivery personnel available. Please add or unsuspend workers in
                                    Delivery Boys management.
                                </p>
                            ) : (
                                <Select value={selectedBoyId} onValueChange={setSelectedBoyId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select delivery boy" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {activeDeliveryBoys.map((boy) => (
                                            <SelectItem key={boy.user_id} value={boy.user_id}>
                                                {boy.full_name || boy.email} (Active: {boy.active_deliveries_count},
                                                Done: {boy.completed_deliveries_count})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Optional Notes</Label>
                            <Textarea
                                placeholder="E.g., Morning milk drop at gate, gate code #412..."
                                value={assignNotes}
                                onChange={(e) => setAssignNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAssignDialogOpen(false);
                                setSelectedDelivery(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveAssignment}
                            disabled={!selectedBoyId || assignMutation.isPending}
                        >
                            {assignMutation.isPending
                                ? "Saving..."
                                : selectedDelivery?.delivery_boy_id
                                ? "Confirm Reassignment"
                                : "Assign Delivery"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Unassign Confirmation Dialog */}
            <Dialog open={unassignDialogOpen} onOpenChange={setUnassignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <UserX className="w-5 h-5 text-destructive" />
                            Unassign Delivery Boy
                        </DialogTitle>
                        <DialogDescription>
                            Remove the current assignment for this delivery. The delivery will return to
                            unassigned status.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-sm text-muted-foreground">
                        <p>
                            Delivery will remain intact. The worker will be notified that the delivery is no
                            longer assigned to them.
                        </p>
                        <div className="space-y-2">
                            <Label>Unassignment Reason (Optional)</Label>
                            <Input
                                placeholder="Reason for unassigning (e.g., worker unavailable, route shift)..."
                                value={unassignReason}
                                onChange={(e) => setUnassignReason(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setUnassignDialogOpen(false);
                                setSelectedDelivery(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmUnassign}
                            disabled={unassignMutation.isPending}
                        >
                            {unassignMutation.isPending ? "Unassigning..." : "Confirm Unassign"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Status Update Dialog */}
            <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-primary" />
                            Update Delivery Status
                        </DialogTitle>
                        <DialogDescription>
                            Advance the canonical delivery status for delivery #{selectedDelivery?.id?.slice(0, 8)}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Target Status</Label>
                            <Select value={targetNewStatus} onValueChange={setTargetNewStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Optional Notes</Label>
                            <Input
                                placeholder="E.g., Left at door, customer requested..."
                                value={statusNotes}
                                onChange={(e) => setStatusNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setStatusDialogOpen(false);
                                setSelectedDelivery(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirmStatusUpdate}
                            disabled={updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
