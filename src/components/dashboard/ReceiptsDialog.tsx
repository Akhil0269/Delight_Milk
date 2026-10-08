import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, ChevronRight, Download, FileText } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useReceipts, useReceiptItems } from "@/hooks/useReceipts";
import { useDeliveries } from "@/hooks/useDeliveries";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { downloadMonthlyReceipt, MonthlyReceiptData } from "@/lib/monthlyReceiptGenerator";
import { toast } from "sonner";

interface ReceiptsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ReceiptsDialog = ({ open, onOpenChange }: ReceiptsDialogProps) => {
    const { data: receipts, isLoading } = useReceipts();
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
    const { data: receiptItems, isLoading: itemsLoading } = useReceiptItems(selectedReceiptId || "");
    const { data: allDeliveries } = useDeliveries();
    const { user } = useAuth();

    const selectedReceipt = receipts?.find((r) => r.id === selectedReceiptId);

    const handleDownloadMonthlyReceipt = (receipt: { billing_month: string; total_amount?: number }) => {
        if (!allDeliveries || !user) return;

        // Filter deliveries for this month
        const monthStart = startOfMonth(new Date(receipt.billing_month));
        const monthEnd = endOfMonth(new Date(receipt.billing_month));

        const monthDeliveries = allDeliveries.filter((delivery) => {
            const deliveryDate = new Date(delivery.delivery_date);
            return deliveryDate >= monthStart && deliveryDate <= monthEnd;
        });

        // Calculate payment breakdown
        let onlinePayments = 0;
        let codPayments = 0;
        let walletPayments = 0;
        let paidAmount = 0;
        let pendingAmount = 0;

        const deliveryData = monthDeliveries.map((delivery) => {
            const d = delivery as typeof delivery & {
                total_amount?: number;
                price?: number;
                product_name?: string;
                payment_method?: string;
            };
            const unitPrice = Number(
                d.price_per_unit ||
                d.products?.price_per_unit ||
                (d.price && d.quantity ? d.price / d.quantity : 0) ||
                0
            );
            const quantity = Number(d.quantity || 1);
            const total = Number(
                d.total_amount ||
                d.price ||
                (unitPrice * quantity) ||
                0
            );
            const productName = d.products?.name || d.product_name || 'Milk';
            const paymentMethod = d.payment_method || 'prepaid';
            const status = d.status || 'scheduled';

            if (paymentMethod === 'phonepe' || paymentMethod === 'upi') {
                onlinePayments += total;
                paidAmount += total;
            } else if (paymentMethod === 'prepaid') {
                walletPayments += total;
                paidAmount += total;
            } else if (paymentMethod === 'cod') {
                codPayments += total;
                if (status === 'delivered') {
                    paidAmount += total;
                } else {
                    pendingAmount += total;
                }
            } else {
                walletPayments += total;
                paidAmount += total;
            }

            return {
                date: delivery.delivery_date,
                productName,
                quantity,
                pricePerUnit: unitPrice,
                total,
                paymentMethod: paymentMethod === 'phonepe' || paymentMethod === 'upi' ? 'PhonePe' :
                    paymentMethod === 'prepaid' ? 'Prepaid' : 'COD',
                status: status === 'delivered' ? 'Delivered' :
                    status === 'scheduled' ? 'Scheduled' : 'Pending',
            };
        });

        const totalAmount = Number(receipt.total_amount || paidAmount + pendingAmount || 0);

        const monthlyData: MonthlyReceiptData = {
            month: format(new Date(receipt.billing_month), "MMMM yyyy"),
            userName: user.user_metadata?.full_name || user.email || 'Customer',
            userEmail: user.email,
            deliveries: deliveryData,
            summary: {
                totalDeliveries: monthDeliveries.length,
                totalAmount,
                paidAmount,
                pendingAmount,
                onlinePayments,
                codPayments,
                walletPayments,
            },
        };

        downloadMonthlyReceipt(monthlyData);
        toast.success('Monthly receipt downloaded!');
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
            paid: { variant: "default", label: "Paid" },
            due: { variant: "destructive", label: "Due" },
            processing: { variant: "secondary", label: "Processing" },
        };
        const config = variants[status] || { variant: "outline", label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-primary" />
                        <DialogTitle>
                            {selectedReceiptId ? "Receipt Details" : "Monthly Receipts"}
                        </DialogTitle>
                    </div>
                    <DialogDescription>
                        {selectedReceiptId
                            ? "View detailed breakdown of your monthly bill"
                            : "View and manage your billing history"}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    <AnimatePresence mode="wait">
                        {!selectedReceiptId ? (
                            /* Receipts List */
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-3"
                            >
                                {isLoading ? (
                                    <>
                                        {[1, 2, 3].map((i) => (
                                            <Skeleton key={i} className="h-24 rounded-xl" />
                                        ))}
                                    </>
                                ) : receipts && receipts.length > 0 ? (
                                    receipts.map((receipt, index) => (
                                        <motion.button
                                            key={receipt.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => setSelectedReceiptId(receipt.id)}
                                            className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all text-left group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h4 className="font-semibold">
                                                            {format(new Date(receipt.billing_month), "MMMM yyyy")}
                                                        </h4>
                                                        {getStatusBadge(receipt.status)}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground">Delivered Days:</span>
                                                            <span className="ml-2 font-medium">{receipt.total_delivered_days}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground">Total Amount:</span>
                                                            <span className="ml-2 font-semibold text-primary">
                                                                ₹{receipt.total_amount.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {receipt.paid_at && (
                                                        <div className="text-xs text-muted-foreground mt-2">
                                                            Paid on {format(new Date(receipt.paid_at), "MMM dd, yyyy")}
                                                        </div>
                                                    )}
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                        </motion.button>
                                    ))
                                ) : (
                                    <div className="text-center py-12 bg-muted/30 rounded-xl">
                                        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-3" />
                                        <p className="text-muted-foreground">No receipts available yet</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Receipts are generated at the end of each month
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            /* Receipt Details */
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-4"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedReceiptId(null)}
                                    className="mb-2"
                                >
                                    ← Back to all receipts
                                </Button>

                                {selectedReceipt && (
                                    <>
                                        {/* Receipt Header */}
                                        <div className="bg-primary/10 rounded-xl p-6 border border-primary/20">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className="text-2xl font-bold">
                                                        {format(new Date(selectedReceipt.billing_month), "MMMM yyyy")}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        Receipt #{selectedReceipt.id.slice(0, 8).toUpperCase()}
                                                    </p>
                                                </div>
                                                {getStatusBadge(selectedReceipt.status)}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Delivered Days</p>
                                                    <p className="text-xl font-bold mt-1">{selectedReceipt.total_delivered_days}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Total Amount</p>
                                                    <p className="text-2xl font-bold text-primary mt-1">
                                                        ₹{selectedReceipt.total_amount.toFixed(2)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Receipt Items */}
                                        <div className="bg-card border border-border rounded-xl p-4">
                                            <h4 className="font-semibold mb-3">Items Breakdown</h4>
                                            {itemsLoading ? (
                                                <div className="space-y-2">
                                                    {[1, 2].map((i) => (
                                                        <Skeleton key={i} className="h-16 rounded-lg" />
                                                    ))}
                                                </div>
                                            ) : receiptItems && receiptItems.length > 0 ? (
                                                <div className="space-y-3">
                                                    {receiptItems.map((item) => (
                                                        <div key={item.id} className="bg-muted/30 rounded-lg p-3">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <div className="font-medium">{item.product_name}</div>
                                                                    <div className="text-sm text-muted-foreground">
                                                                        {item.total_quantity} {" units"} × ₹{item.price_per_unit}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-semibold text-primary">
                                                                        ₹{item.total_amount.toFixed(2)}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {item.delivered_days} days
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <Separator className="my-3" />

                                                    {/* Totals */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">Subtotal</span>
                                                            <span className="font-medium">
                                                                ₹{(selectedReceipt.total_amount - (selectedReceipt.gst_amount || 0)).toFixed(2)}
                                                            </span>
                                                        </div>
                                                        {selectedReceipt.gst_amount && selectedReceipt.gst_amount > 0 && (
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-muted-foreground">GST</span>
                                                                <span className="font-medium">₹{selectedReceipt.gst_amount.toFixed(2)}</span>
                                                            </div>
                                                        )}
                                                        <Separator />
                                                        <div className="flex justify-between text-lg font-bold">
                                                            <span>Total</span>
                                                            <span className="text-primary">₹{selectedReceipt.total_amount.toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-center text-muted-foreground py-4">No items found</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3">
                                            <Button
                                                variant="outline"
                                                className="flex-1"
                                                onClick={() => handleDownloadMonthlyReceipt(selectedReceipt)}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Download Receipt
                                            </Button>
                                            {selectedReceipt.status === "due" && (
                                                <Button className="flex-1">Pay Now</Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ReceiptsDialog;
