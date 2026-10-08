import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, X, Pause, Clock, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeliveries, DeliveryStatus } from "@/hooks/useDeliveries";
import { useRealtimeDeliveryUpdates } from "@/hooks/useDeliveryConfirmation";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, getDaysInMonth, getDay } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface DayData {
  date: number;
  status: DeliveryStatus | "today" | "empty";
  quantity?: string;
  time?: string;
  amount?: number;
  productName?: string;
}

// Light color specifications as per requirements
const statusConfig = {
  delivered: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
    icon: Check,
    label: "Delivered",
    description: "Successfully delivered",
  },
  missed: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    icon: X,
    label: "Missed",
    description: "Delivery was missed - No charges applied",
  },
  paused: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
    icon: Pause,
    label: "Paused",
    description: "Delivery paused by you - No charges applied",
  },
  upcoming: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
    icon: Clock,
    label: "Upcoming",
    description: "Scheduled for delivery",
  },
  today: {
    bg: "bg-blue-200",
    text: "text-blue-900",
    border: "border-blue-400",
    icon: Clock,
    label: "Today",
    description: "Today's delivery",
  },
  cancelled: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    icon: X,
    label: "Cancelled",
    description: "Delivery cancelled - No charges applied",
  },
  empty: {
    bg: "bg-transparent",
    text: "text-muted-foreground/30",
    border: "border-transparent",
    icon: Clock,
    label: "No delivery",
    description: "No delivery scheduled",
  },
};

const DeliveryCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const { data: deliveries, isLoading } = useDeliveries(currentMonth);

  // Enable real-time delivery updates
  useRealtimeDeliveryUpdates();

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Generate month data from deliveries
  const generateMonthData = (): DayData[] => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const today = new Date();
    const isCurrentMonth =
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = i + 1;
      const dateStr = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), date), "yyyy-MM-dd");

      // Find deliveries for this date
      const dayDeliveries = deliveries?.filter((d) => d.delivery_date === dateStr) || [];

      if (dayDeliveries.length === 0) {
        // Check if it's today
        if (isCurrentMonth && date === today.getDate()) {
          return { date, status: "today" as const };
        }
        // Check if it's upcoming
        if (isCurrentMonth && date > today.getDate()) {
          return { date, status: "upcoming" };
        }
        return { date, status: "empty" as const };
      }

      // Priority when multiple deliveries exist on the same day:
      // delivered (5) > upcoming (4) > paused (3) > missed (2) > cancelled (1)
      const priorityOrder: Record<string, number> = {
        delivered: 5,
        upcoming: 4,
        paused: 3,
        missed: 2,
        cancelled: 1,
      };

      const sortedDeliveries = [...dayDeliveries].sort((a, b) => {
        return (priorityOrder[b.status] || 0) - (priorityOrder[a.status] || 0);
      });

      const delivery = sortedDeliveries[0];
      let status: DayData["status"] = delivery.status;

      // Override with "today" if it's today and not cancelled
      if (isCurrentMonth && date === today.getDate() && status !== "cancelled") {
        status = "today";
      }

      const activeDeliveries = dayDeliveries.filter((d) => d.status !== "cancelled");
      const totalAmount = activeDeliveries.reduce((sum, d) => sum + Number(d.quantity || 0) * Number(d.price_per_unit || 0), 0);

      return {
        date,
        status,
        quantity: dayDeliveries.map((d) => `${d.quantity}${d.products?.unit || ""} ${d.products?.name || ""}`).join(", "),
        time: delivery.delivery_time
          ? new Date(delivery.delivery_time).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true })
          : undefined,
        amount: totalAmount,
        productName: delivery.products?.name,
      };
    });
  };

  const monthData = generateMonthData();

  const firstDayOfMonth = getDay(startOfMonth(currentMonth));

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const totalDelivered = monthData.filter(d => d.status === "delivered").length;
  const totalAmount = monthData.reduce((sum, d) => {
    if (d.status === "cancelled" || d.status === "missed") return sum;
    return sum + (d.amount || 0);
  }, 0);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold">Delivery Calendar</h3>
          <p className="text-sm text-muted-foreground">Track your daily deliveries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold min-w-[140px] text-center">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells for days before month start */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Day cells */}
        {monthData.map((day, index) => {
          const config = (day.status && statusConfig[day.status]) || statusConfig.empty;
          const Icon = config.icon || Clock;

          return (
            <motion.button
              key={day.date}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.01 }}
              onClick={() => day.status !== "empty" && setSelectedDay(day)}
              disabled={day.status === "empty"}
              className={`aspect-square rounded-xl ${config.bg} ${config.text} border-2 ${config.border} flex flex-col items-center justify-center relative group transition-transform ${day.status !== "empty" ? "hover:scale-105 cursor-pointer" : "cursor-default"}`}
            >
              <span className="text-sm font-bold">{day.date}</span>
              {day.status !== "empty" && <Icon className="w-3 h-3 mt-0.5" />}

              {/* Tooltip */}
              {day.status !== "empty" && (
                <div className="absolute bottom-full mb-2 px-2 py-1 bg-foreground text-background text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {config.label}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-border">
        {Object.entries(statusConfig)
          .filter(([key]) => key !== "empty" && key !== "today")
          .map(([key, config]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${config.bg} border-2 ${config.border}`} />
              <span className="text-sm text-muted-foreground">{config.label}</span>
            </div>
          ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-800">{totalDelivered}</div>
          <div className="text-sm text-green-700">Days Delivered</div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-800">₹{totalAmount.toFixed(0)}</div>
          <div className="text-sm text-blue-700">Total Bill</div>
        </div>
      </div>

      {/* Enhanced Day Detail Modal */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-3xl p-6 max-w-md w-full shadow-2xl border border-border max-h-[90vh] overflow-y-auto"
            >
              {/* Modal content */}
              {(() => {
                const modalConfig = (selectedDay.status && statusConfig[selectedDay.status]) || statusConfig.empty;
                return (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-2xl font-bold">
                          {monthNames[currentMonth.getMonth()]} {selectedDay.date}, {currentMonth.getFullYear()}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">Delivery Details</p>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-semibold ${modalConfig.bg} ${modalConfig.text} border-2 ${modalConfig.border}`}>
                        {modalConfig.label}
                      </div>
                    </div>

                    {/* Delivered Status */}
                    {selectedDay.status === "delivered" && (
                      <div className="space-y-4">
                        <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                          <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                            <Check className="w-5 h-5" />
                            Delivered Items
                          </h4>

                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <span className="text-sm text-green-700">Product</span>
                              <span className="font-semibold text-green-900 text-right">{selectedDay.quantity || "Full Cream Milk - 1L"}</span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-green-200">
                              <span className="text-sm text-green-700">Unit Price (Locked)</span>
                              <span className="font-bold text-green-900">
                                ₹{selectedDay.amount ? (selectedDay.amount / (parseFloat(selectedDay.quantity?.split('L')[0] || '1') || 1)).toFixed(2) : '60.00'} / unit
                              </span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-green-200">
                              <span className="text-sm text-green-700">Delivery Time</span>
                              <span className="font-medium text-green-900">{selectedDay.time || "6:30 AM"}</span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t-2 border-green-300">
                              <span className="font-semibold text-green-800">Amount Charged</span>
                              <span className="text-xl font-bold text-green-900">₹{selectedDay.amount?.toFixed(2) || '60.00'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                          <p className="text-xs text-blue-800">
                            ✓ This delivery is <strong>included in monthly billing</strong>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Cancelled Status */}
                    {selectedDay.status === "cancelled" && (
                      <div className="bg-muted/50 rounded-xl p-4 border-2 border-border">
                        <p className="text-sm text-muted-foreground mb-4">{modalConfig.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-muted-foreground">Amount Charged</span>
                          <span className="text-xl font-bold text-foreground">₹0.00</span>
                        </div>
                      </div>
                    )}

                    {/* Missed Status */}
                    {selectedDay.status === "missed" && (
                      <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
                        <p className="text-sm text-red-700 mb-4">{modalConfig.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-red-800">Amount Charged</span>
                          <span className="text-xl font-bold text-red-900">₹0.00</span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setSelectedDay(null)} className="flex-1">
                  Close
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-center text-muted-foreground">
                  📅 This calendar is the <strong>single source of truth</strong> for your monthly billing
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DeliveryCalendar;
