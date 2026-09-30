import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompletePhonePePayment } from "@/hooks/usePhonePePayment";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { downloadReceipt, ReceiptData } from "@/lib/receiptGenerator";
import { useCart } from "@/contexts/CartContext";

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const completePayment = useCompletePhonePePayment();
    const { user } = useAuth();
    const { clearCart } = useCart();

    const transactionId = searchParams.get("txnId");
    const amount = parseFloat(searchParams.get("amount") || "0");
    const purpose = searchParams.get("purpose") || "delivery";
    const deliveryId = searchParams.get("deliveryId");

    const [processing, setProcessing] = useState(true);

    useEffect(() => {
        if (!transactionId) {
            navigate("/dashboard");
            return;
        }

        // Complete the payment and update wallet
        const processPayment = async () => {
            try {
                await completePayment.mutateAsync({
                    transactionId,
                    amount,
                    purpose,
                    deliveryId,
                });

                if (purpose === 'cart_checkout' || purpose === 'cart_checkout_now') {
                    clearCart();
                }

                setProcessing(false);
                toast.success("Payment completed successfully!");
            } catch (error: any) {
                console.error("Payment completion error:", error);
                toast.error(error.message || "Failed to complete payment");
                setProcessing(false);
            }
        };

        processPayment();
    }, [transactionId]);

    const handleContinue = () => {
        navigate("/dashboard");
    };

    const handleDownloadReceipt = () => {
        if (!transactionId) return;

        const receiptData: ReceiptData = {
            transactionId,
            amount,
            paymentMethod: "UPI",
            purpose,
            date: new Date().toISOString(),
            userName: user?.user_metadata?.full_name || user?.email || "Customer",
            userEmail: user?.email,
            vendorUpiId: "9963450427@axl",
        };

        downloadReceipt(receiptData);
        toast.success("Receipt downloaded successfully!");
    };

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">

            <Card className="w-full max-w-md p-8">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="text-center"
                >
                    {/* Success Icon */}
                    <div className="w-24 h-24 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-16 h-16 text-accent" />
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
                    <p className="text-muted-foreground mb-8">
                        Your payment has been processed successfully
                    </p>

                    {/* Transaction Details */}
                    <div className="bg-muted/50 rounded-xl p-6 mb-6 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount Paid</span>
                            <span className="font-bold text-accent text-xl">₹{amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Transaction ID</span>
                            <span className="font-mono">{transactionId?.slice(0, 16)}...</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Purpose</span>
                            <span className="capitalize">{purpose.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <span className="text-accent font-semibold">
                                {processing ? "Processing..." : "Completed"}
                            </span>
                        </div>
                    </div>

                    {/* Success Message */}
                    {!processing && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-accent/10 rounded-lg p-4 mb-6"
                        >
                            <p className="text-sm">
                                {purpose === 'wallet_recharge'
                                    ? `₹${amount.toFixed(2)} has been added to your wallet`
                                    : `Your delivery has been scheduled and payment of ₹${amount.toFixed(2)} is confirmed`
                                }
                            </p>
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <Button
                            onClick={handleContinue}
                            className="w-full"
                            size="lg"
                            disabled={processing}
                        >
                            Continue to Dashboard
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            size="lg"
                            onClick={handleDownloadReceipt}
                            disabled={processing}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Receipt
                        </Button>
                    </div>
                </motion.div>
            </Card>
        </div>
    );
};

export default PaymentSuccess;
