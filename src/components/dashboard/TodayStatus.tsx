import { motion } from "framer-motion";
import { Package, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useTodayDeliveries } from "@/hooks/useDeliveries";
import { Skeleton } from "@/components/ui/skeleton";

const TodayStatus = () => {
  const { data: deliveries, isLoading } = useTodayDeliveries();

  const activeDeliveries = deliveries?.filter((d) => d.status !== "cancelled") || [];
  const deliveredItems = activeDeliveries.filter((d) => d.status === "delivered");
  const upcomingItems = activeDeliveries.filter((d) => d.status === "upcoming");
  const allDelivered = activeDeliveries.length > 0 && deliveredItems.length === activeDeliveries.length;
  const hasDeliveries = activeDeliveries.length > 0;

  const totalAmount = activeDeliveries.reduce((sum, d) => {
    if (d.status === "delivered") {
      return sum + Number(d.quantity || 0) * Number(d.price_per_unit || 0);
    }
    return sum;
  }, 0);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!hasDeliveries) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden"
      >
        <div className="p-6 bg-muted text-muted-foreground">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-10 h-10" />
            <div>
              <h3 className="text-xl font-bold">No Deliveries Today</h3>
              <p className="text-sm">Subscribe to products to start receiving deliveries!</p>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const isDelivered = allDelivered && deliveredItems.length > 0;
  const deliveryTime = deliveredItems[0]?.delivery_time
    ? new Date(deliveredItems[0].delivery_time).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden"
    >
      {/* Header */}
      <div className={`p-6 ${isDelivered ? "bg-accent" : "bg-primary"} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDelivered ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <CheckCircle2 className="w-10 h-10" />
              </motion.div>
            ) : (
              <Package className="w-10 h-10" />
            )}
            <div>
              <h3 className="text-xl font-bold">
                {isDelivered ? "Delivered Today!" : "Out for Delivery"}
              </h3>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Clock className="w-4 h-4" />
                <span>
                  {isDelivered && deliveryTime
                    ? `Delivered at ${deliveryTime}`
                    : "Expected by 7:00 AM"}
                </span>
              </div>
            </div>
          </div>
          <motion.span
            animate={{ rotate: isDelivered ? 0 : [0, 10, -10, 0] }}
            transition={{ repeat: isDelivered ? 0 : Infinity, duration: 2 }}
            className="text-5xl"
          >
            {isDelivered ? "✅" : "🥛"}
          </motion.span>
        </div>
      </div>

      {/* Products */}
      <div className="p-6">
        <h4 className="font-semibold mb-3 text-muted-foreground">Today's Order</h4>
        <div className="space-y-3">
          {activeDeliveries.map((delivery, index) => (
            <motion.div
              key={delivery.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-lg">
                    {delivery.products?.name?.includes("Milk") ? "🥛" : "🍶"}
                  </span>
                </div>
                <div>
                  <div className="font-medium">{delivery.products?.name || "Product"}</div>
                  <div className="text-sm text-muted-foreground">
                    {delivery.quantity} {delivery.products?.unit || ""}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold">
                  ₹{(Number(delivery.quantity || 0) * Number(delivery.price_per_unit || 0)).toFixed(0)}
                </div>
                <div
                  className={`text-xs ${
                    delivery.status === "delivered"
                      ? "text-accent"
                      : delivery.status === "missed"
                      ? "text-danger"
                      : "text-muted-foreground"
                  }`}
                >
                  {delivery.status ? delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1) : "Scheduled"}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
          <span className="font-semibold">Today's Total</span>
          <span className="text-xl font-bold text-primary">₹{totalAmount.toFixed(0)}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default TodayStatus;
