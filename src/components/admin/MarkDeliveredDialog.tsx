import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, AlertCircle, Clock, Upload, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMarkDeliveryDelivered, useOfflineDeliverySync } from "@/hooks/useDeliveryConfirmation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface Delivery {
    id: string;
    user_id: string;
    delivery_date: string;
    quantity: number;
    price_per_unit: number;
    status: "delivered" | "missed" | "paused" | "upcoming";
    products?: {
        name: string;
        unit: string;
    };
}

interface MarkDeliveredDialogProps {
    delivery: Delivery | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const MarkDeliveredDialog = ({ delivery, open, onOpenChange }: MarkDeliveredDialogProps) => {
    const { user } = useAuth();
    const markDelivered = useMarkDeliveryDelivered();
    const { markOffline } = useOfflineDeliverySync();

    const [notes, setNotes] = useState("");
    const [proofUrl, setProofUrl] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    if (!delivery) return null;

    const isToday = delivery.delivery_date === format(new Date(), "yyyy-MM-dd");
    const isOnline = navigator.onLine;

    const handleConfirm = async () => {
        if (!user?.id) {
            toast.error("Not authenticated");
            return;
        }

        const confirmationData = {
            deliveryId: delivery.id,
            markedBy: user.id,
            deliveryProofUrl: proofUrl || undefined,
            notes: notes || undefined,
            offlineMarked: !isOnline,
        };

        if (!isOnline) {
            // Save offline
            markOffline(confirmationData);
            onOpenChange(false);
            setNotes("");
            setProofUrl("");
            return;
        }

        // Mark online
        try {
            await markDelivered.mutateAsync(confirmationData);
            onOpenChange(false);
            setNotes("");
            setProofUrl("");
        } catch (error) {
            console.error("Failed to mark delivery:", error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        // In production, upload to Supabase Storage
        // For now, create a mock URL
        setTimeout(() => {
            setProofUrl(`/uploads/delivery-proof-${Date.now()}.jpg`);
            setIsUploading(false);
            toast.success("Proof uploaded successfully");
        }, 1000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-600" />
                        Mark Delivery as Delivered
                    </DialogTitle>
                    <DialogDescription>
                        Confirm delivery for {format(new Date(delivery.delivery_date), "MMMM dd, yyyy")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Delivery Details */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Product</span>
                            <span className="font-semibold">
                                {delivery.products?.name || "Product"} - {delivery.quantity}{delivery.products?.unit}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Amount</span>
                            <span className="font-semibold">₹{(delivery.quantity * delivery.price_per_unit).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Date</span>
                            <span className="font-semibold">{format(new Date(delivery.delivery_date), "MMM dd, yyyy")}</span>
                        </div>
                    </div>

                    {/* Warnings */}
                    {!isToday && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-800">Not delivery day</p>
                                <p className="text-xs text-yellow-700">
                                    This delivery is scheduled for {format(new Date(delivery.delivery_date), "MMM dd")}
                                </p>
                            </div>
                        </div>
                    )}

                    {!isOnline && (
                        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-blue-800">Offline Mode</p>
                                <p className="text-xs text-blue-700">
                                    Delivery will be marked offline and synced when connection is restored
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Delivery Proof Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="proof">Delivery Proof (Optional)</Label>
                        <div className="flex gap-2">
                            <Input
                                id="proof"
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                className="flex-1"
                            />
                            {isUploading && <Clock className="w-5 h-5 animate-spin text-muted-foreground" />}
                        </div>
                        {proofUrl && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <Check className="w-4 h-4" />
                                Proof uploaded successfully
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            placeholder="Add any delivery notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Auto-update notice */}
                    <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <Check className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-green-800">Automatic Calendar Update</p>
                            <p className="text-xs text-green-700">
                                Customer's calendar will be updated instantly with a green tick
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={markDelivered.isPending}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {markDelivered.isPending ? (
                            <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Confirming...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Confirm Delivery
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MarkDeliveredDialog;
