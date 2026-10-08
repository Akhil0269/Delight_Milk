import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useInitiatePhonePePayment } from "@/hooks/usePhonePePayment";
import { toast } from "sonner";
import { Smartphone, Loader2 } from "lucide-react";

interface AddMoneyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const AddMoneyDialog = ({ open, onOpenChange }: AddMoneyDialogProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const initiatePayment = useInitiatePhonePePayment();
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const quickAmounts = [100, 500, 1000, 2000, 5000];

    const handleAddMoney = async () => {
        const amountNum = parseFloat(amount);

        if (!amountNum || amountNum < 10) {
            toast.error("Please enter amount of at least ₹10");
            return;
        }

        if (amountNum > 100000) {
            toast.error("Maximum amount is ₹1,00,000");
            return;
        }

        if (!user?.id) {
            toast.error("User not logged in");
            return;
        }

        setLoading(true);

        try {
            const response = await initiatePayment.mutateAsync({
                amount: amountNum,
                purpose: "wallet_topup",
                userPhone: user.phone || undefined,
            });

            if (response.success && response.paymentUrl) {
                setAmount("");
                onOpenChange(false);
                navigate(response.paymentUrl);
            } else {
                throw new Error(response.message || "Failed to initiate payment");
            }
        } catch (error: unknown) {
            console.error("Add money error:", error);
            const msg = error instanceof Error ? error.message : "Failed to initiate payment. Please try again.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Money to Wallet</DialogTitle>
                    <DialogDescription>
                        Choose amount and payment method
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Quick Amount Selection */}
                    <div className="space-y-3">
                        <Label>Quick Select (₹)</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {quickAmounts.map((quickAmount) => (
                                <Button
                                    key={quickAmount}
                                    variant={amount === quickAmount.toString() ? "default" : "outline"}
                                    onClick={() => setAmount(quickAmount.toString())}
                                    className="w-full"
                                >
                                    ₹{quickAmount}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Amount Input */}
                    <div className="space-y-2">
                        <Label htmlFor="amount">Enter Amount</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                ₹
                            </span>
                            <Input
                                id="amount"
                                type="number"
                                placeholder="Enter amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-8"
                                min="10"
                                max="100000"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Min: ₹10 | Max: ₹1,00,000
                        </p>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                        <Label>Payment Method</Label>
                        <div className="border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 rounded-xl p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-600/10 flex items-center justify-center text-purple-600">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-semibold text-sm">PhonePe Gateway</div>
                                    <div className="text-xs text-muted-foreground">UPI, Cards & Net Banking via PhonePe</div>
                                </div>
                            </div>
                            <span className="text-xs text-purple-700 dark:text-purple-300 font-medium bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                Official Gateway
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddMoney}
                            className="flex-1"
                            disabled={loading || !amount || parseFloat(amount) < 10}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                `Add ₹${amount || 0}`
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddMoneyDialog;
