// User Management Page - Admin can manage all users
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAdminUsers, useBlockUser, useUpdateUserDetails, useDeleteUser } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Ban, CheckCircle, Edit, Eye, Trash2, Calendar } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const UserManagement = () => {
    const navigate = useNavigate();
    const { data: users, isLoading } = useAdminUsers();
    const blockUser = useBlockUser();
    const updateUser = useUpdateUserDetails();
    const deleteUser = useDeleteUser();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<any>(null);
    const [editForm, setEditForm] = useState({ full_name: "", phone: "", address: "" });

    const filteredUsers = users?.filter((user) =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user as any).email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
    );

    const handleBlockToggle = (userId: string, currentlyBlocked: boolean) => {
        blockUser.mutate({ userId, block: !currentlyBlocked });
    };

    const handleEditUser = (user: any) => {
        setSelectedUser(user);
        setEditForm({
            full_name: user.full_name || "",
            phone: user.phone || "",
            address: user.address || "",
        });
        setEditDialogOpen(true);
    };

    const handleSaveUser = () => {
        if (selectedUser) {
            updateUser.mutate({
                userId: selectedUser.id,
                updates: editForm,
            });
            setEditDialogOpen(false);
        }
    };

    const handleDeleteClick = (user: any) => {
        setUserToDelete(user);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = () => {
        if (userToDelete) {
            deleteUser.mutate(userToDelete.id);
            setDeleteDialogOpen(false);
            setUserToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">User Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage all users and their access
                    </p>
                </div>
            </div>

            {/* Search */}
            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </Card>

            {/* Users Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-4 font-semibold">Name</th>
                                <th className="text-left p-4 font-semibold">Email</th>
                                <th className="text-left p-4 font-semibold">Phone</th>
                                <th className="text-left p-4 font-semibold">Role</th>
                                <th className="text-left p-4 font-semibold">Status</th>
                                <th className="text-left p-4 font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-t">
                                        <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                                        <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                                        <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                                        <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                                        <td className="p-4"><Skeleton className="h-4 w-16" /></td>
                                        <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                                    </tr>
                                ))
                            ) : filteredUsers && filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-t hover:bg-muted/30">
                                        <td className="p-4">{user.full_name || "N/A"}</td>
                                        <td className="p-4">{(user as any).email || "N/A"}</td>
                                        <td className="p-4">{user.phone || "N/A"}</td>
                                        <td className="p-4">
                                            <Badge variant={(user as any).role === "admin" ? "default" : "secondary"}>
                                                {(user as any).role || "customer"}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            {(user as any).is_blocked ? (
                                                <Badge variant="destructive">Blocked</Badge>
                                            ) : (
                                                <Badge variant="default">Active</Badge>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => navigate(`/admin/customer/${user.id}/calendar`)}
                                                    title="View customer calendar"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEditUser(user)}
                                                    title="Edit user"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={(user as any).is_blocked ? "default" : "destructive"}
                                                    onClick={() => handleBlockToggle(user.id, (user as any).is_blocked)}
                                                    title={(user as any).is_blocked ? "Unblock user" : "Block user"}
                                                >
                                                    {(user as any).is_blocked ? (
                                                        <CheckCircle className="w-4 h-4" />
                                                    ) : (
                                                        <Ban className="w-4 h-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDeleteClick(user)}
                                                    title="Delete user"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Edit User Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User Details</DialogTitle>
                        <DialogDescription>
                            Update user information
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label>Full Name</Label>
                            <Input
                                value={editForm.full_name}
                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Phone</Label>
                            <Input
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Address</Label>
                            <Input
                                value={editForm.address}
                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={handleSaveUser} className="flex-1">
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete User Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete User</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this user? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    {userToDelete && (
                        <div className="space-y-4 mt-4">
                            <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm"><strong>Name:</strong> {userToDelete.full_name || "N/A"}</p>
                                <p className="text-sm"><strong>Email:</strong> {(userToDelete as any).email || "N/A"}</p>
                                <p className="text-sm"><strong>Phone:</strong> {userToDelete.phone || "N/A"}</p>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setDeleteDialogOpen(false);
                                        setUserToDelete(null);
                                    }}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleConfirmDelete}
                                    className="flex-1"
                                >
                                    Delete User
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserManagement;
