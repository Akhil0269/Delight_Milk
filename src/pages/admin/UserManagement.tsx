// User Management Page - Admin can manage all users with Supabase integration
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    useAdminUsers,
    useBlockUser,
    useUpdateUserDetails,
    AdminUserItem,
} from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Search,
    Ban,
    CheckCircle,
    Edit,
    Eye,
    Calendar,
    User,
    Mail,
    Phone,
    MapPin,
    Shield,
    ShoppingBag,
    CalendarDays,
    Wallet,
    AlertTriangle,
    Loader2,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "sonner";

interface UserActivityStats {
    ordersCount: number;
    subscriptionsCount: number;
    walletBalance: number;
    isLoading: boolean;
}

const UserManagement = () => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { data: users, isLoading, error, refetch } = useAdminUsers();
    const blockUser = useBlockUser();
    const updateUser = useUpdateUserDetails();

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "admins" | "customers">("all");

    // Dialog states
    const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [confirmBlockDialogOpen, setConfirmBlockDialogOpen] = useState(false);
    const [userToBlock, setUserToBlock] = useState<AdminUserItem | null>(null);

    // Edit form
    const [editForm, setEditForm] = useState({ full_name: "", phone: "", address: "" });
    const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

    // User activity statistics for detail modal
    const [userStats, setUserStats] = useState<UserActivityStats>({
        ordersCount: 0,
        subscriptionsCount: 0,
        walletBalance: 0,
        isLoading: false,
    });

    // Counts summary
    const counts = useMemo(() => {
        const total = users?.length || 0;
        const active = users?.filter((u) => !u.is_blocked).length || 0;
        const blocked = users?.filter((u) => u.is_blocked).length || 0;
        const admins = users?.filter((u) => u.role === "admin").length || 0;
        const customers = users?.filter((u) => u.role === "customer").length || 0;
        return { total, active, blocked, admins, customers };
    }, [users]);

    // Filtered users list
    const filteredUsers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return (users || []).filter((user) => {
            const matchesSearch =
                !query ||
                (user.full_name && user.full_name.toLowerCase().includes(query)) ||
                (user.email && user.email.toLowerCase().includes(query)) ||
                (user.phone && user.phone.includes(query)) ||
                (user.address && user.address.toLowerCase().includes(query));

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "active" && !user.is_blocked) ||
                (statusFilter === "blocked" && user.is_blocked) ||
                (statusFilter === "admins" && user.role === "admin") ||
                (statusFilter === "customers" && user.role === "customer");

            return matchesSearch && matchesStatus;
        });
    }, [users, searchTerm, statusFilter]);

    // Fetch user details stats when details dialog opens
    useEffect(() => {
        if (!selectedUser || !detailsDialogOpen) return;

        let isCancelled = false;
        setUserStats({ ordersCount: 0, subscriptionsCount: 0, walletBalance: 0, isLoading: true });

        const fetchStats = async () => {
            try {
                const targetUserId = selectedUser.user_id || selectedUser.id;

                const [ordersRes, subsRes, walletRes] = await Promise.all([
                    supabase
                        .from("orders")
                        .select("id", { count: "exact", head: true })
                        .eq("user_id", targetUserId),
                    supabase
                        .from("subscriptions")
                        .select("id", { count: "exact", head: true })
                        .eq("user_id", targetUserId),
                    supabase
                        .from("wallets")
                        .select("balance")
                        .eq("user_id", targetUserId)
                        .maybeSingle(),
                ]);

                if (!isCancelled) {
                    setUserStats({
                        ordersCount: ordersRes.count || 0,
                        subscriptionsCount: subsRes.count || 0,
                        walletBalance: Number(walletRes.data?.balance) || 0,
                        isLoading: false,
                    });
                }
            } catch (err) {
                console.warn("Failed to load user stats:", err);
                if (!isCancelled) {
                    setUserStats((prev) => ({ ...prev, isLoading: false }));
                }
            }
        };

        fetchStats();

        return () => {
            isCancelled = true;
        };
    }, [selectedUser, detailsDialogOpen]);

    const handleOpenDetails = (user: AdminUserItem) => {
        setSelectedUser(user);
        setDetailsDialogOpen(true);
    };

    const handleOpenEdit = (user: AdminUserItem) => {
        setSelectedUser(user);
        setEditForm({
            full_name: user.full_name || "",
            phone: user.phone || "",
            address: user.address || "",
        });
        setEditFormErrors({});
        setEditDialogOpen(true);
    };

    const handleSaveUser = () => {
        if (!selectedUser) return;

        const errors: Record<string, string> = {};
        if (editForm.full_name && editForm.full_name.trim().length < 2) {
            errors.full_name = "Full name must be at least 2 characters.";
        }
        if (editForm.phone && !/^\+?[0-9\s-]{7,15}$/.test(editForm.phone.trim())) {
            errors.phone = "Please enter a valid phone number (digits only).";
        }

        if (Object.keys(errors).length > 0) {
            setEditFormErrors(errors);
            return;
        }

        updateUser.mutate(
            {
                userId: selectedUser.id,
                updates: editForm,
            },
            {
                onSuccess: () => {
                    setEditDialogOpen(false);
                },
            }
        );
    };

    const handleInitiateBlockToggle = (user: AdminUserItem) => {
        // Prevent self-lockout
        if (currentUser?.id && user.user_id === currentUser.id) {
            toast.error("You cannot suspend your own admin account.");
            return;
        }

        if (user.is_blocked) {
            // Unblock immediately with mutation
            blockUser.mutate({ userId: user.id, block: false });
        } else {
            // Confirm suspension
            setUserToBlock(user);
            setConfirmBlockDialogOpen(true);
        }
    };

    const handleConfirmBlock = () => {
        if (!userToBlock) return;
        blockUser.mutate(
            { userId: userToBlock.id, block: true },
            {
                onSuccess: () => {
                    setConfirmBlockDialogOpen(false);
                    setUserToBlock(null);
                },
            }
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage customer accounts, roles, access statuses, and delivery calendar links.
                    </p>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card
                    onClick={() => setStatusFilter("all")}
                    className={`cursor-pointer transition-all border p-3 ${
                        statusFilter === "all" ? "ring-2 ring-primary bg-primary/5" : "hover:border-primary/50"
                    }`}
                >
                    <CardDescription className="text-xs uppercase font-semibold">Total Users</CardDescription>
                    <CardTitle className="text-xl font-bold mt-1">{counts.total}</CardTitle>
                </Card>

                <Card
                    onClick={() => setStatusFilter("active")}
                    className={`cursor-pointer transition-all border p-3 ${
                        statusFilter === "active" ? "ring-2 ring-green-600 bg-green-500/5" : "hover:border-green-600/50"
                    }`}
                >
                    <CardDescription className="text-xs uppercase font-semibold text-green-700">Active</CardDescription>
                    <CardTitle className="text-xl font-bold text-green-600 mt-1">{counts.active}</CardTitle>
                </Card>

                <Card
                    onClick={() => setStatusFilter("blocked")}
                    className={`cursor-pointer transition-all border p-3 ${
                        statusFilter === "blocked" ? "ring-2 ring-red-600 bg-red-500/5" : "hover:border-red-600/50"
                    }`}
                >
                    <CardDescription className="text-xs uppercase font-semibold text-red-700">Suspended</CardDescription>
                    <CardTitle className="text-xl font-bold text-red-600 mt-1">{counts.blocked}</CardTitle>
                </Card>

                <Card
                    onClick={() => setStatusFilter("admins")}
                    className={`cursor-pointer transition-all border p-3 ${
                        statusFilter === "admins" ? "ring-2 ring-purple-600 bg-purple-500/5" : "hover:border-purple-600/50"
                    }`}
                >
                    <CardDescription className="text-xs uppercase font-semibold text-purple-700">Admins</CardDescription>
                    <CardTitle className="text-xl font-bold text-purple-600 mt-1">{counts.admins}</CardTitle>
                </Card>

                <Card
                    onClick={() => setStatusFilter("customers")}
                    className={`cursor-pointer transition-all border p-3 ${
                        statusFilter === "customers" ? "ring-2 ring-blue-600 bg-blue-500/5" : "hover:border-blue-600/50"
                    }`}
                >
                    <CardDescription className="text-xs uppercase font-semibold text-blue-700">Customers</CardDescription>
                    <CardTitle className="text-xl font-bold text-blue-600 mt-1">{counts.customers}</CardTitle>
                </Card>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                        placeholder="Search by name, email, phone, or address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-sm bg-muted/30"
                    />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                        type="button"
                        onClick={() => setStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            statusFilter === "all" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        All ({counts.total})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("active")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            statusFilter === "active" ? "bg-green-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Active ({counts.active})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("blocked")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            statusFilter === "blocked" ? "bg-red-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Suspended ({counts.blocked})
                    </button>
                </div>
            </div>

            {/* Users Content Table */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                </div>
            ) : error ? (
                <Card className="p-8 text-center border-destructive/20 bg-destructive/5 space-y-3">
                    <p className="text-destructive font-semibold">Failed to load users from database</p>
                    <p className="text-xs text-muted-foreground">
                        {error instanceof Error ? error.message : "Database connection issue."}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                    </Button>
                </Card>
            ) : filteredUsers.length === 0 ? (
                <Card className="p-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-2xl">
                        👥
                    </div>
                    <h3 className="font-semibold text-lg">No users found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        {searchTerm
                            ? `No users match the search query "${searchTerm}".`
                            : "There are no users in this filter category."}
                    </p>
                    {(searchTerm || statusFilter !== "all") && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                            }}
                        >
                            Reset filters
                        </Button>
                    )}
                </Card>
            ) : (
                <Card className="overflow-hidden border shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b">
                                <tr>
                                    <th className="text-left p-3.5 pl-4">User</th>
                                    <th className="text-left p-3.5">Email</th>
                                    <th className="text-left p-3.5">Phone</th>
                                    <th className="text-left p-3.5">Role</th>
                                    <th className="text-left p-3.5">Status</th>
                                    <th className="text-left p-3.5">Joined</th>
                                    <th className="text-right p-3.5 pr-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredUsers.map((user) => {
                                    const isSelf = Boolean(currentUser?.id && user.user_id === currentUser.id);
                                    return (
                                        <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                            {/* User Name & Avatar */}
                                            <td className="p-3.5 pl-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                        {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-foreground truncate flex items-center gap-1.5">
                                                            <span>{user.full_name || "Nameless User"}</span>
                                                            {isSelf && (
                                                                <Badge variant="outline" className="text-[10px] py-0 px-1 border-primary/40 text-primary">
                                                                    You
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {user.address && (
                                                            <p className="text-xs text-muted-foreground truncate max-w-xs">
                                                                {user.address}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="p-3.5 text-muted-foreground truncate max-w-xs">
                                                {user.email || "No email"}
                                            </td>

                                            {/* Phone */}
                                            <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                                                {user.phone || "—"}
                                            </td>

                                            {/* Role */}
                                            <td className="p-3.5 whitespace-nowrap">
                                                <Badge
                                                    variant={user.role === "admin" ? "default" : "secondary"}
                                                    className={`capitalize text-xs font-medium ${
                                                        user.role === "admin" ? "bg-purple-600 hover:bg-purple-700" : ""
                                                    }`}
                                                >
                                                    {user.role}
                                                </Badge>
                                            </td>

                                            {/* Status */}
                                            <td className="p-3.5 whitespace-nowrap">
                                                {user.is_blocked ? (
                                                    <Badge variant="destructive" className="gap-1 text-xs">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                                        Suspended
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1 text-xs">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                                        Active
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Joined */}
                                            <td className="p-3.5 text-xs text-muted-foreground whitespace-nowrap">
                                                {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"}
                                            </td>

                                            {/* Actions */}
                                            <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* View Details */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => handleOpenDetails(user)}
                                                        title="View user details & stats"
                                                    >
                                                        <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                                    </Button>

                                                    {/* View Delivery Calendar */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => navigate(`/admin/customer/${user.user_id || user.id}/calendar`)}
                                                        title="View customer delivery calendar"
                                                    >
                                                        <Calendar className="w-4 h-4 text-primary" />
                                                    </Button>

                                                    {/* Edit */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => handleOpenEdit(user)}
                                                        title="Edit user details"
                                                    >
                                                        <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                                    </Button>

                                                    {/* Suspend / Restore */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className={`h-8 px-2 text-xs gap-1 ${
                                                            user.is_blocked
                                                                ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                : "text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        }`}
                                                        onClick={() => handleInitiateBlockToggle(user)}
                                                        disabled={isSelf || blockUser.isPending}
                                                        title={
                                                            isSelf
                                                                ? "Cannot suspend your own account"
                                                                : user.is_blocked
                                                                ? "Restore account access"
                                                                : "Suspend account"
                                                        }
                                                    >
                                                        {user.is_blocked ? (
                                                            <>
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                                <span className="hidden md:inline">Unblock</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Ban className="w-3.5 h-3.5" />
                                                                <span className="hidden md:inline">Suspend</span>
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* USER DETAILS DIALOG */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            Customer Profile Details
                        </DialogTitle>
                        <DialogDescription>
                            Authoritative profile data and account activity from Supabase.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedUser && (
                        <div className="space-y-4 py-2 text-sm">
                            {/* User Header */}
                            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border">
                                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                                    {selectedUser.full_name ? selectedUser.full_name.charAt(0).toUpperCase() : "U"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                        <h3 className="font-semibold text-base truncate">
                                            {selectedUser.full_name || "Nameless User"}
                                        </h3>
                                        <Badge
                                            variant={selectedUser.is_blocked ? "destructive" : "default"}
                                            className="text-[10px] px-1.5 py-0"
                                        >
                                            {selectedUser.is_blocked ? "Suspended" : "Active"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        <Badge variant="outline" className="text-[10px] capitalize">
                                            {selectedUser.role}
                                        </Badge>
                                        <span>Joined {format(new Date(selectedUser.created_at), "MMM d, yyyy")}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-2 p-3 bg-card rounded-xl border text-xs">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-foreground font-medium truncate">{selectedUser.email || "No email"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-foreground font-medium">{selectedUser.phone || "No phone provided"}</span>
                                </div>
                                <div className="flex items-start gap-2 text-muted-foreground">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span className="text-foreground font-medium leading-relaxed">
                                        {selectedUser.address || "No delivery address on record"}
                                    </span>
                                </div>
                            </div>

                            {/* Activity Metrics */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-3 bg-muted/30 rounded-xl border text-center space-y-1">
                                    <ShoppingBag className="w-4 h-4 mx-auto text-blue-600" />
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Orders</p>
                                    <p className="text-base font-bold">
                                        {userStats.isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : userStats.ordersCount}
                                    </p>
                                </div>

                                <div className="p-3 bg-muted/30 rounded-xl border text-center space-y-1">
                                    <CalendarDays className="w-4 h-4 mx-auto text-purple-600" />
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Subs</p>
                                    <p className="text-base font-bold">
                                        {userStats.isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : userStats.subscriptionsCount}
                                    </p>
                                </div>

                                <div className="p-3 bg-muted/30 rounded-xl border text-center space-y-1">
                                    <Wallet className="w-4 h-4 mx-auto text-green-600" />
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Wallet</p>
                                    <p className="text-base font-bold text-green-600">
                                        {userStats.isLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                        ) : (
                                            `₹${userStats.walletBalance.toFixed(2)}`
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Suspension Banner if Blocked */}
                            {selectedUser.is_blocked && (
                                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                                    <div className="flex items-center gap-1.5 font-semibold">
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        Account Suspended
                                    </div>
                                    <p className="text-muted-foreground">
                                        This user is restricted from ordering, checkout, and modifying account data.
                                    </p>
                                </div>
                            )}

                            {/* Quick Navigation Button */}
                            <Button
                                className="w-full gap-2"
                                variant="outline"
                                onClick={() => {
                                    setDetailsDialogOpen(false);
                                    navigate(`/admin/customer/${selectedUser.user_id || selectedUser.id}/calendar`);
                                }}
                            >
                                <Calendar className="w-4 h-4" />
                                View Customer Delivery Schedule
                            </Button>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* EDIT USER DIALOG */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Customer Information</DialogTitle>
                        <DialogDescription>
                            Update the customer's personal and delivery contact information.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-name" className="text-xs font-semibold">
                                Full Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-name"
                                value={editForm.full_name}
                                onChange={(e) => {
                                    setEditForm({ ...editForm, full_name: e.target.value });
                                    if (editFormErrors.full_name) setEditFormErrors({ ...editFormErrors, full_name: "" });
                                }}
                                className={editFormErrors.full_name ? "border-destructive" : ""}
                            />
                            {editFormErrors.full_name && (
                                <p className="text-xs text-destructive">{editFormErrors.full_name}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-phone" className="text-xs font-semibold">Phone Number</Label>
                            <Input
                                id="edit-phone"
                                value={editForm.phone}
                                onChange={(e) => {
                                    setEditForm({ ...editForm, phone: e.target.value });
                                    if (editFormErrors.phone) setEditFormErrors({ ...editFormErrors, phone: "" });
                                }}
                                placeholder="+91 9876543210"
                                className={editFormErrors.phone ? "border-destructive" : ""}
                            />
                            {editFormErrors.phone && (
                                <p className="text-xs text-destructive">{editFormErrors.phone}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="edit-address" className="text-xs font-semibold">Delivery Address</Label>
                            <Input
                                id="edit-address"
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                placeholder="House number, street, locality, landmark"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updateUser.isPending}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveUser} disabled={updateUser.isPending} className="gap-2">
                            {updateUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CONFIRM SUSPENSION DIALOG */}
            <Dialog open={confirmBlockDialogOpen} onOpenChange={setConfirmBlockDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Ban className="w-5 h-5" />
                            Suspend Customer Account
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to suspend access for{" "}
                            <strong>{userToBlock?.full_name || userToBlock?.email || "this user"}</strong>?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 text-sm text-muted-foreground space-y-2">
                        <p>
                            Suspending this account will:
                        </p>
                        <ul className="list-disc pl-5 space-y-1 text-xs">
                            <li>Prevent the user from placing new orders or checkout</li>
                            <li>Prevent the user from modifying subscriptions or profile data</li>
                            <li>Preserve all historical deliveries, orders, payments, and receipts intact</li>
                        </ul>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setConfirmBlockDialogOpen(false);
                                setUserToBlock(null);
                            }}
                            disabled={blockUser.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmBlock}
                            disabled={blockUser.isPending}
                            className="gap-2"
                        >
                            {blockUser.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Confirm Suspension
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserManagement;
