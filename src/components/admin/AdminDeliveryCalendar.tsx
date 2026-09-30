// src/components/admin/AdminDeliveryCalendar.tsx
// Admin Delivery Calendar - Real Supabase Delivery & Order Management

import { useState } from "react";
import { format, startOfMonth, getDaysInMonth, getDay, addMonths, subMonths } from "date-fns";
import {
    ChevronLeft,
    ChevronRight,
    Check,
    Truck,
    Package,
    AlertCircle,
    Clock,
    UserCheck,
    Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    useCustomerDeliveries,
    useCustomerOrders,
    useDeliveryPartners,
    useScheduleOrderDelivery,
    useUpdateDeliveryStatus,
    useAssignDeliveryPartner,
    AdminDelivery,
    AdminCustomerOrder,
} from "@/hooks/useAdminDeliveries";

interface AdminDeliveryCalendarProps {
    customerId: string;
    customerName: string;
}

const AdminDeliveryCalendar = ({ customerId, customerName }: AdminDeliveryCalendarProps) => {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [dialogOpen, setDialogOpen] = useState<boolean>(false);
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [selectedPartnerByOrder, setSelectedPartnerByOrder] = useState<Record<string, string>>({});
    const [selectedPartnerByDelivery, setSelectedPartnerByDelivery] = useState<Record<string, string>>({});

    // Real Supabase queries
    const { data: deliveries = [], isLoading: deliveriesLoading } = useCustomerDeliveries(customerId);
    const { data: customerOrders = [], isLoading: ordersLoading } = useCustomerOrders(customerId);
    const { data: deliveryPartners = [] } = useDeliveryPartners();

    // Real Supabase mutations
    const scheduleOrderMutation = useScheduleOrderDelivery();
    const updateStatusMutation = useUpdateDeliveryStatus();
    const assignPartnerMutation = useAssignDeliveryPartner();

    const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    // Generate calendar days
    const generateCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDayOfMonth = getDay(startOfMonth(currentDate));

        const days: (number | null)[] = [];

        // Add empty cells for days before the month starts
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    };

    const formatDateStr = (day: number): string => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return format(new Date(year, month, day), "yyyy-MM-dd");
    };

    const getDeliveriesForDate = (dateStr: string): AdminDelivery[] => {
        return deliveries.filter((d) => d.delivery_date === dateStr);
    };

    const getOrdersForDate = (dateStr: string): AdminCustomerOrder[] => {
        return customerOrders.filter((o) => o.delivery_date === dateStr);
    };

    const handleDateClick = (day: number) => {
        const dateStr = formatDateStr(day);
        setSelectedDate(dateStr);
        setDialogOpen(true);
    };

    const handleScheduleOrder = async (order: AdminCustomerOrder) => {
        const partnerId = selectedPartnerByOrder[order.id];
        const partner = deliveryPartners.find((p) => p.id === partnerId);

        await scheduleOrderMutation.mutateAsync({
            orderId: order.id,
            deliveryBoyId: partner?.id,
            deliveryBoyName: partner?.full_name || undefined,
        });
    };

    const handleMarkDelivered = async (delivery: AdminDelivery) => {
        await updateStatusMutation.mutateAsync({
            deliveryId: delivery.id,
            newStatus: "delivered",
            orderId: delivery.order_id,
            customerId,
        });
    };

    const handleAssignPartner = async (deliveryId: string) => {
        const partnerId = selectedPartnerByDelivery[deliveryId];
        const partner = deliveryPartners.find((p) => p.id === partnerId);
        if (!partner) return;

        await assignPartnerMutation.mutateAsync({
            deliveryId,
            deliveryBoyId: partner.id,
            deliveryBoyName: partner.full_name || "Delivery Partner",
            customerId,
        });
    };

    const days = generateCalendarDays();
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Unscheduled confirmed customer orders
    const unscheduledOrders = customerOrders.filter(
        (o) => o.status === "confirmed" && !o.delivery_id
    );

    const scheduledCount = deliveries.filter((d) => d.status === "upcoming").length;
    const deliveredCount = deliveries.filter((d) => d.status === "delivered").length;

    const selectedDateDeliveries = selectedDate ? getDeliveriesForDate(selectedDate) : [];
    const selectedDateOrders = selectedDate ? getOrdersForDate(selectedDate) : [];

    return (
        <div className="space-y-6">
            {/* Unscheduled Orders Notification Banner */}
            {unscheduledOrders.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div>
                            <p className="font-semibold text-amber-900 dark:text-amber-200">
                                {unscheduledOrders.length} Confirmed {unscheduledOrders.length === 1 ? "Order" : "Orders"} Awaiting Delivery Scheduling
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Customer has placed one-time orders that require delivery dispatch.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-500 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
                        onClick={() => {
                            if (unscheduledOrders.length > 0) {
                                setSelectedDate(unscheduledOrders[0].delivery_date);
                                setDialogOpen(true);
                            }
                        }}
                    >
                        Review Orders
                    </Button>
                </div>
            )}

            {/* Calendar Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-bold">
                        {format(currentDate, "MMMM yyyy")}
                    </h3>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={previousMonth}>
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Prev
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                    >
                        Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextMonth}>
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
                {/* Weekday headers */}
                {weekDays.map((day) => (
                    <div
                        key={day}
                        className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider p-2"
                    >
                        {day}
                    </div>
                ))}

                {/* Calendar days */}
                {days.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="p-2 min-h-[90px]" />;
                    }

                    const dateStr = formatDateStr(day);
                    const dayDeliveries = getDeliveriesForDate(dateStr);
                    const dayOrders = getOrdersForDate(dateStr);
                    const hasPendingOrders = dayOrders.some(
                        (o) => o.status === "confirmed" && !o.delivery_id
                    );

                    const today = new Date();
                    const isToday =
                        today.getDate() === day &&
                        today.getMonth() === currentDate.getMonth() &&
                        today.getFullYear() === currentDate.getFullYear();

                    return (
                        <Card
                            key={day}
                            className={`p-2 cursor-pointer hover:border-primary transition-all min-h-[96px] flex flex-col justify-between ${
                                isToday ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
                            } ${hasPendingOrders ? "border-amber-400/80 bg-amber-50/20 dark:bg-amber-950/10" : ""}`}
                            onClick={() => handleDateClick(day)}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span
                                        className={`text-sm font-semibold ${
                                            isToday ? "text-primary" : "text-foreground"
                                        }`}
                                    >
                                        {day}
                                    </span>
                                    {hasPendingOrders && (
                                        <span
                                            className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                                            title="Has confirmed order awaiting scheduling"
                                        />
                                    )}
                                </div>

                                {/* Delivery Badges */}
                                <div className="space-y-1">
                                    {dayDeliveries.slice(0, 2).map((delivery) => {
                                        const productName = delivery.products?.name || "Milk";
                                        const isDelivered = delivery.status === "delivered";

                                        return (
                                            <div
                                                key={delivery.id}
                                                className={`text-[11px] leading-tight px-1.5 py-0.5 rounded truncate font-medium ${
                                                    isDelivered
                                                        ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                                        : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                                                }`}
                                            >
                                                {isDelivered ? "✓ " : ""}
                                                {productName} x{delivery.quantity}
                                            </div>
                                        );
                                    })}

                                    {dayDeliveries.length > 2 && (
                                        <div className="text-[10px] text-muted-foreground font-medium pl-1">
                                            +{dayDeliveries.length - 2} more
                                        </div>
                                    )}

                                    {/* Order indicator */}
                                    {hasPendingOrders && (
                                        <div className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 font-semibold truncate">
                                            Order to schedule
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="text-[10px] text-muted-foreground/60 text-right mt-1">
                                {dayDeliveries.length > 0 && `${dayDeliveries.length} item${dayDeliveries.length > 1 ? "s" : ""}`}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Manage Deliveries & Orders Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            Manage Schedule — {selectedDate && format(new Date(selectedDate), "EEEE, MMMM dd, yyyy")}
                        </DialogTitle>
                        <DialogDescription>
                            Real-time Supabase deliveries and orders for {customerName}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="deliveries" className="mt-4">
                        <TabsList className="grid grid-cols-2 w-full">
                            <TabsTrigger value="deliveries">
                                Deliveries ({selectedDateDeliveries.length})
                            </TabsTrigger>
                            <TabsTrigger value="orders">
                                Customer Orders ({selectedDateOrders.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* Deliveries Tab */}
                        <TabsContent value="deliveries" className="space-y-4 pt-3">
                            {deliveriesLoading ? (
                                <p className="text-sm text-muted-foreground py-6 text-center">
                                    Loading real deliveries from database...
                                </p>
                            ) : selectedDateDeliveries.length === 0 ? (
                                <div className="text-center py-8 border border-dashed rounded-lg">
                                    <Truck className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">No deliveries scheduled for this date</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Check the "Customer Orders" tab to schedule any pending orders.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDateDeliveries.map((delivery) => {
                                        const productName = delivery.products?.name || "Milk Product";
                                        const isDelivered = delivery.status === "delivered";

                                        return (
                                            <Card key={delivery.id} className="p-4 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-base">{productName}</h4>
                                                            <Badge variant="outline" className="text-xs">
                                                                Qty: {delivery.quantity} {delivery.products?.unit || ""}
                                                            </Badge>
                                                            <Badge
                                                                variant={
                                                                    delivery.delivery_type === "one_time"
                                                                        ? "secondary"
                                                                        : "outline"
                                                                }
                                                                className="text-[10px]"
                                                            >
                                                                {delivery.delivery_type === "one_time" ? "One-Time Order" : "Subscription"}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Unit Price: ₹{delivery.price_per_unit} • Total: ₹
                                                            {(delivery.quantity * delivery.price_per_unit).toFixed(2)}
                                                        </p>
                                                        {delivery.order_id && (
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                Order Reference: {delivery.order_id.slice(0, 8)}...
                                                            </p>
                                                        )}
                                                    </div>

                                                    <Badge
                                                        className={
                                                            isDelivered
                                                                ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-green-200"
                                                                : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200"
                                                        }
                                                    >
                                                        {delivery.status.toUpperCase()}
                                                    </Badge>
                                                </div>

                                                {/* Delivery Partner Status */}
                                                <div className="flex items-center justify-between text-xs bg-muted/40 p-2.5 rounded-md">
                                                    <div className="flex items-center gap-2">
                                                        <Truck className="w-4 h-4 text-muted-foreground" />
                                                        <span>
                                                            Partner:{" "}
                                                            <span className="font-medium">
                                                                {delivery.delivery_partner_name || "Unassigned"}
                                                            </span>
                                                        </span>
                                                    </div>

                                                    {!isDelivered && deliveryPartners.length > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <Select
                                                                value={selectedPartnerByDelivery[delivery.id] || ""}
                                                                onValueChange={(val) =>
                                                                    setSelectedPartnerByDelivery((prev) => ({
                                                                        ...prev,
                                                                        [delivery.id]: val,
                                                                    }))
                                                                }
                                                            >
                                                                <SelectTrigger className="h-7 text-xs w-[140px]">
                                                                    <SelectValue placeholder="Assign Partner" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {deliveryPartners.map((partner) => (
                                                                        <SelectItem key={partner.id} value={partner.id}>
                                                                            {partner.full_name || partner.phone || partner.id.slice(0, 6)}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs px-2"
                                                                disabled={
                                                                    !selectedPartnerByDelivery[delivery.id] ||
                                                                    assignPartnerMutation.isPending
                                                                }
                                                                onClick={() => handleAssignPartner(delivery.id)}
                                                            >
                                                                Assign
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center justify-end gap-2 pt-1 border-t">
                                                    {!isDelivered ? (
                                                        <Button
                                                            size="sm"
                                                            className="gap-1.5"
                                                            disabled={updateStatusMutation.isPending}
                                                            onClick={() => handleMarkDelivered(delivery)}
                                                        >
                                                            <Check className="w-4 h-4" />
                                                            Mark Delivered
                                                        </Button>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
                                                            <Check className="w-4 h-4" />
                                                            Delivered
                                                            {delivery.marked_delivered_at && (
                                                                <span className="text-muted-foreground font-normal">
                                                                    (
                                                                    {format(
                                                                        new Date(delivery.marked_delivered_at),
                                                                        "hh:mm a"
                                                                    )}
                                                                    )
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>

                        {/* Customer Orders Tab */}
                        <TabsContent value="orders" className="space-y-4 pt-3">
                            {ordersLoading ? (
                                <p className="text-sm text-muted-foreground py-6 text-center">
                                    Loading customer orders from database...
                                </p>
                            ) : selectedDateOrders.length === 0 ? (
                                <div className="text-center py-8 border border-dashed rounded-lg">
                                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                    <p className="text-sm font-medium">No customer orders requested for this date</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        When a customer places a one-time order, it appears here ready to be scheduled.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDateOrders.map((order) => {
                                        const productName = order.products?.name || "Milk Product";
                                        const isScheduled =
                                            order.status === "scheduled" ||
                                            order.status === "delivered" ||
                                            Boolean(order.delivery_id);

                                        return (
                                            <Card key={order.id} className="p-4 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-semibold text-base">{productName}</h4>
                                                            <Badge variant="outline" className="text-xs">
                                                                Qty: {order.quantity} {order.products?.unit || ""}
                                                            </Badge>
                                                            <Badge
                                                                variant={
                                                                    order.status === "confirmed"
                                                                        ? "secondary"
                                                                        : "default"
                                                                }
                                                                className="text-[10px]"
                                                            >
                                                                {order.status.toUpperCase()}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                            <span>Total: ₹{order.total_amount.toFixed(2)}</span>
                                                            <span>•</span>
                                                            <span>Payment: {order.payment_method.toUpperCase()}</span>
                                                            <span>•</span>
                                                            <span
                                                                className={
                                                                    order.payment_status === "paid"
                                                                        ? "text-green-600 font-medium"
                                                                        : "text-amber-600 font-medium"
                                                                }
                                                            >
                                                                Status: {order.payment_status}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <span className="text-[11px] text-muted-foreground font-mono">
                                                        #{order.id.slice(0, 8)}
                                                    </span>
                                                </div>

                                                {order.notes && (
                                                    <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                                                        Note: {order.notes}
                                                    </p>
                                                )}

                                                {/* Scheduling Form / Status */}
                                                <div className="pt-2 border-t flex items-center justify-between">
                                                    {isScheduled ? (
                                                        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                            <UserCheck className="w-4 h-4" />
                                                            Delivery scheduled in Supabase
                                                            {order.delivery_id && (
                                                                <span className="text-muted-foreground font-normal">
                                                                    (ID: {order.delivery_id.slice(0, 8)}...)
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3 w-full justify-between">
                                                            <div className="flex items-center gap-2 flex-1 max-w-xs">
                                                                <Label
                                                                    htmlFor={`partner-select-${order.id}`}
                                                                    className="text-xs shrink-0"
                                                                >
                                                                    Partner:
                                                                </Label>
                                                                <Select
                                                                    value={selectedPartnerByOrder[order.id] || ""}
                                                                    onValueChange={(val) =>
                                                                        setSelectedPartnerByOrder((prev) => ({
                                                                            ...prev,
                                                                            [order.id]: val,
                                                                        }))
                                                                    }
                                                                >
                                                                    <SelectTrigger
                                                                        id={`partner-select-${order.id}`}
                                                                        className="h-8 text-xs"
                                                                    >
                                                                        <SelectValue placeholder="Select delivery partner" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {deliveryPartners.map((p) => (
                                                                            <SelectItem key={p.id} value={p.id}>
                                                                                {p.full_name || p.phone || p.id.slice(0, 6)}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <Button
                                                                size="sm"
                                                                className="gap-1.5"
                                                                disabled={scheduleOrderMutation.isPending}
                                                                onClick={() => handleScheduleOrder(order)}
                                                            >
                                                                <Truck className="w-4 h-4" />
                                                                {scheduleOrderMutation.isPending
                                                                    ? "Scheduling..."
                                                                    : "Schedule Delivery"}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Additional Unscheduled Orders on Other Dates */}
                            {unscheduledOrders.filter((o) => o.delivery_date !== selectedDate).length > 0 && (
                                <div className="mt-4 pt-4 border-t space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        <Clock className="w-3.5 h-3.5" />
                                        Other Unscheduled Orders For This Customer
                                    </div>
                                    <div className="space-y-2">
                                        {unscheduledOrders
                                            .filter((o) => o.delivery_date !== selectedDate)
                                            .map((otherOrder) => (
                                                <div
                                                    key={otherOrder.id}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-xs"
                                                >
                                                    <div>
                                                        <span className="font-semibold">
                                                            {otherOrder.products?.name || "Product"} x{otherOrder.quantity}
                                                        </span>
                                                        <span className="text-muted-foreground ml-2">
                                                            for {format(new Date(otherOrder.delivery_date), "MMM dd, yyyy")}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs"
                                                        onClick={() => {
                                                            setSelectedDate(otherOrder.delivery_date);
                                                        }}
                                                    >
                                                        Jump to Date
                                                    </Button>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Calendar Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Total Deliveries
                    </p>
                    <p className="text-2xl font-bold mt-1">{deliveries.length}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Scheduled (Upcoming)
                    </p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {scheduledCount}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Delivered
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                        {deliveredCount}
                    </p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Orders To Schedule
                    </p>
                    <p
                        className={`text-2xl font-bold mt-1 ${
                            unscheduledOrders.length > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-muted-foreground"
                        }`}
                    >
                        {unscheduledOrders.length}
                    </p>
                </Card>
            </div>
        </div>
    );
};

export default AdminDeliveryCalendar;
