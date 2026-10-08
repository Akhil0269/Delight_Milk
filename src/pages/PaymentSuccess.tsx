import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight, Download, AlertTriangle, RefreshCcw, Package, Loader2 } from "lucide-react";
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
    const deliveryId = searchParams.get("deliveryId") || undefined;

    const [paymentState, setPaymentState] = useState<"processing" | "success" | "error">("processing");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const executionRef = useRef<string | null>(null);

    const executePaymentCompletion = useCallback(async () => {
        if (!transactionId) {
            setPaymentState("error");
            setErrorMessage("Missing transaction ID. Cannot verify payment.");
            return;
        }

        if (isNaN(amount) || amount <= 0) {
            setPaymentState("error");
            setErrorMessage("Invalid payment amount. Cannot complete payment.");
            return;
        }

        setPaymentState("processing");
        setErrorMessage(null);

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

            setPaymentState("success");
            toast.success("Payment completed successfully!");
        } catch (error: unknown) {
            console.error("Payment completion error:", error);
            const msg = error instanceof Error ? error.message : "Failed to complete payment. Please contact support.";
            setErrorMessage(msg);
            setPaymentState("error");
            toast.error(msg);
        }
    }, [transactionId, amount, purpose, deliveryId, completePayment, clearCart]);

    useEffect(() => {
        // Prevent duplicate execution on fast re-renders or StrictMode double-mount
        if (executionRef.current === transactionId) {
            return;
        }
        if (transactionId) {
            executionRef.current = transactionId;
            executePaymentCompletion();
        } else {
            setPaymentState("error");
            setErrorMessage("No transaction ID found in query parameters.");
        }
    }, [transactionId, executePaymentCompletion]);

    const handleContinue = () => {
        navigate("/dashboard");
    };

    const handleRetry = () => {
        executePaymentCompletion();
    };

    const handleDownloadReceipt = () => {
        if (!transactionId) return;

        const receiptData: ReceiptData = {
            transactionId,
            amount,
            paymentMethod: "PhonePe",
            purpose: purpose.replace(/_/g, " "),
            date: new Date().toISOString(),
            userName: user?.user_metadata?.full_name || user?.email || "Customer",
            userEmail: user?.email,
        };

        downloadReceipt(receiptData);
        toast.success("Receipt downloaded successfully!");
    };

    const isWallet = purpose === 'wallet_recharge' || purpose === 'wallet_topup';
    const isCart = purpose === 'cart_checkout' || purpose === 'cart_checkout_now';

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8">
                {paymentState === "processing" ? (
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center py-6"
                    >
                        <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-600">
                            <Loader2 className="w-10 h-10 animate-spin" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Verifying Payment...</h1>
                        <p className="text-sm text-muted-foreground mb-6">
                            Authoritatively confirming your transaction with the payment server. Please do not close or refresh this page.
                        </p>
                        <div className="bg-muted/50 rounded-xl p-4 text-xs space-y-2 text-left">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Transaction ID:</span>
                                <span className="font-mono">{transactionId?.slice(0, 16) || "N/A"}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-semibold">₹{amount.toFixed(2)}</span>
                            </div>
                        </div>
                    </motion.div>
                ) : paymentState === "error" ? (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="text-center"
                    >
                        {/* Error Icon */}
                        <div className="w-24 h-24 bg-destructive/15 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-14 h-14 text-destructive" />
                        </div>

                        {/* Title */}
                        <h1 className="text-2xl font-bold mb-2 text-destructive">Payment Issue</h1>
                        <p className="text-muted-foreground mb-6">
                            {errorMessage || "We encountered an issue finalizing your payment."}
                        </p>

                        {/* Details */}
                        <div className="bg-muted/50 rounded-xl p-4 mb-6 space-y-2 text-sm text-left">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Transaction ID:</span>
                                <span className="font-mono">{transactionId?.slice(0, 16) || "N/A"}...</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Amount:</span>
                                <span className="font-semibold">₹{amount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Purpose:</span>
                                <span className="capitalize">{purpose.replace(/_/g, " ")}</span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <Button
                                onClick={handleRetry}
                                className="w-full"
                                size="lg"
                            >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                Retry Verification
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleContinue}
                                className="w-full"
                                size="lg"
                            >
                                Continue to Dashboard
                            </Button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
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
                            Your payment has been verified by the server
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
                                <span className="capitalize">{purpose.replace(/_/g, " ")}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Payment Method</span>
                                <span className="font-semibold text-purple-600">PhonePe</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Status</span>
                                <span className="text-accent font-semibold">Completed</span>
                            </div>
                        </div>

                        {/* Success Message */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-accent/10 rounded-lg p-4 mb-6"
                        >
                            <p className="text-sm font-medium text-accent">
                                {isWallet
                                    ? `₹${amount.toFixed(2)} has been credited to your wallet.`
                                    : isCart
                                        ? `Your order for ₹${amount.toFixed(2)} is confirmed and scheduled for ${purpose === 'cart_checkout_now' ? 'today' : 'tomorrow'}!`
                                        : `Your payment of ₹${amount.toFixed(2)} has been confirmed.`
                                }
                            </p>
                        </motion.div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {isCart && (
                                <Button
                                    onClick={() => navigate("/orders")}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                    size="lg"
                                >
                                    <Package className="w-4 h-4 mr-2" />
                                    View Order History
                                </Button>
                            )}
                            <Button
                                onClick={handleContinue}
                                variant={isCart ? "outline" : "default"}
                                className="w-full"
                                size="lg"
                            >
                                Continue to Dashboard
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                size="lg"
                                onClick={handleDownloadReceipt}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Receipt
                            </Button>
                        </div>
                    </motion.div>
                )}
            </Card>
        </div>
    );
};

export default PaymentSuccess;

