import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Package, Pause, Play, Trash2, Plus, Minus, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { useSubscriptions, useUpdateSubscription, useCancelSubscription, Subscription } from "@/hooks/useSubscriptions";
import { useProfile } from "@/hooks/useProfile";
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
import { toast } from "sonner";
import { format } from "date-fns";

const SubscriptionSettings = () => {
    const navigate = useNavigate();
    const { data: profile } = useProfile();
    const { data: subscriptions, isLoading, error } = useSubscriptions();
    const updateSubscription = useUpdateSubscription();
    const cancelSubscription = useCancelSubscription();
    const [actionId, setActionId] = useState<string | null>(null);

    const handleCancelSubscription = async (id: string) => {
        if (profile?.is_blocked) {
            toast.error("Your account has been suspended. Subscription changes are restricted.");
            return;
        }
        setActionId(id);
        try {
            await cancelSubscription.mutateAsync(id);
            toast.success("Subscription cancelled successfully");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to cancel subscription";
            toast.error(message);
        } finally {
            setActionId(null);
        }
    };

    const handleTogglePause = async (sub: Subscription) => {
        if (profile?.is_blocked) {
            toast.error("Your account has been suspended. Subscription changes are restricted.");
            return;
        }
        setActionId(sub.id);
        const newStatus = !sub.is_active;
        try {
            await updateSubscription.mutateAsync({
                id: sub.id,
                is_active: newStatus,
                paused_until: newStatus ? null : format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd"),
            });
            toast.success(newStatus ? "Subscription resumed!" : "Subscription paused for 7 days");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update subscription";
            toast.error(message);
        } finally {
            setActionId(null);
        }
    };

    const handleQuantityChange = async (sub: Subscription, delta: number) => {
        if (profile?.is_blocked) {
            toast.error("Your account has been suspended. Subscription changes are restricted.");
            return;
        }
        const newQty = sub.quantity + delta;
        if (newQty <= 0) return;
        setActionId(sub.id);
        try {
            await updateSubscription.mutateAsync({
                id: sub.id,
                quantity: newQty,
            });
            toast.success(`Quantity updated to ${newQty} ${sub.products?.unit || 'units'}`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update quantity";
            toast.error(message);
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30">
            <DashboardNavbar />

            {/* Header */}
            <div className="bg-card border-b sticky top-16 md:top-20 z-30">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Subscription Settings</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage your daily milk and dairy deliveries
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {profile?.is_blocked && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3 mb-6">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <div>
                            <p className="font-semibold">Account Suspended</p>
                            <p className="text-xs">Your account has been restricted by an administrator. You cannot modify active subscriptions or schedule deliveries.</p>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
                        <p className="text-muted-foreground">Loading your subscriptions...</p>
                    </div>
                ) : error ? (
                    <Card className="p-8 text-center text-destructive">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-semibold">Failed to load subscriptions</p>
                        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                    </Card>
                ) : !subscriptions || subscriptions.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-10 h-10 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">No Active Subscriptions</h2>
                        <p className="text-muted-foreground max-w-md mx-auto mb-6">
                            You don't have any daily milk deliveries set up yet. Subscribe to your favorite dairy products for automated morning delivery!
                        </p>
                        <Button onClick={() => navigate("/products")} size="lg">
                            <Package className="w-4 h-4 mr-2" />
                            Browse Products
                        </Button>
                    </motion.div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                                {subscriptions.length} Active {subscriptions.length === 1 ? 'Subscription' : 'Subscriptions'}
                            </span>
                            <Button size="sm" onClick={() => navigate("/products")}>
                                <Plus className="w-4 h-4 mr-1" />
                                Add Subscription
                            </Button>
                        </div>

                        {subscriptions.map((sub) => {
                            const isActionPending = actionId === sub.id && updateSubscription.isPending;
                            return (
                                <Card key={sub.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardContent className="p-5">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex items-center justify-center shrink-0">
                                                    {sub.products?.image_url ? (
                                                        <img
                                                            src={sub.products.image_url}
                                                            alt={sub.products.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Package className="w-6 h-6 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-lg">{sub.products?.name || "Product"}</h3>
                                                        <Badge variant={sub.is_active ? "default" : "secondary"}>
                                                            {sub.is_active ? "Active" : "Paused"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        Daily Morning Delivery (5:00 AM - 8:00 AM)
                                                    </p>
                                                    {sub.paused_until && !sub.is_active && (
                                                        <p className="text-xs text-amber-600 font-medium mt-0.5">
                                                            Paused until {format(new Date(sub.paused_until), "dd MMM yyyy")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                                                {/* Quantity Adjuster */}
                                                <div className="flex items-center border rounded-lg bg-card">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        disabled={isActionPending || sub.quantity <= 1}
                                                        onClick={() => handleQuantityChange(sub, -1)}
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </Button>
                                                    <span className="w-8 text-center text-sm font-semibold">
                                                        {sub.quantity}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        disabled={isActionPending}
                                                        onClick={() => handleQuantityChange(sub, 1)}
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>

                                                {/* Pause / Resume Button */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={isActionPending}
                                                    onClick={() => handleTogglePause(sub)}
                                                    className={sub.is_active ? "text-amber-600 border-amber-500/30 hover:bg-amber-50" : "text-green-600 border-green-500/30 hover:bg-green-50"}
                                                >
                                                    {sub.is_active ? (
                                                        <>
                                                            <Pause className="w-3.5 h-3.5 mr-1" />
                                                            Pause
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="w-3.5 h-3.5 mr-1" />
                                                            Resume
                                                        </>
                                                    )}
                                                </Button>

                                                {/* Cancel Subscription */}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                            disabled={isActionPending}
                                                            title="Cancel Subscription"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to cancel your daily subscription for <strong>{sub.products?.name || "this product"}</strong>? Future deliveries will stop, but past deliveries remain saved in your records.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleCancelSubscription(sub.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Cancel Subscription
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubscriptionSettings;
