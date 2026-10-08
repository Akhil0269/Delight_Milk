import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDeliveryBoyDeliveries, useUpdateDeliveryStatus } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Truck,
    Calendar,
    MapPin,
    Phone,
    CheckCircle2,
    Clock,
    Package,
    Navigation,
    AlertTriangle,
    RefreshCw,
    ShieldOff,
} from "lucide-react";
import { format } from "date-fns";

interface WorkerDeliveryItem {
    id: string;
    user_id: string;
    product_id: string;
    order_id?: string | null;
    subscription_id?: string | null;
    quantity: number;
    price_per_unit: number;
    delivery_date: string;
    status: "upcoming" | "in_progress" | "delivered" | "failed" | "cancelled" | string;
    delivery_time?: string | null;
    notes?: string | null;
    area?: string | null;
    created_at: string;
    customer?: {
        full_name?: string | null;
        phone?: string | null;
        address?: string | null;
    };
    product?: {
        product_name?: string;
        unit?: string;
    };
}

export default function DeliveryBoyPortal() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

    // Verify the caller has delivery worker role via DB RPC
    const { data: workerProfile, isLoading: isVerifyingRole } = useQuery({
        queryKey: ["delivery-worker-profile-check", user?.id],
        queryFn: async () => {
            const { data, error } = await supabase.rpc("get_my_delivery_worker_profile");
            if (error) throw error;
            return data as { is_worker: boolean; is_blocked: boolean; error?: string; full_name?: string };
        },
        enabled: Boolean(user?.id),
        staleTime: 60_000, // 1 min
    });

    const { data: rawDeliveries = [], isLoading, isError, error, refetch } = useDeliveryBoyDeliveries(selectedDate);
    const deliveries = (rawDeliveries as unknown) as WorkerDeliveryItem[];
    const updateStatusMutation = useUpdateDeliveryStatus();

    // Delivery completion modal state
    const [completeModalOpen, setCompleteModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<WorkerDeliveryItem | null>(null);
    const [completionNotes, setCompletionNotes] = useState("");
    const [proofUrl, setProofUrl] = useState("");

    // Metrics
    const metrics = useMemo(() => {
        const total = deliveries.length;
        const upcoming = deliveries.filter((d: WorkerDeliveryItem) => d.status === "upcoming").length;
        const inProgress = deliveries.filter((d: WorkerDeliveryItem) => d.status === "in_progress").length;
        const delivered = deliveries.filter((d: WorkerDeliveryItem) => d.status === "delivered").length;
        return { total, upcoming, inProgress, delivered };
    }, [deliveries]);

    const handleStartDelivery = async (deliveryId: string) => {
        await updateStatusMutation.mutateAsync({
            deliveryId,
            newStatus: "in_progress",
        });
    };

    const handleOpenCompleteModal = (delivery: WorkerDeliveryItem) => {
        setSelectedDelivery(delivery);
        setCompletionNotes("");
        setProofUrl("");
        setCompleteModalOpen(true);
    };

    const handleConfirmComplete = async () => {
        if (!selectedDelivery) return;
        await updateStatusMutation.mutateAsync({
            deliveryId: selectedDelivery.id,
            newStatus: "delivered",
            notes: completionNotes.trim() || undefined,
            proofUrl: proofUrl.trim() || undefined,
        });
        setCompleteModalOpen(false);
        setSelectedDelivery(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "upcoming":
                return <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50/50">Upcoming</Badge>;
            case "in_progress":
                return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Out for Delivery</Badge>;
            case "delivered":
                return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Delivered</Badge>;
            case "failed":
                return <Badge variant="destructive">Failed</Badge>;
            case "cancelled":
                return <Badge variant="destructive">Cancelled</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Show loading spinner while verifying role
    if (isVerifyingRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center animate-pulse">
                        <Truck className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Verifying delivery worker access...</p>
                </div>
            </div>
        );
    }

    // Access denied: user is not a delivery worker or is suspended
    if (workerProfile && !workerProfile.is_worker) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="max-w-md w-full p-8 text-center border-destructive/20 bg-destructive/5">
                    <ShieldOff className="w-12 h-12 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-destructive mb-2">Access Denied</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        {workerProfile.error || "You do not have delivery worker privileges to access this portal."}
                    </p>
                    <Button variant="outline" onClick={() => navigate("/dashboard")}>
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    // Suspended worker
    if (workerProfile?.is_worker && workerProfile?.is_blocked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="max-w-md w-full p-8 text-center border-amber-200 bg-amber-50/30">
                    <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-amber-800 mb-2">Account Suspended</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Your delivery worker account has been suspended. Contact your administrator.
                    </p>
                    <Button variant="outline" onClick={() => navigate("/dashboard")}>
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-muted/20 pb-12">
            {/* Top Bar */}
            <header className="bg-card border-b sticky top-0 z-10 shadow-xs">
                <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                            <Truck className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="font-bold text-base leading-tight">Delivery Worker Portal</h1>
                            <p className="text-xs text-muted-foreground">Delight Milk Logistics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isLoading}
                            className="h-8 w-8"
                            title="Refresh Route"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        </Button>
                        <div className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-md text-xs font-medium">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent focus:outline-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Metric Summary */}
                <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
                    <Card className="text-center p-3 sm:p-4">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase">Assigned</p>
                        <p className="text-xl sm:text-2xl font-bold mt-0.5">{metrics.total}</p>
                    </Card>
                    <Card className="text-center p-3 sm:p-4">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase">Pending</p>
                        <p className="text-xl sm:text-2xl font-bold mt-0.5 text-blue-600">{metrics.upcoming}</p>
                    </Card>
                    <Card className="text-center p-3 sm:p-4">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase">Active</p>
                        <p className="text-xl sm:text-2xl font-bold mt-0.5 text-amber-600">{metrics.inProgress}</p>
                    </Card>
                    <Card className="text-center p-3 sm:p-4">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase">Done</p>
                        <p className="text-xl sm:text-2xl font-bold mt-0.5 text-emerald-600">{metrics.delivered}</p>
                    </Card>
                </div>

                {/* Route Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">
                            Assigned Route ({format(new Date(selectedDate), "EEE, MMM d")})
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {deliveries.length} drop{deliveries.length === 1 ? "" : "s"}
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="p-5">
                                    <Skeleton className="h-20 w-full" />
                                </Card>
                            ))}
                        </div>
                    ) : isError ? (
                        <Card className="p-8 text-center border-destructive/20 bg-destructive/5">
                            <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                            <p className="font-semibold text-destructive">Failed to load route</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {(error as Error)?.message || "Network error"}
                            </p>
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
                                Retry
                            </Button>
                        </Card>
                    ) : deliveries.length === 0 ? (
                        <Card className="p-12 text-center">
                            <CheckCircle2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <h3 className="font-semibold text-base">No deliveries assigned for this date</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                You do not have any deliveries scheduled on this date.
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {deliveries.map((delivery: WorkerDeliveryItem, idx: number) => {
                                const isDelivered = delivery.status === "delivered";
                                const isUpcoming = delivery.status === "upcoming";
                                const isInProgress = delivery.status === "in_progress";

                                return (
                                    <Card
                                        key={delivery.id}
                                        className={`transition-all ${
                                            isDelivered
                                                ? "opacity-75 bg-muted/20"
                                                : isInProgress
                                                ? "border-amber-400 bg-amber-50/10 shadow-sm"
                                                : ""
                                        }`}
                                    >
                                        <CardContent className="p-4 sm:p-5 space-y-3.5">
                                            {/* Stop number & status */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-muted font-bold text-xs flex items-center justify-center">
                                                        #{idx + 1}
                                                    </span>
                                                    <span className="font-semibold text-base">
                                                        {delivery.customer?.full_name || "Customer"}
                                                    </span>
                                                </div>
                                                {getStatusBadge(delivery.status)}
                                            </div>

                                            {/* Product details */}
                                            <div className="flex items-center gap-2 text-sm bg-muted/30 p-2.5 rounded-md">
                                                <Package className="w-4 h-4 text-blue-600 shrink-0" />
                                                <span className="font-medium text-foreground">
                                                    {delivery.product?.product_name}
                                                </span>
                                                <span className="text-muted-foreground">×</span>
                                                <span className="font-bold">
                                                    {delivery.quantity} {delivery.product?.unit}
                                                </span>
                                                <div className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    6:00 – 8:00 AM
                                                </div>
                                            </div>

                                            {/* Address & Navigation */}
                                            <div className="space-y-2 text-xs text-muted-foreground">
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                                    <span className="text-foreground leading-relaxed">
                                                        {delivery.customer?.address || "Address not specified"}
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    {delivery.customer?.phone && (
                                                        <a
                                                            href={`tel:${delivery.customer.phone}`}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-foreground hover:bg-muted/80 font-medium"
                                                        >
                                                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                                            Call {delivery.customer.phone}
                                                        </a>
                                                    )}
                                                    {delivery.customer?.address && (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                                delivery.customer.address
                                                            )}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                                                        >
                                                            <Navigation className="w-3.5 h-3.5" />
                                                            Navigate Maps
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            {!isDelivered && (
                                                <div className="pt-2 border-t flex items-center gap-2">
                                                    {isUpcoming && (
                                                        <Button
                                                            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                                                            onClick={() => handleStartDelivery(delivery.id)}
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            Start Delivery
                                                        </Button>
                                                    )}
                                                    {isInProgress && (
                                                        <Button
                                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                                            onClick={() => handleOpenCompleteModal(delivery)}
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            Complete Delivery
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            {isDelivered && (
                                                <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded flex items-center justify-between">
                                                    <span className="font-medium flex items-center gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Successfully Delivered
                                                    </span>
                                                    {delivery.delivery_time && (
                                                        <span>
                                                            {format(new Date(delivery.delivery_time), "h:mm a")}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Delivery Completion Dialog */}
            <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                            Confirm Drop-off
                        </DialogTitle>
                        <DialogDescription>
                            Confirm completion for {selectedDelivery?.customer?.full_name}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Proof Image URL (Optional)</Label>
                            <Input
                                placeholder="https://... photo link of doorstep"
                                value={proofUrl}
                                onChange={(e) => setProofUrl(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Drop-off Notes (Optional)</Label>
                            <Textarea
                                placeholder="E.g., Left inside milk basket by the door"
                                value={completionNotes}
                                onChange={(e) => setCompletionNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setCompleteModalOpen(false);
                                setSelectedDelivery(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleConfirmComplete}
                            disabled={updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending ? "Confirming..." : "Confirm Delivered"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
