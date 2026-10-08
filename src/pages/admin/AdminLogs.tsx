import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Search, Filter, RefreshCw, Calendar, User, Activity, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminLogs } from "@/hooks/useAdmin";
import { format } from "date-fns";

interface AdminLogItem {
    id: string;
    admin_id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    details: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
    profiles?: {
        full_name: string | null;
        phone: string | null;
    } | null;
}

const AdminLogs = () => {
    const { data: logs, isLoading, error, refetch, isRefetching } = useAdminLogs(150);
    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState("all");

    const getActionBadgeColor = (action: string) => {
        if (action.includes("credit")) return "bg-green-500/10 text-green-600 border-green-500/20";
        if (action.includes("debit")) return "bg-orange-500/10 text-orange-600 border-orange-500/20";
        if (action.includes("delete") || action.includes("block")) return "bg-destructive/10 text-destructive border-destructive/20";
        if (action.includes("role") || action.includes("admin")) return "bg-purple-500/10 text-purple-600 border-purple-500/20";
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    };

    const formatAction = (action: string) => {
        return action.replace(/_/g, " ").toUpperCase();
    };

    const filteredLogs = (logs as unknown as AdminLogItem[] || []).filter((log) => {
        const matchesAction = actionFilter === "all" || log.action === actionFilter;
        const matchesSearch =
            !searchTerm ||
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.target_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.target_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesAction && matchesSearch;
    });

    const uniqueActions = Array.from(new Set((logs as unknown as AdminLogItem[] || []).map(l => l.action)));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                    <p className="text-muted-foreground mt-1">
                        System security records, administrative actions, and wallet adjustment tracking.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading || isRefetching}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                    Refresh Logs
                </Button>
            </div>

            {/* Filter Bar */}
            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by action, target, or admin name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Filter by action" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Actions</SelectItem>
                            {uniqueActions.map(action => (
                                <SelectItem key={action} value={action}>
                                    {formatAction(action)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Main Log Listing */}
            {isLoading ? (
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
                    <p className="text-muted-foreground">Loading audit log entries...</p>
                </div>
            ) : error ? (
                <Card className="p-8 text-center text-destructive">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-semibold">Failed to load audit logs</p>
                    <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
                    <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                        Try Again
                    </Button>
                </Card>
            ) : filteredLogs.length === 0 ? (
                <Card className="p-12 text-center">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-semibold mb-1">No Audit Logs Found</h3>
                    <p className="text-sm text-muted-foreground">
                        {searchTerm || actionFilter !== "all"
                            ? "Try adjusting your search query or action filter."
                            : "Administrative events and ledger adjustments will be tracked here."}
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredLogs.map((log) => (
                        <Card key={log.id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-start sm:items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <Activity className="w-4 h-4 text-primary" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge className={getActionBadgeColor(log.action)}>
                                                    {formatAction(log.action)}
                                                </Badge>
                                                {log.target_type && (
                                                    <span className="text-xs text-muted-foreground">
                                                        on <strong>{log.target_type}</strong>
                                                    </span>
                                                )}
                                                {log.target_id && (
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        ({log.target_id.slice(0, 8)}...)
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                                                <span className="flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5" />
                                                    {log.profiles?.full_name || log.admin_id?.slice(0, 8) || "Admin"}
                                                </span>
                                                {log.ip_address && (
                                                    <span>IP: {log.ip_address}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex sm:flex-col items-end justify-between text-xs text-muted-foreground shrink-0">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>
                                                {format(new Date(log.created_at), "dd MMM yyyy, HH:mm:ss")}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {log.details && Object.keys(log.details).length > 0 && (
                                    <div className="mt-3 pt-3 border-t text-xs font-mono bg-muted/30 p-2.5 rounded-lg overflow-x-auto">
                                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminLogs;
