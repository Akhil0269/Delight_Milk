import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Minus, Wallet, Banknote, CreditCard } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/useProducts";
import { useCreateOrder } from "@/hooks/useOrders";
import { useCreateSubscription } from "@/hooks/useSubscriptions";
import { useWallet } from "@/hooks/useWallet";
import { useInitiatePhonePePayment } from "@/hooks/usePhonePePayment";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface AddMilkDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const AddMilkDialog = ({ open, onOpenChange }: AddMilkDialogProps) => {
    const { data: products, isLoading } = useProducts();
    const createOrder = useCreateOrder();
    const createSubscription = useCreateSubscription();
    const { data: wallet } = useWallet();
    const initiatePhonePePayment = useInitiatePhonePePayment();

    const [selectedProduct, setSelectedProduct] = useState<string>("");
    const [quantity, setQuantity] = useState(1);
    const [orderType, setOrderType] = useState<"once" | "daily">("once");
    const [deliveryDate, setDeliveryDate] = useState(
        format(addDays(new Date(), 1), "yyyy-MM-dd")
    );
    const [paymentMethod, setPaymentMethod] = useState<"prepaid" | "cod" | "phonepe">("cod");

    const handleSubmit = async () => {
        if (!selectedProduct) {
            toast.error("Please select a product");
            return;
        }

        const selectedProductData = products?.find((p) => p.id === selectedProduct);
        if (!selectedProductData) return;

        const totalAmount = quantity * selectedProductData.price_per_unit;

        // Check wallet balance for prepaid
        if (paymentMethod === "prepaid") {
            const walletBalance = wallet?.balance || 0;
            if (walletBalance < totalAmount) {
                toast.error(`Insufficient wallet balance. Required: ₹${totalAmount.toFixed(2)}, Available: ₹${walletBalance.toFixed(2)}`);
                return;
            }
        }

        try {
            // Handle PhonePe payment
            if (paymentMethod === "phonepe") {
                const response = await initiatePhonePePayment.mutateAsync({
                    amount: totalAmount,
                    purpose: "delivery",
                    userPhone: "9999999999", // You can add phone field to form
                });

                if (response.success) {
                    // Redirect to PhonePe payment page
                    window.location.href = response.paymentUrl;
                }
                return;
            }

            if (orderType === "daily") {
                // Create subscription
                await createSubscription.mutateAsync({
                    productId: selectedProduct,
                    quantity,
                });
                toast.success(`Daily subscription created! Payment: ${paymentMethod === "prepaid" ? "Prepaid" : "Cash on Delivery"}`);
            } else {
                // Create one-time order (inserts into public.orders via useCreateOrder)
                await createOrder.mutateAsync({
                    productId: selectedProduct,
                    quantity,
                    deliveryDate,
                    paymentMethod,
                });

                if (paymentMethod === "prepaid") {
                    toast.success(`Order placed & ₹${totalAmount.toFixed(2)} deducted from wallet`);
                } else {
                    toast.success(`Order placed for ${format(new Date(deliveryDate), "MMM dd, yyyy")} (Cash on Delivery)`);
                }
            }
            onOpenChange(false);
            resetForm();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add milk";
            toast.error(message);
        }
    };

    const resetForm = () => {
        setSelectedProduct("");
        setQuantity(1);
        setOrderType("once");
        setDeliveryDate(format(addDays(new Date(), 1), "yyyy-MM-dd"));
        setPaymentMethod("cod");
    };

    const selectedProductData = products?.find((p) => p.id === selectedProduct);
    const totalAmount = selectedProduct && selectedProductData ? quantity * selectedProductData.price_per_unit : 0;
    const walletBalance = wallet?.balance || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Milk Delivery</DialogTitle>
                    <DialogDescription>
                        Choose a product and delivery preference
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Order Type Selection */}
                    <div className="space-y-3">
                        <Label>Order Type</Label>
                        <RadioGroup value={orderType} onValueChange={(v) => setOrderType(v as "once" | "daily")}>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="once" id="once" />
                                <Label htmlFor="once" className="font-normal cursor-pointer">
                                    One-time delivery
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="daily" id="daily" />
                                <Label htmlFor="daily" className="font-normal cursor-pointer">
                                    Daily subscription
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Delivery Date (only for one-time) */}
                    {orderType === "once" && (
                        <div className="space-y-2">
                            <Label htmlFor="delivery-date">Delivery Date</Label>
                            <input
                                id="delivery-date"
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
                                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                            />
                        </div>
                    )}

                    {/* Product Selection */}
                    <div className="space-y-3">
                        <Label>Select Product</Label>
                        {isLoading ? (
                            <div className="grid grid-cols-2 gap-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="h-24 rounded-xl" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto">
                                {products?.map((product) => (
                                    <motion.button
                                        key={product.id}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedProduct(product.id)}
                                        className={`p-3 rounded-xl border-2 transition-all text-left ${selectedProduct === product.id
                                            ? "border-primary bg-primary/10"
                                            : "border-border hover:border-primary/50"
                                            }`}
                                    >
                                        <div className="font-semibold text-sm">{product.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            ₹{product.price_per_unit}/{product.unit}
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quantity Selection */}
                    {selectedProduct && (
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setQuantity(Math.max(0.5, quantity - 0.5))}
                                    disabled={quantity <= 0.5}
                                >
                                    <Minus className="w-4 h-4" />
                                </Button>
                                <div className="flex-1 text-center">
                                    <span className="text-2xl font-bold">{quantity}</span>
                                    <span className="text-muted-foreground ml-2">
                                        {selectedProductData?.unit}
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setQuantity(quantity + 0.5)}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Payment Method Selection */}
                    {selectedProduct && orderType === "once" && (
                        <div className="space-y-3">
                            <Label>Payment Method</Label>
                            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "prepaid" | "cod" | "phonepe")}>
                                <div className={`flex items-center justify-between space-x-2 p-3 rounded-lg border-2 transition-all ${paymentMethod === "prepaid" ? "border-primary bg-primary/10" : "border-border"
                                    }`}>
                                    <div className="flex items-center space-x-3">
                                        <RadioGroupItem value="prepaid" id="prepaid" />
                                        <Label htmlFor="prepaid" className="font-normal cursor-pointer flex items-center gap-2">
                                            <Wallet className="w-4 h-4" />
                                            <div>
                                                <div className="font-medium">Prepaid (Wallet)</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Balance: ₹{walletBalance.toFixed(2)}
                                                </div>
                                            </div>
                                        </Label>
                                    </div>
                                    {paymentMethod === "prepaid" && totalAmount > walletBalance && (
                                        <span className="text-xs text-destructive">Insufficient</span>
                                    )}
                                </div>
                                <div className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${paymentMethod === "phonepe" ? "border-primary bg-primary/10" : "border-border"
                                    }`}>
                                    <RadioGroupItem value="phonepe" id="phonepe" />
                                    <Label htmlFor="phonepe" className="font-normal cursor-pointer flex items-center gap-2">
                                        <CreditCard className="w-4 h-4" />
                                        <div>
                                            <div className="font-medium">Pay Online (PhonePe)</div>
                                            <div className="text-xs text-muted-foreground">
                                                UPI, Cards, Net Banking
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                                <div className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all ${paymentMethod === "cod" ? "border-primary bg-primary/10" : "border-border"
                                    }`}>
                                    <RadioGroupItem value="cod" id="cod" />
                                    <Label htmlFor="cod" className="font-normal cursor-pointer flex items-center gap-2">
                                        <Banknote className="w-4 h-4" />
                                        <div>
                                            <div className="font-medium">Cash on Delivery</div>
                                            <div className="text-xs text-muted-foreground">
                                                Pay when you receive
                                            </div>
                                        </div>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {/* Price Summary */}
                    {selectedProduct && selectedProductData && (
                        <div className="bg-accent/10 rounded-xl p-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                    {orderType === "daily" ? "Daily Cost" : "Total Cost"}
                                </span>
                                <span className="text-2xl font-bold text-primary">
                                    ₹{totalAmount.toFixed(2)}
                                </span>
                            </div>
                            {orderType === "daily" && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Estimated monthly: ₹{(totalAmount * 30).toFixed(0)}
                                </p>
                            )}
                            {orderType === "once" && paymentMethod === "prepaid" && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Remaining balance: ₹{(walletBalance - totalAmount).toFixed(2)}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false);
                            resetForm();
                        }}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!selectedProduct || createOrder.isPending || createSubscription.isPending || initiatePhonePePayment.isPending || (paymentMethod === "prepaid" && totalAmount > walletBalance)}
                        className="flex-1"
                    >
                        {createOrder.isPending || createSubscription.isPending || initiatePhonePePayment.isPending
                            ? "Processing..."
                            : orderType === "daily"
                                ? "Start Subscription"
                                : paymentMethod === "phonepe"
                                    ? "Proceed to Payment"
                                    : paymentMethod === "prepaid"
                                        ? "Pay & Schedule"
                                        : "Schedule Delivery"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AddMilkDialog;
