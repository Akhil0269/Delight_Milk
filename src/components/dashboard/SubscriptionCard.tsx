import { motion } from "framer-motion";
import { Edit2, Trash2, Clock, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscriptions, useDeleteSubscription, useUpdateSubscription } from "@/hooks/useSubscriptions";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link } from "react-router-dom";

const getProductEmoji = (category: string, name: string) => {
  if (name.toLowerCase().includes("milk")) return "🥛";
  if (name.toLowerCase().includes("curd")) return "🍶";
  if (name.toLowerCase().includes("butter")) return "🧈";
  if (name.toLowerCase().includes("paneer")) return "🧀";
  if (name.toLowerCase().includes("ghee")) return "✨";
  if (category === "dairy") return "🍶";
  return "🥛";
};

const SubscriptionCard = () => {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const deleteSubscription = useDeleteSubscription();
  const updateSubscription = useUpdateSubscription();

  const handleDelete = async (id: string) => {
    try {
      await deleteSubscription.mutateAsync(id);
      toast.success("Subscription removed");
    } catch (error) {
      toast.error("Failed to remove subscription");
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateSubscription.mutateAsync({ id, is_active: !isActive });
      toast.success(isActive ? "Subscription paused" : "Subscription resumed");
    } catch (error) {
      toast.error("Failed to update subscription");
    }
  };

  const activeSubscriptions = subscriptions?.filter((s) => s.is_active) || [];
  const monthlyEstimate = activeSubscriptions.reduce((sum, sub) => {
    const pricePerDelivery = (sub.products?.price_per_unit || 0) * sub.quantity;
    return sum + pricePerDelivery * 30; // Approximate monthly
  }, 0);

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
        <Skeleton className="h-10 w-full mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">No Subscriptions Yet</h3>
          <p className="text-muted-foreground mb-4">
            Start by subscribing to your favorite dairy products
          </p>
          <Link to="/#products">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Browse Products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold">My Subscriptions</h3>
          <p className="text-sm text-muted-foreground">Manage your daily deliveries</p>
        </div>
        <Link to="/#products">
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add New
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {subscriptions.map((sub, index) => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-4 p-4 rounded-xl ${sub.is_active ? "bg-muted/50" : "bg-muted/30 opacity-60"} hover:bg-muted transition-colors`}
          >
            <div className="w-14 h-14 rounded-xl bg-card flex items-center justify-center text-3xl shadow-sm">
              {getProductEmoji(sub.products?.category || "milk", sub.products?.name || "")}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{sub.products?.name || "Product"}</h4>
                <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium">
                  {sub.quantity} {sub.products?.unit}
                </span>
                {!sub.is_active && (
                  <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-medium">
                    Paused
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span>Daily</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  6:00 AM
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-lg">
                ₹{((sub.products?.price_per_unit || 0) * sub.quantity).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">per delivery</div>
            </div>

            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleToggleActive(sub.id, sub.is_active)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove {sub.products?.name} from your daily deliveries. You can always subscribe again later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(sub.id)}>
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Monthly Estimate */}
      <div className="mt-6 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Monthly Estimate</div>
            <div className="text-sm text-muted-foreground">Based on current subscriptions</div>
          </div>
          <div className="text-2xl font-bold text-primary">₹{monthlyEstimate.toFixed(0)}</div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCard;
