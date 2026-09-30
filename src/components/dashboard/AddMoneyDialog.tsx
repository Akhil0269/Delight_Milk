import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { addMoneyToWallet } from "@/hooks/useWallet";
import { toast } from "sonner";
import { Wallet, CreditCard, Smartphone, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface AddMoneyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const AddMoneyDialog = ({ open, onOpenChange }: AddMoneyDialogProps) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<"phonepe" | "card" | "upi">("phonepe");

    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

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
            if (isDevMode) {
                // Development mode: Simulate payment
                console.log(`💰 Adding ₹${amountNum} to wallet (Dev Mode)`);

                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Add money to wallet
                addMoneyToWallet(user.id, amountNum, `Wallet recharge via ${selectedMethod.toUpperCase()}`);

                // Invalidate queries to refresh UI
                queryClient.invalidateQueries({ queryKey: ["wallet"] });
                queryClient.invalidateQueries({ queryKey: ["wallet_transactions"] });

                toast.success(`₹${amountNum} added successfully!`, {
                    description: `Payment via ${selectedMethod.toUpperCase()} (Development Mode)`
                });

                setAmount("");
                onOpenChange(false);
            } else {
                // Production mode: Real PhonePe integration
                toast.info("Redirecting to payment gateway...");

                // TODO: Implement real PhonePe payment
                // const response = await fetch('/api/phonepe-payment', {
                //   method: 'POST',
                //   body: JSON.stringify({ amount: amountNum, method: selectedMethod })
                // });

                toast.error("Payment integration not configured. Use development mode.");
            }
        } catch (error) {
            console.error("Add money error:", error);
            toast.error("Failed to add money. Please try again.");
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
                        {isDevMode && " (Development Mode - Instant Credit)"}
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
                        <div className="grid grid-cols- gap-3">
                            <Button
                                variant={selectedMethod === "phonepe" ? "default" : "outline"}
                                onClick={() => setSelectedMethod("phonepe")}
                                className="flex items-center gap-2 justify-start h-auto py-3"
                            >
                                <Smartphone className="w-5 h-5" />
                                <div className="text-left">
                                    <div className="font-semibold">PhonePe</div>
                                    <div className="text-xs opacity-80">UPI, Cards, Net Banking</div>
                                </div>
                            </Button>

                            <Button
                                variant={selectedMethod === "card" ? "default" : "outline"}
                                onClick={() => setSelectedMethod("card")}
                                className="flex items-center gap-2 justify-start h-auto py-3"
                            >
                                <CreditCard className="w-5 h-5" />
                                <div className="text-left">
                                    <div className="font-semibold">Credit/Debit Card</div>
                                    <div className="text-xs opacity-80">All major cards accepted</div>
                                </div>
                            </Button>

                            <Button
                                variant={selectedMethod === "upi" ? "default" : "outline"}
                                onClick={() => setSelectedMethod("upi")}
                                className="flex items-center gap-2 justify-start h-auto py-3"
                            >
                                <Wallet className="w-5 h-5" />
                                <div className="text-left">
                                    <div className="font-semibold">UPI</div>
                                    <div className="text-xs opacity-80">Google Pay, Paytm, etc.</div>
                                </div>
                            </Button>
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

                    {isDevMode && (
                        <div className="text-xs text-center text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            💡 <strong>Development Mode:</strong> Money will be added instantly to your wallet
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddMoneyDialog;
