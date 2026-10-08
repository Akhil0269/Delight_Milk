import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, AlertCircle, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminDeliveries } from "@/hooks/useAdmin";
import MarkDeliveredDialog from "@/components/admin/MarkDeliveredDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const TodayDeliveries = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: deliveries, isLoading } = useAdminDeliveries(today);
    const [selectedDelivery, setSelectedDelivery] = useState<Record<string, unknown> | null>(null);
    const [showMarkDialog, setShowMarkDialog] = useState(false);

    const handleMarkDelivered = (delivery: Record<string, unknown>) => {
        setSelectedDelivery(delivery);
        setShowMarkDialog(true);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Today's Deliveries</CardTitle>
                    <CardDescription>Loading deliveries...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    const pendingDeliveries = deliveries?.filter((d: { status?: string }) => d.status !== "delivered") || [];
    const completedToday = deliveries?.filter((d: { status?: string }) => d.status === "delivered") || [];

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Today's Deliveries
                            </CardTitle>
                            <CardDescription>
                                {format(new Date(), "EEEE, MMMM dd, yyyy")}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant="outline">
                                {pendingDeliveries.length} Pending
                            </Badge>
                            <Badge className="bg-green-600">
                                {completedToday.length} Completed
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {deliveries && deliveries.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No deliveries scheduled for today</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {deliveries?.map((delivery, index) => (
                                <motion.div
                                    key={delivery.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`border rounded-lg p-4 ${delivery.status === "delivered"
                                            ? "bg-green-50 border-green-200"
                                            : "bg-card"
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold">
                                                    {delivery.products?.name || delivery.product?.product_name || "Product"}
                                                </h4>
                                                {delivery.status === "delivered" ? (
                                                    <Badge className="bg-green-600">
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Delivered
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        Pending
                                                    </Badge>
                                                )}
                                            </div>

                                            {delivery.user?.full_name && (
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    Customer: <span className="font-medium text-foreground">{delivery.user.full_name}</span>
                                                    {delivery.user.phone ? ` (${delivery.user.phone})` : ""}
                                                </p>
                                            )}

                                            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                                                <div>
                                                    <span className="font-medium">Quantity:</span>{" "}
                                                    {delivery.quantity} {delivery.products?.unit || delivery.product?.unit || ""}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Amount:</span> ₹
                                                    {((delivery.quantity || 0) * (delivery.price_per_unit || 0)).toFixed(2)}
                                                </div>
                                                {delivery.delivery_time && (
                                                    <div className="col-span-2">
                                                        <span className="font-medium">Delivered at:</span>{" "}
                                                        {format(new Date(delivery.delivery_time), "hh:mm a")}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {delivery.status !== "delivered" && (
                                            <Button
                                                onClick={() => handleMarkDelivered(delivery)}
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Check className="w-4 h-4 mr-1" />
                                                Mark Delivered
                                            </Button>
                                        )}
                                    </div>

                                    {delivery.notes && (
                                        <div className="mt-3 pt-3 border-t">
                                            <p className="text-xs text-muted-foreground">
                                                <strong>Notes:</strong> {delivery.notes}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {pendingDeliveries.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-blue-800">
                                        {pendingDeliveries.length} deliveries pending
                                    </p>
                                    <p className="text-xs text-blue-700">
                                        Mark deliveries as completed to update customer calendars automatically
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <MarkDeliveredDialog
                delivery={selectedDelivery}
                open={showMarkDialog}
                onOpenChange={setShowMarkDialog}
            />
        </>
    );
};

export default TodayDeliveries;
