import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plus, Pause, RefreshCcw, Calendar, Truck, Receipt, Package, MapPin, Gift, Headphones, ShoppingBag } from "lucide-react";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { usePauseDeliveries } from "@/hooks/useDeliveries";
import { useRepeatOrder } from "@/hooks/useOrders";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";
import AddMilkDialog from "./AddMilkDialog";
import TrackDeliveryDialog from "./TrackDeliveryDialog";
import ReceiptsDialog from "./ReceiptsDialog";

const QuickActions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: subscriptions } = useSubscriptions();
  const pauseDeliveries = usePauseDeliveries();
  const repeatOrder = useRepeatOrder();
  const [isRepeating, setIsRepeating] = useState(false);

  const [showAddMilk, setShowAddMilk] = useState(false);
  const [showTrack, setShowTrack] = useState(false);
  const [showReceipts, setShowReceipts] = useState(false);

  const activeSubscriptions = subscriptions?.filter((s) => s.is_active) || [];

  const handlePauseTomorrow = async () => {
    if (activeSubscriptions.length === 0) {
      toast.error("No active subscriptions to pause");
      return;
    }

    try {
      const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
      await pauseDeliveries.mutateAsync(tomorrow);
      toast.success("Tomorrow's delivery paused");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to pause delivery";
      toast.error(message);
    }
  };

  const handleRepeat = async () => {
    if (!user?.id) {
      toast.error("Please log in to repeat an order");
      return;
    }

    setIsRepeating(true);
    try {
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
      const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

      // 1. Look for a delivered order specifically from yesterday
      const { data: yesterdayOrder, error: yesterdayErr } = await supabase
        .from("orders")
        .select("id, delivery_date, status, products(name)")
        .eq("user_id", user.id)
        .eq("delivery_date", yesterday)
        .eq("status", "delivered")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (yesterdayErr) throw yesterdayErr;

      let sourceOrder = yesterdayOrder;
      let wasYesterday = Boolean(yesterdayOrder);

      // 2. If no delivered order specifically from yesterday, find the most recent delivered order overall
      if (!sourceOrder) {
        const { data: latestOrder, error: latestErr } = await supabase
          .from("orders")
          .select("id, delivery_date, status, products(name)")
          .eq("user_id", user.id)
          .eq("status", "delivered")
          .order("delivery_date", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestErr) throw latestErr;
        sourceOrder = latestOrder;
        wasYesterday = sourceOrder?.delivery_date === yesterday;
      }

      // 3. User feedback if no previous delivered order exists
      if (!sourceOrder) {
        toast.info("No previous delivered order found to repeat.");
        return;
      }

      // 4. Create new order via Phase 3 canonical repeat mutation
      await repeatOrder.mutateAsync({
        orderId: sourceOrder.id,
        targetDate: tomorrow,
      });

      if (wasYesterday) {
        toast.success("Yesterday's order repeated for tomorrow");
      } else {
        toast.success("Previous delivered order repeated for tomorrow");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to repeat order";
      toast.error(message);
    } finally {
      setIsRepeating(false);
    }
  };

  const scrollToCalendar = () => {
    const calendarElement = document.querySelector('[class*="delivery-calendar"]');
    if (calendarElement) {
      calendarElement.scrollIntoView({ behavior: "smooth" });
    } else {
      // Fallback: scroll to bottom of page where calendar typically is
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
  };

  const actions = [
    {
      icon: ShoppingBag,
      label: "Browse Products",
      description: "View catalog",
      color: "bg-gradient-to-r from-primary to-purple-600",
      hoverColor: "hover:from-primary/90 hover:to-purple-600/90",
      onClick: () => navigate("/products"),
    },
    {
      icon: Plus,
      label: "Add Milk",
      description: "Add for tomorrow",
      color: "bg-accent",
      hoverColor: "hover:bg-accent/90",
      onClick: () => setShowAddMilk(true),
    },
    {
      icon: Pause,
      label: "Pause",
      description: "Skip tomorrow",
      color: "bg-warning",
      hoverColor: "hover:bg-warning/90",
      onClick: handlePauseTomorrow,
      loading: pauseDeliveries.isPending,
    },
    {
      icon: RefreshCcw,
      label: "Repeat",
      description: "Same as yesterday",
      color: "bg-primary",
      hoverColor: "hover:bg-primary/90",
      onClick: handleRepeat,
      loading: repeatOrder.isPending || isRepeating,
    },
    {
      icon: Calendar,
      label: "Calendar",
      description: "View schedule",
      color: "bg-secondary",
      hoverColor: "hover:bg-secondary/90",
      textColor: "text-secondary-foreground",
      onClick: scrollToCalendar,
    },
    {
      icon: Truck,
      label: "Track",
      description: "Live delivery",
      color: "bg-primary",
      hoverColor: "hover:bg-primary/90",
      onClick: () => setShowTrack(true),
    },
    {
      icon: Receipt,
      label: "Receipts",
      description: "View bills",
      color: "bg-muted",
      hoverColor: "hover:bg-muted/80",
      textColor: "text-foreground",
      onClick: () => setShowReceipts(true),
    },
    {
      icon: Package,
      label: "Orders",
      description: "Order history",
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      onClick: () => navigate("/orders"),
    },
    {
      icon: MapPin,
      label: "Addresses",
      description: "Manage locations",
      color: "bg-green-500",
      hoverColor: "hover:bg-green-600",
      onClick: () => navigate("/addresses"),
    },
    {
      icon: Gift,
      label: "Refer",
      description: "Earn rewards",
      color: "bg-purple-500",
      hoverColor: "hover:bg-purple-600",
      onClick: () => navigate("/referral"),
    },
    {
      icon: Headphones,
      label: "Support",
      description: "Get help",
      color: "bg-orange-500",
      hoverColor: "hover:bg-orange-600",
      onClick: () => navigate("/support"),
    },
  ];

  return (
    <>
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {actions.map((action, index) => (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={action.onClick}
              disabled={action.loading}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl ${action.color} ${action.hoverColor} ${action.textColor || "text-white"} transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <action.icon className={`w-6 h-6 ${action.loading ? "animate-spin" : ""}`} />
              <span className="text-sm font-medium">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <AddMilkDialog open={showAddMilk} onOpenChange={setShowAddMilk} />
      <TrackDeliveryDialog open={showTrack} onOpenChange={setShowTrack} />
      <ReceiptsDialog open={showReceipts} onOpenChange={setShowReceipts} />
    </>
  );
};

export default QuickActions;

