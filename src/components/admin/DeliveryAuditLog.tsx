import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, FileText, User, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveryAuditLogs } from "@/hooks/useDeliveryConfirmation";
import { format } from "date-fns";

interface DeliveryAuditLogProps {
    deliveryId?: string;
}

const DeliveryAuditLog = ({ deliveryId }: DeliveryAuditLogProps) => {
    const { data: auditLogs, isLoading } = useDeliveryAuditLogs(deliveryId);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>Loading audit history...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    if (!auditLogs || auditLogs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Audit Trail</CardTitle>
                    <CardDescription>No audit history available</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No changes have been recorded yet</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Audit Trail
                </CardTitle>
                <CardDescription>
                    Complete history of all delivery status changes
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {auditLogs.map((log, index) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="border rounded-lg p-4 space-y-3"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    {log.is_admin_correction ? (
                                        <Badge variant="destructive" className="text-xs">
                                            Admin Correction
                                        </Badge>
                                    ) : (
                                        <Badge variant="default" className="text-xs">
                                            Status Change
                                        </Badge>
                                    )}
                                    {log.billing_month_locked && (
                                        <Badge variant="outline" className="text-xs">
                                            Locked
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}
                                </span>
                            </div>

                            {/* Status Change */}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    {log.old_status && (
                                        <>
                                            <Badge variant="outline" className="capitalize">
                                                {log.old_status}
                                            </Badge>
                                            <span className="text-muted-foreground">→</span>
                                        </>
                                    )}
                                    <Badge className="capitalize bg-green-600">
                                        {log.new_status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Reason */}
                            {log.change_reason && (
                                <div className="bg-muted/50 rounded-lg p-3">
                                    <p className="text-sm text-muted-foreground mb-1">Reason:</p>
                                    <p className="text-sm">{log.change_reason}</p>
                                </div>
                            )}

                            {/* Metadata */}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {log.metadata.offline_marked && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Marked Offline
                                        </div>
                                    )}
                                    {log.metadata.marked_by_role && (
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {log.metadata.marked_by_role}
                                        </div>
                                    )}
                                    {log.metadata.delivery_time && (
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(log.metadata.delivery_time), "HH:mm")}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default DeliveryAuditLog;
