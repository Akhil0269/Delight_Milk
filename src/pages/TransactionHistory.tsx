import { motion } from "framer-motion";
import { ArrowLeft, Download, Calendar, CreditCard, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useWalletTransactions, WalletTransaction } from "@/hooks/useWallet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { downloadReceipt, ReceiptData } from "@/lib/receiptGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const TransactionHistory = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: transactions, isLoading } = useWalletTransactions(100); // Get last 100 transactions

    const handleDownloadReceipt = (transaction: WalletTransaction) => {
        const receiptData: ReceiptData = {
            transactionId: transaction.reference_id || transaction.id,
            amount: Math.abs(transaction.amount),
            paymentMethod: transaction.type === "credit" ? "PhonePe" : "Wallet",
            purpose: transaction.description || "Transaction",
            date: transaction.created_at,
            userName: user?.user_metadata?.full_name || user?.email || "Customer",
            userEmail: user?.email,
        };

        downloadReceipt(receiptData);
        toast.success("Receipt downloaded!");
    };

    const getStatusIcon = (type: string) => {
        if (type === "credit") return <CheckCircle2 className="w-5 h-5 text-accent" />;
        return <XCircle className="w-5 h-5 text-primary" />;
    };

    const getStatusBadge = (type: string) => {
        if (type === "credit") {
            return <Badge className="bg-accent/20 text-accent">Credit</Badge>;
        }
        return <Badge className="bg-primary/20 text-primary">Debit</Badge>;
    };

    return (
        <div className="min-h-screen bg-muted/30 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate("/dashboard")}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold">Transaction History</h1>
                        <p className="text-muted-foreground">View all your payment transactions</p>
                    </div>
                </div>

                {/* Transactions List */}
                <Card className="p-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-24 w-full" />
                            ))}
                        </div>
                    ) : transactions && transactions.length > 0 ? (
                        <div className="space-y-4">
                            {transactions.map((transaction, index) => (
                                <motion.div
                                    key={transaction.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Icon */}
                                        <div className={`w-12 h-12 rounded-full ${transaction.type === "credit" ? "bg-accent/20" : "bg-primary/20"
                                            } flex items-center justify-center`}>
                                            {getStatusIcon(transaction.type)}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold">
                                                    {transaction.description || "Transaction"}
                                                </h3>
                                                {getStatusBadge(transaction.type)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(transaction.created_at), "MMM dd, yyyy")}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(transaction.created_at), "hh:mm a")}
                                                </div>
                                                {transaction.reference_id && (
                                                    <div className="flex items-center gap-1">
                                                        <CreditCard className="w-3 h-3" />
                                                        <span className="font-mono text-xs">
                                                            {transaction.reference_id.slice(0, 12)}...
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Amount */}
                                        <div className="text-right">
                                            <div className={`text-xl font-bold ${transaction.type === "credit" ? "text-accent" : "text-primary"
                                                }`}>
                                                {transaction.type === "credit" ? "+" : "-"}₹{Math.abs(transaction.amount).toFixed(2)}
                                            </div>
                                        </div>

                                        {/* Download Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDownloadReceipt(transaction)}
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <CreditCard className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                            <p className="text-muted-foreground">
                                Your transaction history will appear here
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default TransactionHistory;
