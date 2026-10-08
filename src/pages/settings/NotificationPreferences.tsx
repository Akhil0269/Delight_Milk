import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Bell, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";

interface NotificationPreferences {
    order_notifications: boolean;
    delivery_notifications: boolean;
    payment_notifications: boolean;
    subscription_notifications: boolean;
    promotional_notifications: boolean;
    email_notifications: boolean;
    sms_notifications: boolean;
}

const NotificationPreferencesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch current preferences
    const { data: preferences, isLoading } = useQuery({
        queryKey: ["notification-preferences", user?.id],
        queryFn: async () => {
            if (!user) return null;

            const { data, error } = await supabase
                .from("user_preferences")
                .select("notification_preferences")
                .eq("user_id", user.id)
                .single();

            if (error && error.code !== "PGRST116") throw error;

            return (data?.notification_preferences as NotificationPreferences) || {
                order_notifications: true,
                delivery_notifications: true,
                payment_notifications: true,
                subscription_notifications: true,
                promotional_notifications: true,
                email_notifications: true,
                sms_notifications: false,
            };
        },
        enabled: !!user,
    });

    const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(
        preferences || {
            order_notifications: true,
            delivery_notifications: true,
            payment_notifications: true,
            subscription_notifications: true,
            promotional_notifications: true,
            email_notifications: true,
            sms_notifications: false,
        }
    );

    // Update preferences when fetched
    useEffect(() => {
        if (preferences) {
            setLocalPreferences(preferences);
        }
    }, [preferences]);

    // Save preferences mutation
    const saveMutation = useMutation({
        mutationFn: async (prefs: NotificationPreferences) => {
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("user_preferences")
                .upsert(
                    {
                        user_id: user.id,
                        notification_preferences: prefs,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id' }
                );

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
            toast.success("Notification preferences saved");
        },
        onError: () => {
            toast.error("Failed to save preferences");
        },
    });

    const handleToggle = (key: keyof NotificationPreferences) => {
        setLocalPreferences((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleSave = () => {
        saveMutation.mutate(localPreferences);
    };

    const notificationSettings = [
        {
            key: "order_notifications" as keyof NotificationPreferences,
            title: "Order Notifications",
            description: "Get notified when orders are placed or updated",
            badge: "Backend Trigger",
            badgeColor: "bg-green-600/10 text-green-700 dark:text-green-400 border-green-200",
        },
        {
            key: "delivery_notifications" as keyof NotificationPreferences,
            title: "Delivery Notifications",
            description: "Receive updates about your 7:00 AM deliveries",
            badge: "Backend Trigger",
            badgeColor: "bg-green-600/10 text-green-700 dark:text-green-400 border-green-200",
        },
        {
            key: "payment_notifications" as keyof NotificationPreferences,
            title: "Payment Notifications",
            description: "Alerts for successful payments, PhonePe receipts & refunds",
            badge: "Backend Trigger",
            badgeColor: "bg-green-600/10 text-green-700 dark:text-green-400 border-green-200",
        },
        {
            key: "subscription_notifications" as keyof NotificationPreferences,
            title: "Subscription Notifications",
            description: "Updates about daily plan activations, pauses, resumes & skips",
            badge: "Backend Trigger",
            badgeColor: "bg-green-600/10 text-green-700 dark:text-green-400 border-green-200",
        },
        {
            key: "promotional_notifications" as keyof NotificationPreferences,
            title: "Promotional Offers",
            description: "Receive seasonal dairy offers, discounts, and fresh announcements",
            badge: "In-App",
            badgeColor: "bg-primary/10 text-primary border-primary/20",
        },
    ];

    const channelSettings = [
        {
            key: "email_notifications" as keyof NotificationPreferences,
            title: "Email Notifications",
            description: "Saved in user preferences (external mail dispatch in development)",
            badge: "Preference Saved",
            badgeColor: "bg-muted text-muted-foreground border-muted-foreground/30",
        },
        {
            key: "sms_notifications" as keyof NotificationPreferences,
            title: "SMS Notifications",
            description: "Saved in user preferences (SMS gateway integration in development)",
            badge: "Preference Saved",
            badgeColor: "bg-muted text-muted-foreground border-muted-foreground/30",
        },
    ];

    return (
        <div className="min-h-screen bg-muted/30">
            <DashboardNavbar />

            {/* Header */}
            <div className="bg-card border-b sticky top-16 md:top-20 z-10">
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
                            <h1 className="text-2xl font-bold">Notification Preferences</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage how you receive notifications
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Notification Types */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Notification Types
                            </CardTitle>
                            <CardDescription>
                                Active database triggers enforce these preferences on orders, deliveries, payments, and subscriptions
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {notificationSettings.map((setting) => (
                                <div
                                    key={setting.key}
                                    className="flex items-center justify-between p-4 rounded-lg border"
                                >
                                    <div className="flex-1 pr-3">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor={setting.key} className="font-medium cursor-pointer">
                                                {setting.title}
                                            </Label>
                                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${setting.badgeColor}`}>
                                                {setting.badge}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {setting.description}
                                        </p>
                                    </div>
                                    <Switch
                                        id={setting.key}
                                        checked={localPreferences[setting.key]}
                                        onCheckedChange={() => handleToggle(setting.key)}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Notification Channels */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Delivery Channels</CardTitle>
                            <CardDescription>
                                Channel settings saved to public.user_preferences (In-app realtime delivery active; external SMS/Email gateways in rollout)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {channelSettings.map((setting) => (
                                <div
                                    key={setting.key}
                                    className="flex items-center justify-between p-4 rounded-lg border"
                                >
                                    <div className="flex-1 pr-3">
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor={setting.key} className="font-medium cursor-pointer">
                                                {setting.title}
                                            </Label>
                                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${setting.badgeColor}`}>
                                                {setting.badge}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {setting.description}
                                        </p>
                                    </div>
                                    <Switch
                                        id={setting.key}
                                        checked={localPreferences[setting.key]}
                                        onCheckedChange={() => handleToggle(setting.key)}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Save Button */}
                    <Button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="w-full"
                        size="lg"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {saveMutation.isPending ? "Saving..." : "Save Preferences"}
                    </Button>
                </motion.div>
            </div>
        </div>
    );
};

export default NotificationPreferencesPage;
