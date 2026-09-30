// Delivery Management Page - Admin can view and manage deliveries
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminDeliveries, useAssignDeliveryBoy, useAdminUsers } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, Calendar, MapPin } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { format } from "date-fns";

const DeliveryManagement = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const { data: deliveries, isLoading } = useAdminDeliveries(selectedDate);
    const { data: users } = useAdminUsers();
    const assignDeliveryBoy = useAssignDeliveryBoy();

    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
    const [selectedBoyId, setSelectedBoyId] = useState("");

    const deliveryBoys = users?.filter((u) => u.role === "delivery_boy") || [];

    // Group deliveries by area
    const deliveriesByArea = deliveries?.reduce((acc: any, delivery: any) => {
        const area = delivery.area || "Unassigned";
        if (!acc[area]) acc[area] = [];
        acc[area].push(delivery);
        return acc;
    }, {});

    const handleAssignBoy = (delivery: any) => {
        setSelectedDelivery(delivery);
        setSelectedBoyId(delivery.delivery_boy_id || "");
        setAssignDialogOpen(true);
    };

    const handleSaveAssignment = () => {
        if (selectedDelivery && selectedBoyId) {
            assignDeliveryBoy.mutate({
                deliveryId: selectedDelivery.id,
                deliveryBoyId: selectedBoyId,
            });
            setAssignDialogOpen(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, any> = {
            scheduled: { variant: "secondary", label: "Scheduled" },
            in_progress: { variant: "default", label: "In Progress" },
            delivered: { variant: "default", label: "Delivered" },
            failed: { variant: "destructive", label: "Failed" },
        };
        const config = variants[status] || { variant: "outline", label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Delivery Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage daily deliveries and assign delivery boys
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 border rounded-md"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total Deliveries</p>
                    <p className="text-2xl font-bold mt-1">{deliveries?.length || 0}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                    <p className="text-2xl font-bold mt-1">
                        {deliveries?.filter((d) => d.status === "scheduled").length || 0}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold mt-1">
                        {deliveries?.filter((d) => d.status === "in_progress").length || 0}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Delivered</p>
                    <p className="text-2xl font-bold mt-1">
                        {deliveries?.filter((d) => d.status === "delivered").length || 0}
                    </p>
                </Card>
            </div>

            {/* Deliveries by Area */}
            {isLoading ? (
                <Card className="p-6">
                    <Skeleton className="h-64 w-full" />
                </Card>
            ) : deliveriesByArea && Object.keys(deliveriesByArea).length > 0 ? (
                Object.entries(deliveriesByArea).map(([area, areaDeliveries]: [string, any]) => (
                    <Card key={area} className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin className="w-5 h-5 text-primary" />
                            <h3 className="text-lg font-semibold">{area}</h3>
                            <Badge variant="secondary">{areaDeliveries.length} deliveries</Badge>
                        </div>
                        <div className="space-y-3">
                            {areaDeliveries.map((delivery: any) => (
                                <div
                                    key={delivery.id}
                                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <p className="font-semibold">{delivery.user?.full_name || "N/A"}</p>
                                            {getStatusBadge(delivery.status)}
                                        </div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                            <p>{delivery.product?.product_name} - {delivery.quantity}{delivery.product?.unit}</p>
                                            <div className="flex items-center gap-2">
                                                <p>{delivery.user?.address || "No address"}</p>
                                                {delivery.user?.address && delivery.user?.address !== "N/A" && (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(delivery.user.address)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline text-xs flex items-center gap-1 shrink-0"
                                                        title="View on Google Maps"
                                                    >
                                                        <MapPin className="w-3 h-3" /> View Map
                                                    </a>
                                                )}
                                            </div>
                                            <p>Phone: {delivery.user?.phone || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {delivery.delivery_boy ? (
                                            <div className="text-sm">
                                                <p className="font-semibold">{delivery.delivery_boy.full_name}</p>
                                                <p className="text-muted-foreground">Delivery Boy</p>
                                            </div>
                                        ) : (
                                            <Badge variant="outline">Unassigned</Badge>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAssignBoy(delivery)}
                                        >
                                            <Truck className="w-4 h-4 mr-2" />
                                            Assign
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                ))
            ) : (
                <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No deliveries scheduled for this date</p>
                </Card>
            )}

            {/* Assign Delivery Boy Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Delivery Boy</DialogTitle>
                        <DialogDescription>
                            Select a delivery boy for this delivery
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label>Delivery Boy</Label>
                            <Select value={selectedBoyId} onValueChange={setSelectedBoyId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select delivery boy" />
                                </SelectTrigger>
                                <SelectContent>
                                    {deliveryBoys.map((boy) => (
                                        <SelectItem key={boy.id} value={boy.id}>
                                            {boy.full_name || boy.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={handleSaveAssignment} className="flex-1">
                                Assign
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default DeliveryManagement;
