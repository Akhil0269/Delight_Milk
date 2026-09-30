import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Minus, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

interface CartSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const CartSheet = ({ open, onOpenChange }: CartSheetProps) => {
    const navigate = useNavigate();
    const { items, itemCount, totalPrice, updateQuantity, removeItem } = useCart();
    const [deliverNow, setDeliverNow] = useState(false);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Shopping Cart ({itemCount})</SheetTitle>
                    <SheetDescription>
                        Review your selected items
                    </SheetDescription>
                </SheetHeader>

                {items.length === 0 ? (
                    // Empty state
                    <div className="flex flex-col items-center justify-center h-[80%] gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <ShoppingCart className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-semibold">Your cart is empty</p>
                            <p className="text-sm text-muted-foreground">
                                Looks like you haven't added anything yet
                            </p>
                        </div>
                        <Button
                            onClick={() => {
                                onOpenChange(false);
                                navigate("/products");
                            }}
                        >
                            Start Shopping
                        </Button>
                    </div>
                ) : (
                    // Cart items
                    <>
                        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
                            {items.map((item) => (
                                <div key={item.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="w-16 h-16 rounded-md object-cover"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center">
                                            <ShoppingCart className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-medium truncate pr-2">{item.name}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    ₹{item.price} {item.unit ? `/ ${item.unit}` : ''}
                                                </p>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                                onClick={() => removeItem(item.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="flex items-center gap-3 mt-3">
                                            <div className="flex items-center gap-1 border rounded-md">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 rounded-none"
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                >
                                                    <Minus className="w-3 h-3" />
                                                </Button>
                                                <span className="text-sm font-medium w-6 text-center">
                                                    {item.quantity}
                                                </span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-7 w-7 rounded-none"
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                >
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <div className="ml-auto font-medium">
                                                ₹{(item.price * item.quantity).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Total & Checkout */}
                        <div className="border-t pt-4 space-y-4 bg-background">

                            {/* Deliver Now Option */}
                            <div className="flex items-center justify-between border p-3 rounded-lg bg-accent/5">
                                <div className="space-y-0.5">
                                    <h4 className="text-sm font-medium">Deliver Now</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Deliver today instead of tomorrow
                                    </p>
                                </div>
                                <Switch
                                    checked={deliverNow}
                                    onCheckedChange={setDeliverNow}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>₹{totalPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Delivery</span>
                                    <span className="text-green-600">Free</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2">
                                    <span>Total</span>
                                    <span>₹{totalPrice.toFixed(2)}</span>
                                </div>
                            </div>
                            <Button
                                className="w-full"
                                size="lg"
                                onClick={() => {
                                    const txnId = `ORD${Date.now()}`;
                                    onOpenChange(false);
                                    // Use purpose to signal immediate delivery
                                    const purpose = deliverNow ? 'cart_checkout_now' : 'cart_checkout';
                                    navigate(`/payment/process?txnId=${txnId}&amount=${totalPrice}&purpose=${purpose}`);
                                }}
                            >
                                Proceed to Checkout
                            </Button>
                        </div>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
};

export default CartSheet;
