// Customer Calendar View - Admin can view specific customer's delivery calendar
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdmin";
import AdminDeliveryCalendar from "@/components/admin/AdminDeliveryCalendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const CustomerCalendar = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { data: users, isLoading } = useAdminUsers();

    // Find the specific user by either profile ID or auth user ID
    const customer = users?.find((user) => user.id === userId || user.user_id === userId);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="space-y-6">
                <Card className="p-8 text-center">
                    <h2 className="text-2xl font-bold mb-4">Customer Not Found</h2>
                    <p className="text-muted-foreground mb-6">
                        The customer you're looking for doesn't exist.
                    </p>
                    <Button onClick={() => navigate("/admin/users")}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Users
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    onClick={() => navigate("/admin/users")}
                    className="gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Users
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Customer Calendar</h1>
                    <p className="text-muted-foreground mt-1">
                        View delivery schedule for {customer.full_name || "Customer"}
                    </p>
                </div>
            </div>

            {/* Customer Info Card */}
            <Card className="p-6">
                <div className="flex items-start justify-between">
                    <div className="space-y-4 flex-1">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{customer.full_name || "N/A"}</h2>
                                <p className="text-sm text-muted-foreground">Customer ID: {customer.id.slice(0, 8)}...</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span>{customer.email || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span>{customer.phone || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm col-span-full">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{customer.address || "No address provided"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <Badge variant={customer.is_blocked ? "destructive" : "default"}>
                            {customer.is_blocked ? "Blocked" : "Active"}
                        </Badge>
                        <Badge variant="secondary">
                            {customer.role || "customer"}
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* Delivery Calendar */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">Delivery Calendar</h2>
                    <Badge variant="secondary" className="ml-auto">Admin Mode</Badge>
                </div>

                <AdminDeliveryCalendar
                    customerId={customer.user_id || customer.id}
                    customerName={customer.full_name || "Customer"}
                />
            </Card>
        </div>
    );
};

export default CustomerCalendar;
