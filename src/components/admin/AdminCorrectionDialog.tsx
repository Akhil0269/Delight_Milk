import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, FileText } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAdminCorrectDelivery } from "@/hooks/useDeliveryConfirmation";
import { toast } from "sonner";

interface AdminCorrectionDialogProps {
    deliveryId: string | null;
    currentStatus: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const AdminCorrectionDialog = ({
    deliveryId,
    currentStatus,
    open,
    onOpenChange,
}: AdminCorrectionDialogProps) => {
    const correctDelivery = useAdminCorrectDelivery();
    const [newStatus, setNewStatus] = useState<"delivered" | "missed" | "paused" | "upcoming">("delivered");
    const [reason, setReason] = useState("");

    const handleCorrect = async () => {
        if (!deliveryId) return;

        if (!reason.trim()) {
            toast.error("Correction reason is required");
            return;
        }

        try {
            await correctDelivery.mutateAsync({
                deliveryId,
                newStatus,
                correctionReason: reason,
            });

            onOpenChange(false);
            setReason("");
            setNewStatus("delivered");
        } catch (error) {
            console.error("Failed to correct delivery:", error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        Admin Correction
                    </DialogTitle>
                    <DialogDescription>
                        Correct delivery status with audit trail
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Warning */}
                    <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-orange-800">Admin Action Required</p>
                            <p className="text-xs text-orange-700">
                                This correction will be logged in the audit trail with your reason
                            </p>
                        </div>
                    </div>

                    {/* Current Status */}
                    <div className="space-y-2">
                        <Label>Current Status</Label>
                        <div className="p-3 bg-muted rounded-lg">
                            <span className="font-semibold capitalize">{currentStatus}</span>
                        </div>
                    </div>

                    {/* New Status */}
                    <div className="space-y-2">
                        <Label htmlFor="new-status">New Status</Label>
                        <Select value={newStatus} onValueChange={(value: any) => setNewStatus(value)}>
                            <SelectTrigger id="new-status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="delivered">Delivered</SelectItem>
                                <SelectItem value="missed">Missed</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="upcoming">Upcoming</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Correction Reason */}
                    <div className="space-y-2">
                        <Label htmlFor="reason">Correction Reason *</Label>
                        <Textarea
                            id="reason"
                            placeholder="Explain why this correction is needed..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            This reason will be permanently stored in the audit log
                        </p>
                    </div>

                    {/* Audit Trail Notice */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-800">Audit Trail</p>
                            <p className="text-xs text-blue-700">
                                This correction will create an audit log entry with timestamp, your user ID, and reason
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCorrect}
                        disabled={correctDelivery.isPending || !reason.trim()}
                        variant="destructive"
                    >
                        {correctDelivery.isPending ? "Correcting..." : "Confirm Correction"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AdminCorrectionDialog;
