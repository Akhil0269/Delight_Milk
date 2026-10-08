import { Bell, Check, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
    useNotifications,
    useMarkAsRead,
    useMarkAllAsRead,
    useClearAllNotifications,
    useNotificationSubscription,
} from "@/hooks/useNotifications";
import { toast } from "sonner";

const AdminNotifications = () => {
    const { data: notifications = [], isLoading, error } = useNotifications();
    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();
    const clearAll = useClearAllNotifications();

    // Enable real-time updates via Supabase
    useNotificationSubscription();

    const handleMarkAsRead = async (id: string) => {
        try {
            await markAsRead.mutateAsync(id);
        } catch {
            toast.error("Failed to mark notification as read");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsRead.mutateAsync();
            toast.success("All notifications marked as read");
        } catch {
            toast.error("Failed to mark all as read");
        }
    };

    const handleClearAll = async () => {
        try {
            await clearAll.mutateAsync();
            toast.success("Cleared all notifications");
        } catch {
            toast.error("Failed to clear notifications");
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground">
                        Manage your admin alerts and operational notices.
                    </p>
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            onClick={handleMarkAllAsRead}
                            disabled={markAllAsRead.isPending}
                        >
                            <Check className="mr-2 h-4 w-4" />
                            Mark all read
                        </Button>
                    )}
                    {notifications.length > 0 && (
                        <Button
                            variant="destructive"
                            size="icon"
                            onClick={handleClearAll}
                            disabled={clearAll.isPending}
                            title="Clear all notifications"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-4">
                {isLoading ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p>Loading notifications...</p>
                        </CardContent>
                    </Card>
                ) : error ? (
                    <Card className="border-destructive/30">
                        <CardContent className="flex flex-col items-center justify-center h-40 text-destructive gap-2">
                            <AlertCircle className="h-8 w-8" />
                            <p className="font-medium">Failed to load notifications</p>
                        </CardContent>
                    </Card>
                ) : notifications.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center h-40">
                            <Bell className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
                            <p className="text-muted-foreground font-medium">No notifications yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                System alerts and order events will appear here in real time.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    notifications.map((notification) => (
                        <Card
                            key={notification.id}
                            className={`transition-all ${
                                !notification.is_read ? 'border-l-4 border-l-primary bg-primary/5 shadow-sm' : ''
                            }`}
                        >
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base font-semibold">
                                            {notification.title || (notification.type === 'order_placed' ? 'New Order Placed' : 'Notification')}
                                        </CardTitle>
                                        {!notification.is_read && <Badge variant="default" className="text-xs">New</Badge>}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(notification.created_at).toLocaleString()}
                                    </p>
                                </div>
                                {!notification.is_read && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleMarkAsRead(notification.id)}
                                        title="Mark as read"
                                    >
                                        <Check className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-foreground/90">{notification.message}</p>
                                {notification.action_url && (
                                    <Link
                                        to={notification.action_url}
                                        className="text-xs font-semibold text-primary hover:underline mt-2 inline-block"
                                    >
                                        View Details →
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminNotifications;
