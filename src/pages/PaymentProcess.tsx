import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Smartphone, RefreshCcw, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { phonePeService } from "@/lib/phonePeService";

const PaymentProcess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const transactionId = searchParams.get("txnId");
    const amount = parseFloat(searchParams.get("amount") || "0");
    const purpose = searchParams.get("purpose") || "cart_checkout";

    const [isChecking, setIsChecking] = useState(true);
    const [statusMessage, setStatusMessage] = useState("Connecting to PhonePe gateway...");
    const [isNotConfigured, setIsNotConfigured] = useState(false);

    const checkStatus = useCallback(async () => {
        if (!transactionId) {
            navigate("/dashboard");
            return;
        }

        setIsChecking(true);
        setStatusMessage("Verifying payment status with PhonePe...");

        try {
            const res = await phonePeService.checkPaymentStatus(transactionId);

            if (res.status === "paid") {
                navigate(`/payment/success?txnId=${transactionId}&amount=${amount}&purpose=${purpose}`);
                return;
            }

            if (res.status === "failed") {
                navigate(`/payment/failure?txnId=${transactionId}`);
                return;
            }

            if (res.notConfigured) {
                setIsNotConfigured(true);
                setStatusMessage("PhonePe merchant credentials are not configured on the server.");
            } else {
                setStatusMessage("Payment is pending confirmation from PhonePe. If you completed payment, please wait a moment.");
            }
        } catch {
            setStatusMessage("Unable to connect to payment server. Please verify your connection.");
        } finally {
            setIsChecking(false);
        }
    }, [transactionId, amount, purpose, navigate]);

    useEffect(() => {
        if (!transactionId) {
            navigate("/dashboard");
            return;
        }

        checkStatus();

        // Poll status every 4 seconds while active
        const interval = setInterval(() => {
            if (!isNotConfigured) {
                checkStatus();
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [transactionId, checkStatus, isNotConfigured, navigate]);

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8 text-center space-y-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Smartphone className="w-8 h-8 text-primary" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">PhonePe Payment</h1>
                    <p className="text-xs text-muted-foreground">
                        Transaction Ref: <span className="font-mono">{transactionId || "N/A"}</span>
                    </p>
                </div>

                {amount > 0 && (
                    <div className="bg-accent/10 rounded-xl p-4">
                        <p className="text-xs text-muted-foreground">Amount</p>
                        <p className="text-3xl font-bold text-primary">₹{amount.toFixed(2)}</p>
                    </div>
                )}

                {isNotConfigured ? (
                    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2 text-left">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">Merchant Credentials Not Configured</p>
                                <p className="mt-0.5 text-muted-foreground">
                                    PhonePe online payment is currently awaiting server merchant credentials. Please choose <strong>Cash on Delivery</strong> or <strong>Wallet</strong> to place your order.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/40 space-y-3">
                        <Loader2 className={`w-6 h-6 text-primary ${isChecking ? "animate-spin" : ""}`} />
                        <p className="text-xs text-muted-foreground">{statusMessage}</p>
                    </div>
                )}

                <div className="space-y-2">
                    {!isNotConfigured && (
                        <Button
                            onClick={checkStatus}
                            className="w-full"
                            variant="default"
                            disabled={isChecking}
                        >
                            <RefreshCcw className={`w-4 h-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
                            Refresh Status
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => navigate("/dashboard")}
                        className="w-full"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default PaymentProcess;
