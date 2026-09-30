// Wallet Management Page - Admin can manage customer wallets
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminUsers, useAdminWalletOperation } from "@/hooks/useAdmin";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, Plus, Minus, Search } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const WalletManagement = () => {
    const { data: users, isLoading } = useAdminUsers();
    const walletOperation = useAdminWalletOperation();

    const [searchTerm, setSearchTerm] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [operationType, setOperationType] = useState<"credit" | "debit">("credit");
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [operationForm, setOperationForm] = useState({
        amount: "",
        description: "",
    });

    const filteredUsers = users?.filter((user) =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleOpenDialog = (user: any, type: "credit" | "debit") => {
        setSelectedUser(user);
        setOperationType(type);
        setOperationForm({ amount: "", description: "" });
        setDialogOpen(true);
    };

    const handleSaveOperation = () => {
        if (selectedUser && operationForm.amount) {
            walletOperation.mutate({
                userId: selectedUser.id,
                amount: parseFloat(operationForm.amount),
                type: operationType,
                source: operationType === "credit" ? "admin_topup" : "admin_deduction",
                description: operationForm.description,
            });
            setDialogOpen(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Wallet Management</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage customer wallet balances
                    </p>
                </div>
            </div>

            {/* Search */}
            <Card className="p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </Card>

            {/* Users Wallet Table */}
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="text-left p-4 font-semibold">Name</th>
                                <th className="text-left p-4 font-semibold">Email</th>
                                <th className="text-left p-4 font-semibold">Wallet Balance</th>
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
                                        <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                                    </tr>
                                ))
                            ) : filteredUsers && filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-t hover:bg-muted/30">
                                        <td className="p-4">{user.full_name || "N/A"}</td>
                                        <td className="p-4">{user.email}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Wallet className="w-4 h-4 text-primary" />
                                                <span className="font-semibold">₹{user.wallet_balance || 0}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => handleOpenDialog(user, "credit")}
                                                >
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Top Up
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleOpenDialog(user, "debit")}
                                                >
                                                    <Minus className="w-4 h-4 mr-1" />
                                                    Deduct
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                        No users found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Wallet Operation Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {operationType === "credit" ? "Top Up Wallet" : "Deduct from Wallet"}
                        </DialogTitle>
                        <DialogDescription>
                            {operationType === "credit"
                                ? "Add funds to customer wallet"
                                : "Deduct funds from customer wallet"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label>Customer</Label>
                            <Input value={selectedUser?.full_name || selectedUser?.email} disabled />
                        </div>
                        <div>
                            <Label>Amount (₹)</Label>
                            <Input
                                type="number"
                                value={operationForm.amount}
                                onChange={(e) => setOperationForm({ ...operationForm, amount: e.target.value })}
                                placeholder="100"
                            />
                        </div>
                        <div>
                            <Label>Description (Optional)</Label>
                            <Textarea
                                value={operationForm.description}
                                onChange={(e) => setOperationForm({ ...operationForm, description: e.target.value })}
                                placeholder="Reason for this operation..."
                                rows={3}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveOperation}
                                className="flex-1"
                                variant={operationType === "credit" ? "default" : "destructive"}
                            >
                                {operationType === "credit" ? "Add Funds" : "Deduct Funds"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WalletManagement;
