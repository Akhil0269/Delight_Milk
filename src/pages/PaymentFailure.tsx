import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, ArrowLeft, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PaymentFailure = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const transactionId = searchParams.get("txnId");

    useEffect(() => {
        if (!transactionId) {
            navigate("/dashboard");
        }
    }, [transactionId, navigate]);

    const handleRetry = () => {
        // Go back to add milk dialog or previous page
        navigate("/dashboard");
    };

    const handleBackToDashboard = () => {
        navigate("/dashboard");
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
                    {/* Failure Icon */}
                    <div className="w-24 h-24 bg-destructive/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-16 h-16 text-destructive" />
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold mb-2">Payment Failed</h1>
                    <p className="text-muted-foreground mb-8">
                        We couldn't process your payment. Please try again.
                    </p>

                    {/* Error Details */}
                    <div className="bg-muted/50 rounded-xl p-6 mb-6 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Transaction ID</span>
                            <span className="font-mono">{transactionId?.slice(0, 16)}...</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <span className="text-destructive font-semibold">Failed</span>
                        </div>
                    </div>

                    {/* Possible Reasons */}
                    <div className="bg-warning/10 rounded-lg p-4 mb-6 text-left">
                        <h3 className="font-semibold mb-2 text-sm">Possible Reasons:</h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Insufficient balance in your account</li>
                            <li>• Payment was cancelled</li>
                            <li>• Network connectivity issues</li>
                            <li>• Bank server timeout</li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                        <Button
                            onClick={handleRetry}
                            className="w-full"
                            size="lg"
                        >
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Try Again
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleBackToDashboard}
                            className="w-full"
                            size="lg"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </div>

                    {/* Help Text */}
                    <p className="text-xs text-muted-foreground mt-6">
                        If the problem persists, please contact support or try a different payment method
                    </p>
                </motion.div>
            </Card>
        </div>
    );
};

export default PaymentFailure;
