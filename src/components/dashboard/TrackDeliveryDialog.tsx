import { motion } from "framer-motion";
import { Truck, Clock, Check, Package } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useTodayDeliveries, useDeliveries } from "@/hooks/useDeliveries";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface TrackDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const TrackDeliveryDialog = ({ open, onOpenChange }: TrackDeliveryDialogProps) => {
    const { data: todayDeliveries, isLoading: todayLoading } = useTodayDeliveries();
    const { data: upcomingDeliveries, isLoading: upcomingLoading } = useDeliveries();

    const upcoming = upcomingDeliveries?.filter(
        (d) => d.status === "upcoming" && d.delivery_date > format(new Date(), "yyyy-MM-dd")
    ).slice(0, 5);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "delivered":
                return <Check className="w-5 h-5 text-accent" />;
            case "upcoming":
                return <Clock className="w-5 h-5 text-primary" />;
            default:
                return <Package className="w-5 h-5 text-muted-foreground" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            delivered: "default",
            upcoming: "secondary",
            paused: "outline",
            missed: "destructive",
        };
        return (
            <Badge variant={variants[status] || "outline"} className="capitalize">
                {status}
            </Badge>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Truck className="w-6 h-6 text-primary" />
                        <DialogTitle>Track Deliveries</DialogTitle>
                    </div>
                    <DialogDescription>
                        Monitor your current and upcoming deliveries
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Today's Deliveries */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">Today's Deliveries</h3>
                        {todayLoading ? (
                            <div className="space-y-3">
                                {[1, 2].map((i) => (
                                    <Skeleton key={i} className="h-20 rounded-xl" />
                                ))}
                            </div>
                        ) : todayDeliveries && todayDeliveries.length > 0 ? (
                            <div className="space-y-3">
                                {todayDeliveries.map((delivery, index) => (
                                    <motion.div
                                        key={delivery.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-card border border-border rounded-xl p-4"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-3 flex-1">
                                                {getStatusIcon(delivery.status)}
                                                <div className="flex-1">
                                                    <div className="font-semibold">
                                                        {delivery.quantity} {delivery.products?.unit} {delivery.products?.name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        {delivery.delivery_time
                                                            ? `Delivered at ${new Date(delivery.delivery_time).toLocaleTimeString("en-IN", {
                                                                hour: "numeric",
                                                                minute: "2-digit",
                                                                hour12: true,
                                                            })}`
                                                            : "Scheduled for today"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {getStatusBadge(delivery.status)}
                                                <div className="text-sm font-semibold text-primary mt-2">
                                                    ₹{(delivery.quantity * delivery.price_per_unit).toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-muted/30 rounded-xl">
                                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                                <p className="text-muted-foreground">No deliveries scheduled for today</p>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Deliveries */}
                    <div>
                        <h3 className="font-semibold text-lg mb-3">Upcoming Deliveries</h3>
                        {upcomingLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <Skeleton key={i} className="h-16 rounded-xl" />
                                ))}
                            </div>
                        ) : upcoming && upcoming.length > 0 ? (
                            <div className="space-y-2">
                                {upcoming.map((delivery, index) => (
                                    <motion.div
                                        key={delivery.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-muted/30 rounded-lg p-3 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <div>
                                                <div className="font-medium text-sm">
                                                    {delivery.quantity} {delivery.products?.unit} {delivery.products?.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {format(new Date(delivery.delivery_date), "MMM dd, yyyy")}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold text-primary">
                                            ₹{(delivery.quantity * delivery.price_per_unit).toFixed(2)}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 bg-muted/30 rounded-xl">
                                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No upcoming deliveries</p>
                            </div>
                        )}
                    </div>

                    {/* Delivery Info */}
                    <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            Delivery Information
                        </h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Deliveries are made between 6:00 AM - 9:00 AM</li>
                            <li>• You'll receive a notification when your order is out for delivery</li>
                            <li>• Contact support for any delivery issues</li>
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TrackDeliveryDialog;
