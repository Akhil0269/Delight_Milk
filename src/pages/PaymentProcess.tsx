import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Smartphone, CheckCircle2, AlertCircle, ExternalLink, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { phonePeService } from "@/lib/phonePeService";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const PaymentProcess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const transactionId = searchParams.get("txnId");
    const amount = parseFloat(searchParams.get("amount") || "0");
    const purpose = searchParams.get("purpose") || "delivery";
    const deliveryId = searchParams.get("deliveryId") || undefined;

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [paymentInitiated, setPaymentInitiated] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Vendor UPI ID - REAL PAYMENT DESTINATION
    const vendorUpiId = "9963450427@axl";
    const vendorName = "Delight Milk";

    useEffect(() => {
        if (!transactionId) {
            navigate("/dashboard");
        }

        // Detect if user is on mobile
        const checkMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        setIsMobile(checkMobile);
    }, [transactionId, navigate]);

    // Generate UPI Deep Link for REAL payment
    const generateUpiLink = () => {
        const upiParams = new URLSearchParams({
            pa: vendorUpiId,           // Payee Address (UPI ID)
            pn: vendorName,            // Payee Name
            am: amount.toFixed(2),     // Amount
            cu: "INR",                 // Currency
            tn: `Order ${transactionId}`, // Transaction Note
        });

        return `upi://pay?${upiParams.toString()}`;
    };

    const handlePayNow = () => {
        const upiLink = generateUpiLink();

        // Mark payment as initiated
        setPaymentInitiated(true);

        // Open UPI app - THIS TRIGGERS NOTIFICATION ON MOBILE
        window.location.href = upiLink;

        // Show confirmation dialog after user returns
        setTimeout(() => {
            setShowConfirmDialog(true);
        }, isMobile ? 2000 : 1000);
    };

    const copyUpiId = () => {
        navigator.clipboard.writeText(vendorUpiId);
        toast.success("UPI ID copied!");
    };

    const handlePaymentSuccess = async () => {
        phonePeService.simulatePaymentCompletion(
            transactionId!,
            amount,
            true,
            "UPI"
        );

        navigate(`/payment/success?txnId=${transactionId}&amount=${amount}&purpose=${purpose}&deliveryId=${deliveryId || ''}`);
    };

    const handlePaymentFailed = () => {
        phonePeService.simulatePaymentCompletion(
            transactionId!,
            amount,
            false,
            "UPI"
        );

        navigate(`/payment/failure?txnId=${transactionId}`);
    };

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Smartphone className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">UPI Payment</h1>
                    <p className="text-muted-foreground">
                        {isMobile ? "Pay via UPI notification" : "Pay via UPI"}
                    </p>
                </div>

                {/* Amount */}
                <div className="bg-accent/10 rounded-xl p-6 mb-8 text-center">
                    <p className="text-sm text-muted-foreground mb-2">Amount to Pay</p>
                    <p className="text-4xl font-bold text-primary">₹{amount.toFixed(2)}</p>
                </div>

                {/* Payment Details */}
                <div className="bg-muted/50 rounded-xl p-6 mb-8 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment Method</span>
                        <span className="font-semibold">UPI</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground">Vendor UPI ID</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{vendorUpiId}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={copyUpiId}
                            >
                                <Copy className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vendor Name</span>
                        <span className="font-semibold">{vendorName}</span>
                    </div>
                </div>

                {/* Payment Instructions */}
                {!paymentInitiated ? (
                    <div className="mb-6">
                        <div className="bg-blue-500/10 rounded-lg p-4 mb-4 border border-blue-500/20">
                            <div className="flex gap-2 mb-2">
                                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold mb-1">
                                        {isMobile ? "📱 Mobile Payment:" : "💻 Desktop Payment:"}
                                    </p>
                                    {isMobile ? (
                                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                            <li>Click "Pay Now" button below</li>
                                            <li><strong>UPI notification will appear on your phone</strong></li>
                                            <li>Open the notification</li>
                                            <li>Enter your UPI PIN to complete payment</li>
                                            <li>Return here and confirm</li>
                                        </ol>
                                    ) : (
                                        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                                            <li>Click "Pay Now" (if UPI app installed)</li>
                                            <li>OR manually pay using UPI ID above</li>
                                            <li>Open any UPI app on your phone</li>
                                            <li>Send ₹{amount.toFixed(2)} to {vendorUpiId}</li>
                                            <li>Return here and confirm</li>
                                        </ol>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handlePayNow}
                            className="w-full"
                            size="lg"
                        >
                            {isMobile ? (
                                <>
                                    <Smartphone className="w-4 h-4 mr-2" />
                                    Pay ₹{amount.toFixed(2)} Now
                                </>
                            ) : (
                                <>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open UPI App / Pay Now
                                </>
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="mb-6">
                        <div className="bg-accent/10 rounded-lg p-4 mb-4 border border-accent/20 text-center">
                            <CheckCircle2 className="w-12 h-12 text-accent mx-auto mb-2" />
                            <p className="text-sm font-semibold mb-1">
                                {isMobile ? "📱 Check Your Phone!" : "UPI App Opened"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {isMobile
                                    ? "A payment notification should appear on your phone. Open it and enter your UPI PIN."
                                    : "Complete the payment in your UPI app and return here"
                                }
                            </p>
                        </div>

                        <Button
                            onClick={() => setShowConfirmDialog(true)}
                            className="w-full"
                            size="lg"
                            variant="outline"
                        >
                            I've Completed Payment
                        </Button>
                    </div>
                )}

                {/* Cancel Button */}
                <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="w-full"
                >
                    Cancel
                </Button>

                {/* Real Payment Notice */}
                <div className="mt-6 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                    <p className="text-sm text-center font-semibold text-red-600 mb-1">
                        ⚠️ REAL PAYMENT
                    </p>
                    <p className="text-xs text-center text-muted-foreground">
                        This will deduct actual money from your bank account and transfer to {vendorUpiId}
                    </p>
                </div>
            </Card>

            {/* Payment Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Payment Status</DialogTitle>
                        <DialogDescription>
                            Did you complete the payment in your UPI app?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div className="bg-muted/50 rounded-lg p-4">
                            <p className="text-sm mb-2">Payment Details:</p>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Amount:</span>
                                    <span className="font-semibold">₹{amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">To:</span>
                                    <span className="font-mono">{vendorUpiId}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={handlePaymentFailed}
                                variant="outline"
                                className="flex-1"
                            >
                                Payment Failed
                            </Button>
                            <Button
                                onClick={handlePaymentSuccess}
                                className="flex-1"
                            >
                                Payment Successful
                            </Button>
                        </div>

                        <p className="text-xs text-center text-muted-foreground">
                            Please verify the payment in your UPI app before confirming
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PaymentProcess;
