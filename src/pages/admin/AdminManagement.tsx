import { useState, useMemo } from "react";
import {
    useAdminList,
    useAdminUsers,
    usePromoteUser,
    useDemoteUser,
    AdminWorkforceItem,
} from "@/hooks/useAdmin";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ShieldCheck,
    Search,
    UserPlus,
    UserMinus,
    AlertTriangle,
    Clock,
    Activity,
    Mail,
    Phone,
    RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminManagement() {
    const { user: currentUser } = useAuth();
    const { data: admins = [], isLoading, isError, error, refetch } = useAdminList();
    const { data: allUsers = [], isLoading: isLoadingUsers } = useAdminUsers();

    const promoteUser = usePromoteUser();
    const demoteUser = useDemoteUser();

    const [searchQuery, setSearchQuery] = useState("");
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState("");
    const [removeTarget, setRemoveTarget] = useState<AdminWorkforceItem | null>(null);

    // Filter available non-admin users for promotion
    const eligibleUsers = useMemo(() => {
        const adminUserIds = new Set(admins.map((a) => a.user_id));
        return allUsers.filter((u) => !adminUserIds.has(u.user_id) && !u.is_blocked);
    }, [admins, allUsers]);

    // Filtered admin list based on search
    const filteredAdmins = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return admins;
        return admins.filter(
            (a) =>
                (a.full_name && a.full_name.toLowerCase().includes(q)) ||
                (a.email && a.email.toLowerCase().includes(q)) ||
                (a.phone && a.phone.includes(q))
        );
    }, [admins, searchQuery]);

    const handlePromote = async () => {
        if (!selectedUserId) return;
        await promoteUser.mutateAsync({ userId: selectedUserId, role: "admin" });
        setAddModalOpen(false);
        setSelectedUserId("");
    };

    const handleDemote = async () => {
        if (!removeTarget) return;
        await demoteUser.mutateAsync({ userId: removeTarget.user_id, role: "admin" });
        setRemoveTarget(null);
    };

    return (
        <div className="space-y-6 p-1 md:p-2">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-purple-600" />
                        Admin Management
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Manage system administrators, permissions, and audit authority.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => setAddModalOpen(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Admin
                    </Button>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border border-purple-100 bg-purple-50/30">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-purple-700 uppercase tracking-wider">
                            Total Administrators
                        </p>
                        <p className="text-2xl font-bold mt-1 text-purple-900">{admins.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Active Accounts
                        </p>
                        <p className="text-2xl font-bold mt-1 text-emerald-600">
                            {admins.filter((a) => !a.is_blocked).length}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Suspended Accounts
                        </p>
                        <p className="text-2xl font-bold mt-1 text-rose-600">
                            {admins.filter((a) => a.is_blocked).length}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search admins by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Content area */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-4">
                            <Skeleton className="h-12 w-full" />
                        </Card>
                    ))}
                </div>
            ) : isError ? (
                <Card className="p-8 text-center border-destructive/20 bg-destructive/5">
                    <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                    <p className="font-semibold text-destructive">Failed to load administrators</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {(error as Error)?.message || "An unexpected error occurred"}
                    </p>
                    <Button variant="outline" onClick={() => refetch()} className="mt-4">
                        Retry
                    </Button>
                </Card>
            ) : filteredAdmins.length === 0 ? (
                <Card className="p-12 text-center">
                    <ShieldCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg">No administrators found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery
                            ? `No administrators match "${searchQuery}".`
                            : "There are no administrators configured."}
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAdmins.map((admin) => {
                        const isSelf = currentUser?.id === admin.user_id;
                        const isOnlyAdmin = admins.length <= 1;
                        // Also disable if self-demotion would leave no other active unblocked admins
                        const otherActiveAdmins = admins.filter(
                            (a) => a.user_id !== admin.user_id && !a.is_blocked
                        );
                        const isSelfWithNoBackup = isSelf && otherActiveAdmins.length === 0;
                        const cannotDemote = isOnlyAdmin || isSelfWithNoBackup;

                        return (
                            <Card
                                key={admin.id}
                                className={`transition-all hover:shadow-md ${
                                    isSelf ? "border-purple-300 bg-purple-50/10" : ""
                                }`}
                            >
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-base leading-tight">
                                                    {admin.full_name || "Admin"}
                                                </h3>
                                                {isSelf && (
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-[10px] px-1.5 py-0 bg-purple-100 text-purple-800"
                                                    >
                                                        You
                                                    </Badge>
                                                )}
                                            </div>
                                            <Badge
                                                variant={admin.is_blocked ? "destructive" : "default"}
                                                className={
                                                    admin.is_blocked
                                                        ? ""
                                                        : "bg-purple-600 hover:bg-purple-700 text-white"
                                                }
                                            >
                                                {admin.is_blocked ? "Suspended" : "Administrator"}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setRemoveTarget(admin)}
                                                disabled={cannotDemote || demoteUser.isPending}
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2"
                                                title={
                                                    isOnlyAdmin
                                                        ? "Cannot remove the last remaining administrator"
                                                        : isSelfWithNoBackup
                                                        ? "Cannot demote yourself: no other active administrator exists"
                                                        : "Demote admin"
                                                }
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-xs text-muted-foreground border-t pt-3">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">{admin.email || "No email"}</span>
                                        </div>
                                        {admin.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3.5 h-3.5 shrink-0" />
                                                <span>{admin.phone}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 shrink-0" />
                                            <span>
                                                Added:{" "}
                                                {admin.role_assigned_at || admin.created_at
                                                    ? format(
                                                          new Date(admin.role_assigned_at || admin.created_at),
                                                          "MMM d, yyyy"
                                                      )
                                                    : "N/A"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Activity className="w-3.5 h-3.5 shrink-0 text-purple-600" />
                                            <span>
                                                Actions logged:{" "}
                                                <strong className="text-foreground">
                                                    {admin.total_actions_count || 0}
                                                </strong>
                                                {admin.last_active_at && (
                                                    <span className="ml-1 text-[11px]">
                                                        (
                                                        {format(
                                                            new Date(admin.last_active_at),
                                                            "MMM d, HH:mm"
                                                        )}
                                                        )
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add Admin Dialog */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-purple-600" />
                            Promote User to Administrator
                        </DialogTitle>
                        <DialogDescription>
                            Assign the administrator role to an existing authenticated user. They will gain
                            full access to administrative controls.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-3">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select User Account</label>
                            {isLoadingUsers ? (
                                <Skeleton className="h-10 w-full" />
                            ) : eligibleUsers.length === 0 ? (
                                <p className="text-xs text-muted-foreground p-3 border rounded-md bg-muted/40">
                                    No eligible non-admin users found. All active users are already
                                    administrators or suspended.
                                </p>
                            ) : (
                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose an active user" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60">
                                        {eligibleUsers.map((u) => (
                                            <SelectItem key={u.user_id} value={u.user_id}>
                                                {u.full_name || u.email || "Unnamed User"} (
                                                {u.email || u.phone || "No contact"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3 text-xs flex gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                            <div>
                                <p className="font-semibold">Security Confirmation</p>
                                <p className="mt-0.5">
                                    This action grants administrative authority. This action is recorded in
                                    the security audit log.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setAddModalOpen(false);
                                setSelectedUserId("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePromote}
                            disabled={!selectedUserId || promoteUser.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {promoteUser.isPending ? "Promoting..." : "Confirm Promotion"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Demote Admin Confirmation Dialog */}
            <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                            Remove Administrator Role
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove the administrator role from{" "}
                            <strong className="text-foreground">
                                {removeTarget?.full_name || removeTarget?.email || "this user"}
                            </strong>
                            ?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 text-sm text-muted-foreground space-y-2">
                        <p>
                            The user account will NOT be deleted. They will safely retain standard customer
                            access to the application.
                        </p>
                        {admins.length <= 1 && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-semibold">
                                Warning: Cannot remove the last remaining administrator of the system.
                            </div>
                        )}
                        {currentUser?.id === removeTarget?.user_id &&
                            admins.filter((a) => a.user_id !== removeTarget?.user_id && !a.is_blocked).length === 0 &&
                            admins.length > 1 && (
                            <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-md text-xs font-semibold">
                                Warning: You are the only active (unblocked) administrator. You cannot demote yourself until another active administrator exists.
                            </div>
                        )}
                        {currentUser?.id === removeTarget?.user_id &&
                            admins.filter((a) => a.user_id !== removeTarget?.user_id && !a.is_blocked).length > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-md text-xs">
                                <strong>Self-Demotion Warning:</strong> You are about to remove your own
                                administrative privileges.
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRemoveTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDemote}
                            disabled={
                                demoteUser.isPending ||
                                admins.length <= 1 ||
                                (currentUser?.id === removeTarget?.user_id &&
                                    admins.filter((a) => a.user_id !== removeTarget?.user_id && !a.is_blocked).length === 0)
                            }
                        >
                            {demoteUser.isPending ? "Removing..." : "Remove Admin Role"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
