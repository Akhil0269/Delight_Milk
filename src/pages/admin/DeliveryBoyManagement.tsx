import { useState, useMemo } from "react";
import {
    useDeliveryBoys,
    useAdminUsers,
    usePromoteUser,
    useDemoteUser,
    useBlockUser,
    DeliveryBoyWorkloadItem,
} from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Truck,
    Search,
    UserPlus,
    UserMinus,
    AlertTriangle,
    Mail,
    Phone,
    PackageCheck,
    Clock,
    Ban,
    CheckCircle2,
    RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

export default function DeliveryBoyManagement() {
    const { data: deliveryBoys = [], isLoading, isError, error, refetch } = useDeliveryBoys();
    const { data: allUsers = [], isLoading: isLoadingUsers } = useAdminUsers();

    const promoteUser = usePromoteUser();
    const demoteUser = useDemoteUser();
    const blockUser = useBlockUser();

    const [searchQuery, setSearchQuery] = useState("");
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [removeTarget, setRemoveTarget] = useState<DeliveryBoyWorkloadItem | null>(null);

    // Eligible users for promotion to delivery boy
    const eligibleUsers = useMemo(() => {
        const workerUserIds = new Set(deliveryBoys.map((w) => w.user_id));
        return allUsers.filter((u) => !workerUserIds.has(u.user_id) && !u.is_blocked);
    }, [deliveryBoys, allUsers]);

    // Filtered delivery boys by search
    const filteredWorkers = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return deliveryBoys;
        return deliveryBoys.filter(
            (w) =>
                (w.full_name && w.full_name.toLowerCase().includes(q)) ||
                (w.email && w.email.toLowerCase().includes(q)) ||
                (w.phone && w.phone.includes(q))
        );
    }, [deliveryBoys, searchQuery]);

    const handlePromote = async () => {
        if (!selectedUserId) return;
        await promoteUser.mutateAsync({ userId: selectedUserId, role: "delivery_boy" });
        setAddModalOpen(false);
        setSelectedUserId("");
    };

    const handleDemote = async () => {
        if (!removeTarget) return;
        await demoteUser.mutateAsync({ userId: removeTarget.user_id, role: "delivery_boy" });
        setRemoveTarget(null);
    };

    const handleToggleBlock = async (worker: DeliveryBoyWorkloadItem) => {
        await blockUser.mutateAsync({
            userId: worker.user_id,
            block: !worker.is_blocked,
        });
        refetch();
    };

    return (
        <div className="space-y-6 p-1 md:p-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Truck className="w-8 h-8 text-blue-600" />
                        Delivery Workforce Management
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Manage delivery personnel, assignments, active workloads, and account access.
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
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => setAddModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Delivery Boy
                    </Button>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="border border-blue-100 bg-blue-50/30">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                            Total Delivery Workers
                        </p>
                        <p className="text-2xl font-bold mt-1 text-blue-900">{deliveryBoys.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Active Workers
                        </p>
                        <p className="text-2xl font-bold mt-1 text-emerald-600">
                            {deliveryBoys.filter((w) => !w.is_blocked).length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Active Deliveries
                        </p>
                        <p className="text-2xl font-bold mt-1 text-amber-600">
                            {deliveryBoys.reduce((acc, w) => acc + (w.active_deliveries_count || 0), 0)}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Completed Deliveries
                        </p>
                        <p className="text-2xl font-bold mt-1 text-blue-600">
                            {deliveryBoys.reduce((acc, w) => acc + (w.completed_deliveries_count || 0), 0)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search delivery personnel by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Content area */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-4">
                            <Skeleton className="h-12 w-full" />
                        </Card>
                    ))}
                </div>
            ) : isError ? (
                <Card className="p-8 text-center border-destructive/20 bg-destructive/5">
                    <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="font-semibold text-destructive">Failed to load delivery workforce</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {(error as Error)?.message || "An unexpected error occurred"}
                    </p>
                    <Button variant="outline" onClick={() => refetch()} className="mt-4">
                        Retry
                    </Button>
                </Card>
            ) : filteredWorkers.length === 0 ? (
                <Card className="p-12 text-center">
                    <Truck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg">No delivery personnel found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery
                            ? `No delivery personnel match "${searchQuery}".`
                            : "No delivery workers currently registered. Click 'Add Delivery Boy' to assign one."}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredWorkers.map((worker) => {
                        const hasActive = worker.active_deliveries_count > 0;

                        return (
                            <Card
                                key={worker.id}
                                className={`transition-all hover:shadow-md ${
                                    worker.is_blocked ? "border-rose-200 bg-rose-50/10" : ""
                                }`}
                            >
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <h3 className="font-semibold text-base leading-tight">
                                                {worker.full_name || "Delivery Partner"}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant={worker.is_blocked ? "destructive" : "default"}
                                                    className={
                                                        worker.is_blocked
                                                            ? ""
                                                            : "bg-blue-600 hover:bg-blue-700 text-white"
                                                    }
                                                >
                                                    {worker.is_blocked ? "Suspended" : "Delivery Boy"}
                                                </Badge>
                                                {worker.is_blocked && (
                                                    <span className="text-[11px] text-destructive font-medium">
                                                        No assignments allowed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleBlock(worker)}
                                                className={`h-8 px-2 ${
                                                    worker.is_blocked
                                                        ? "text-emerald-600 hover:bg-emerald-50"
                                                        : "text-amber-600 hover:bg-amber-50"
                                                }`}
                                                title={worker.is_blocked ? "Unsuspend Account" : "Suspend Account"}
                                            >
                                                {worker.is_blocked ? (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                ) : (
                                                    <Ban className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setRemoveTarget(worker)}
                                                disabled={demoteUser.isPending}
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                                                title="Remove delivery boy role"
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Workload stats */}
                                    <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border text-xs">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                                            <div>
                                                <p className="text-muted-foreground">Active Load</p>
                                                <p className="font-semibold text-sm">
                                                    {worker.active_deliveries_count} deliveries
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <div>
                                                <p className="text-muted-foreground">Completed</p>
                                                <p className="font-semibold text-sm">
                                                    {worker.completed_deliveries_count} deliveries
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact & Meta */}
                                    <div className="space-y-1.5 text-xs text-muted-foreground border-t pt-3">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">{worker.email || "No email"}</span>
                                        </div>
                                        {worker.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                                <span>{worker.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 shrink-0" />
                                            <span>
                                                Joined:{" "}
                                                {worker.created_at
                                                    ? format(new Date(worker.created_at), "MMM d, yyyy")
                                                    : "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add Delivery Boy Dialog */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-blue-600" />
                            Assign Delivery Boy Role
                        </DialogTitle>
                        <DialogDescription>
                            Assign delivery partner permissions to an existing authenticated user. They will be
                            able to view assigned routes and update delivery statuses.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select User Account</label>
                            {isLoadingUsers ? (
                                <Skeleton className="h-10 w-full" />
                            ) : eligibleUsers.length === 0 ? (
                                <p className="text-xs text-muted-foreground p-3 border rounded-md bg-muted/40">
                                    No eligible non-worker users found.
                                </p>
                            ) : (
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose an active user" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {eligibleUsers.map((u) => (
                                            <SelectItem key={u.user_id} value={u.user_id}>
                                                {u.full_name || u.email || "Unnamed User"} (
                                                {u.email || u.phone || "No contact"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAddModalOpen(false);
                                setSelectedUserId("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePromote}
                            disabled={!selectedUserId || promoteUser.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {promoteUser.isPending ? "Assigning..." : "Assign Delivery Role"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Delivery Boy Confirmation Dialog */}
            <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Remove Delivery Boy Role
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove the delivery partner role from{" "}
                            <strong className="text-foreground">
                                {removeTarget?.full_name || removeTarget?.email || "this worker"}
                            </strong>
                            ?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 text-sm text-muted-foreground space-y-2">
                        <p>
                            The user account will NOT be deleted. They will safely retain standard customer
                            access to the application.
                        </p>
                        {removeTarget && removeTarget.active_deliveries_count > 0 && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-semibold space-y-1">
                                <p>
                                    Warning: This worker currently has{" "}
                                    <strong>{removeTarget.active_deliveries_count} active assigned deliveries</strong>.
                                </p>
                                <p>
                                    The system will reject role removal until those deliveries are reassigned
                                    or unassigned.
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRemoveTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDemote}
                            disabled={demoteUser.isPending}
                        >
                            {demoteUser.isPending ? "Removing..." : "Remove Role"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
