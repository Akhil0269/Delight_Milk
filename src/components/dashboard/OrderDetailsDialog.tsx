import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, Clock, Truck, Download, X, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { Order, OrderStatus, OrderPaymentStatus } from "@/hooks/useOrders";
import { downloadReceipt, ReceiptData } from "@/lib/receiptGenerator";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancelOrder?: (orderId: string) => void;
  onRepeatOrder?: (orderId: string, productName?: string) => void;
  isCancelling?: boolean;
  isRepeating?: boolean;
}

export function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
  onCancelOrder,
  onRepeatOrder,
  isCancelling = false,
  isRepeating = false,
}: OrderDetailsDialogProps) {
  const { user } = useAuth();

  if (!order) return null;

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "delivered":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "scheduled":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "confirmed":
        return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
      case "cancelled":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const getPaymentStatusBadge = (status: OrderPaymentStatus) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-600/15 text-green-600 border-green-300">Paid</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pending</Badge>;
      case "refunded":
        return <Badge className="bg-blue-600/15 text-blue-600 border-blue-300">Refunded</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "wallet":
        return "Delight Milk Wallet";
      case "cod":
        return "Cash on Delivery (COD)";
      case "phonepe":
        return "PhonePe Gateway";
      default:
        return method;
    }
  };

  const handleDownloadReceipt = () => {
    const receiptData: ReceiptData = {
      transactionId: order.id,
      amount: Number(order.total_amount),
      paymentMethod: formatPaymentMethod(order.payment_method),
      purpose: "One-Time Milk Order",
      date: order.created_at,
      userName: user?.user_metadata?.full_name || user?.email || "Customer",
      userEmail: user?.email,
      deliveryDate: order.delivery_date,
      productName: order.products?.name || "Dairy Product",
      quantity: Number(order.quantity),
    };

    downloadReceipt(receiptData);
    toast.success("Receipt downloaded successfully!");
  };

  const totalAmount = Number(order.total_amount ?? (order.quantity * order.price_per_unit));

  // Determine line items: prefer order_items array, fallback to header product if order_items is empty
  const items = (order.order_items && order.order_items.length > 0)
    ? order.order_items
    : [
        {
          id: order.id + "-item",
          product_id: order.product_id,
          quantity: order.quantity,
          price_per_unit: order.price_per_unit,
          total_amount: totalAmount,
          products: order.products,
        },
      ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Order #{order.id.slice(0, 8)}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1 flex items-center gap-2 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Placed on {format(new Date(order.created_at), "dd MMM yyyy, hh:mm a")}
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge className={getStatusColor(order.status)}>
                {order.status.toUpperCase()}
              </Badge>
              {getPaymentStatusBadge(order.payment_status)}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 my-2">
          {/* Delivery Details Card */}
          <div className="bg-muted/40 rounded-xl p-3.5 border space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                Scheduled Delivery Date
              </span>
              <span className="font-medium text-foreground">
                {format(new Date(order.delivery_date), "EEEE, dd MMMM yyyy")}
              </span>
            </div>

            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Truck className="w-4 h-4" />
                Delivery Status
              </span>
              <span className="capitalize font-medium text-foreground">
                {order.deliveries?.status || (order.delivery_id ? "Scheduled" : "Pending Assignment")}
              </span>
            </div>

            {order.deliveries?.delivery_partner_name && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Delivery Partner</span>
                <span className="font-medium text-foreground">
                  {order.deliveries.delivery_partner_name}
                </span>
              </div>
            )}

            {order.notes && (
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                <span className="font-medium">Note: </span>
                {order.notes}
              </div>
            )}
          </div>

          {/* Itemized Products */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Order Items ({items.length})
            </h4>
            <div className="divide-y border rounded-xl overflow-hidden bg-card">
              {items.map((item) => {
                const prodName = item.products?.name || "Product (Catalog Updated)";
                const unit = item.products?.unit || "";
                const unitPrice = Number(item.price_per_unit);
                const qty = Number(item.quantity);
                const lineTotal = Number(item.total_amount ?? (qty * unitPrice));

                return (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {item.products?.image_url ? (
                          <img
                            src={item.products.image_url}
                            alt={prodName}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground leading-tight">{prodName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ₹{unitPrice.toFixed(2)} × {qty} {unit}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">₹{lineTotal.toFixed(2)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment & Financial Breakdown */}
          <div className="bg-muted/30 rounded-xl p-4 border space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Payment Method</span>
              <span className="font-medium text-foreground">
                {formatPaymentMethod(order.payment_method)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Payment Status</span>
              <span className="font-medium capitalize text-foreground">
                {order.payment_status}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery Fee</span>
              <span className="font-medium text-green-600">FREE</span>
            </div>
            <Separator className="my-1.5" />
            <div className="flex justify-between text-sm font-bold text-foreground">
              <span>Total Paid</span>
              <span className="text-primary text-base">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Receipt Download Action */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadReceipt}
            className="w-full border-primary/30 text-primary hover:bg-primary/5"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Official Receipt
          </Button>

          {/* Cancellation Info / Alert */}
          {order.status === "cancelled" && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Order Cancelled</p>
                <p className="mt-0.5 text-muted-foreground">
                  {order.payment_status === "refunded"
                    ? "Your wallet balance was refunded immediately upon cancellation."
                    : "No charges were incurred for this order."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          {order.status === "confirmed" && onCancelOrder && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isCancelling}
              onClick={() => onCancelOrder(order.id)}
            >
              <X className="w-4 h-4 mr-1.5" />
              {isCancelling ? "Cancelling..." : "Cancel Order"}
            </Button>
          )}

          {order.status === "delivered" && onRepeatOrder && (
            <Button
              variant="default"
              size="sm"
              disabled={isRepeating}
              onClick={() => onRepeatOrder(order.id, order.products?.name)}
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              {isRepeating ? "Placing..." : "Repeat Order"}
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
