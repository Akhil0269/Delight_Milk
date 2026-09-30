import { useState, useEffect } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface AdminNotification {
    id: string;
    type: string;
    message: string;
    date: string;
    read: boolean;
    link?: string;
}

const AdminNotifications = () => {
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);

    useEffect(() => {
        const loadNotifications = () => {
            try {
                const stored = JSON.parse(localStorage.getItem('dev_admin_notifications') || '[]');
                if (Array.isArray(stored)) {
                    setNotifications(stored);
                }
            } catch (e) {
                console.error("Failed to load notifications", e);
            }
        };

        loadNotifications();

        // Poll for changes (since storage event only works across tabs)
        const interval = setInterval(loadNotifications, 2000);
        return () => clearInterval(interval);
    }, []);

    const markAsRead = (id: string) => {
        const updated = notifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        );
        setNotifications(updated);
        localStorage.setItem('dev_admin_notifications', JSON.stringify(updated));
    };

    const markAllAsRead = () => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updated);
        localStorage.setItem('dev_admin_notifications', JSON.stringify(updated));
    };

    const clearAll = () => {
        setNotifications([]);
        localStorage.setItem('dev_admin_notifications', '[]');
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground">
                        Manage your admin alerts and order notifications.
                    </p>
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <Button variant="outline" onClick={markAllAsRead}>
                            <Check className="mr-2 h-4 w-4" />
                            Mark all read
                        </Button>
                    )}
                    {notifications.length > 0 && (
                        <Button variant="destructive" size="icon" onClick={clearAll}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-4">
                {notifications.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center h-40">
                            <Bell className="h-10 w-10 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No notifications yet</p>
                        </CardContent>
                    </Card>
                ) : (
                    notifications.map((notification) => (
                        <Card key={notification.id} className={`${!notification.read ? 'border-l-4 border-l-primary bg-accent/5' : ''}`}>
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base font-medium">
                                            {notification.type === 'new_order' ? 'New Order Received' : 'Notification'}
                                        </CardTitle>
                                        {!notification.read && <Badge>New</Badge>}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(notification.date).toLocaleString()}
                                    </p>
                                </div>
                                {!notification.read && (
                                    <Button variant="ghost" size="icon" onClick={() => markAsRead(notification.id)}>
                                        <Check className="h-4 w-4" />
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm">{notification.message}</p>
                                {notification.link && (
                                    <Link to={notification.link} className="text-sm text-primary hover:underline mt-2 inline-block">
                                        View Details
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
