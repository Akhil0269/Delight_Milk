import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, Trash2, X, Package, CreditCard, Gift, Megaphone, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
    useNotifications,
    useUnreadCount,
    useMarkAsRead,
    useMarkAllAsRead,
    useDeleteNotification,
    useClearAllNotifications,
    useNotificationSubscription,
    Notification,
} from "@/hooks/useNotifications";
import { toast } from "sonner";

const NotificationIcon = ({ type }: { type: string }) => {
    const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
        order_placed: Package,
        order_delivered: Check,
        subscription_created: Calendar,
        subscription_paused: Calendar,
        subscription_resumed: Calendar,
        subscription_cancelled: Calendar,
        payment_success: CreditCard,
        payment_failed: AlertCircle,
        offer: Gift,
        referral_reward: Gift,
        admin_announcement: Megaphone,
        delivery_reminder: Bell,
        wallet_low_balance: CreditCard,
    };

    const Icon = iconMap[type] || Bell;

    const colorMap: Record<string, string> = {
        order_placed: "bg-blue-500",
        order_delivered: "bg-green-500",
        subscription_created: "bg-blue-500",
        subscription_paused: "bg-yellow-500",
        subscription_resumed: "bg-green-500",
        subscription_cancelled: "bg-gray-500",
        payment_success: "bg-green-500",
        payment_failed: "bg-red-500",
        offer: "bg-purple-500",
        referral_reward: "bg-purple-500",
        admin_announcement: "bg-blue-500",
        delivery_reminder: "bg-orange-500",
        wallet_low_balance: "bg-red-500",
    };

    return (
        <div className={`w-10 h-10 rounded-full ${colorMap[type] || "bg-gray-500"} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
    );
};

const NotificationsDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const { data: notifications = [], isLoading } = useNotifications();
    const { data: unreadCount = 0 } = useUnreadCount();
    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();
    const deleteNotification = useDeleteNotification();
    const clearAll = useClearAllNotifications();

    // Subscribe to real-time updates
    useNotificationSubscription();

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read
        if (!notification.is_read) {
            markAsRead.mutate(notification.id);
        }

        // Navigate to action URL if exists
        if (notification.action_url) {
            navigate(notification.action_url);
            setIsOpen(false);
        }
    };

    const handleMarkAllRead = () => {
        markAllAsRead.mutate(undefined, {
            onSuccess: () => {
                toast.success("All notifications marked as read");
            },
        });
    };

    const handleClearAll = () => {
        clearAll.mutate(undefined, {
            onSuccess: () => {
                toast.success("All notifications cleared");
                setIsOpen(false);
            },
        });
    };

    const handleDelete = (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();
        deleteNotification.mutate(notificationId, {
            onSuccess: () => {
                toast.success("Notification deleted");
            },
        });
    };

    const formatTime = (timestamp: string) => {
        try {
            return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
        } catch {
            return "Recently";
        }
    };

    return (
        <div className="relative">
            {/* Bell Icon Button */}
            <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                        <span className="text-xs text-white font-bold">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    </motion.div>
                )}
            </Button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-2 w-96 bg-card border rounded-lg shadow-xl z-50 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-4 border-b bg-muted/30">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-lg">Notifications</h3>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>

                                {notifications.length > 0 && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleMarkAllRead}
                                            disabled={unreadCount === 0}
                                        >
                                            <Check className="w-3 h-3 mr-1" />
                                            Mark all read
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearAll}
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />
                                            Clear all
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Notifications List */}
                            <ScrollArea className="h-[400px]">
                                {isLoading ? (
                                    <div className="p-8 text-center text-muted-foreground">
                                        Loading notifications...
                                    </div>
                                ) : notifications.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <p className="text-muted-foreground">No notifications yet</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            We'll notify you when something important happens
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {notifications.map((notification) => (
                                            <motion.div
                                                key={notification.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${!notification.is_read ? "bg-primary/5" : ""
                                                    }`}
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                <div className="flex gap-3">
                                                    <NotificationIcon type={notification.type} />

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <h4 className={`font-medium text-sm ${!notification.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                                                                {notification.title}
                                                            </h4>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 flex-shrink-0"
                                                                onClick={(e) => handleDelete(e, notification.id)}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </Button>
                                                        </div>

                                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                            {notification.message}
                                                        </p>

                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatTime(notification.created_at)}
                                                            </span>
                                                            {!notification.is_read && (
                                                                <Badge variant="default" className="text-xs px-1.5 py-0">
                                                                    New
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>

                            {/* Footer */}
                            {notifications.length > 0 && (
                                <div className="p-3 border-t bg-muted/30 text-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs"
                                        onClick={() => {
                                            navigate("/notifications");
                                            setIsOpen(false);
                                        }}
                                    >
                                        View all notifications
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationsDropdown;
