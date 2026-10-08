// Admin Subscription Management — Phase 12.5
// Canonical data source: public.subscriptions + profiles + products
// No mock data, no localStorage, no service-role key in frontend.
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    useAdminSubscriptions,
    useAdminPauseSubscription,
    useAdminResumeSubscription,
    useAdminCancelSubscription,
    useAdminUpdateSubscriptionQuantity,
    useAdminTriggerDeliveryGeneration,
    getSubscriptionStatus,
    AdminSubscriptionItem,
} from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
    RefreshCw,
    Search,
    Play,
    Pause,
    XCircle,
    Edit3,
    AlertTriangle,
    CheckCircle2,
    CalendarDays,
    Package,
    User,
    Clock,
    Zap,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Status badge helpers ──────────────────────────────────────────────────────
type DisplayStatus = 'active' | 'paused' | 'paused_by_admin' | 'cancelled';

function StatusBadge({ status }: { status: DisplayStatus }) {
    const config: Record<DisplayStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
        active: { label: 'Active', variant: 'default', className: 'bg-emerald-600 text-white border-0' },
        paused: { label: 'Paused (Customer)', variant: 'outline', className: 'border-amber-500 text-amber-700 bg-amber-50' },
        paused_by_admin: { label: 'Paused (Admin)', variant: 'outline', className: 'border-orange-500 text-orange-700 bg-orange-50' },
        cancelled: { label: 'Cancelled', variant: 'secondary', className: 'bg-slate-200 text-slate-600' },
    };
    const c = config[status];
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
}

// ─── Filter tab type ───────────────────────────────────────────────────────────
type FilterTab = 'all' | 'active' | 'paused' | 'cancelled';

// ─── Main component ───────────────────────────────────────────────────────────
const SubscriptionManagement = () => {
    const { user } = useAuth();
    const { data: subscriptions = [], isLoading, isError, error, refetch } = useAdminSubscriptions();

    const pauseMutation = useAdminPauseSubscription();
    const resumeMutation = useAdminResumeSubscription();
    const cancelMutation = useAdminCancelSubscription();
    const updateQtyMutation = useAdminUpdateSubscriptionQuantity();
    const triggerGenerationMutation = useAdminTriggerDeliveryGeneration();

    // ── Local UI state ────────────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<FilterTab>('all');

    // Pause dialog
    const [pauseTarget, setPauseTarget] = useState<AdminSubscriptionItem | null>(null);
    const [pauseUntilDate, setPauseUntilDate] = useState('');

    // Resume confirm
    const [resumeTarget, setResumeTarget] = useState<AdminSubscriptionItem | null>(null);

    // Cancel confirm
    const [cancelTarget, setCancelTarget] = useState<AdminSubscriptionItem | null>(null);

    // Quantity edit dialog
    const [qtyTarget, setQtyTarget] = useState<AdminSubscriptionItem | null>(null);
    const [qtyValue, setQtyValue] = useState('');

    // Delivery generation panel
    const [deliveryGenDate, setDeliveryGenDate] = useState(
        format(new Date(Date.now() + 86400000), 'yyyy-MM-dd') // tomorrow by default
    );
    const [generationResult, setGenerationResult] = useState<{
        success: boolean;
        deliveries_generated: number;
        deliveries_already_existing: number;
        eligible_subscriptions: number;
        skipped_paused_count: number;
        error?: string;
    } | null>(null);

    // ── Derived status for each subscription ──────────────────────────────────
    const subscriptionsWithStatus = useMemo(() =>
        subscriptions.map(s => ({ ...s, computedStatus: getSubscriptionStatus(s) })),
        [subscriptions]
    );

    // ── Metrics ───────────────────────────────────────────────────────────────
    const metrics = useMemo(() => {
        const all = subscriptions.length;
        const active = subscriptions.filter(s => getSubscriptionStatus(s) === 'active').length;
        const paused = subscriptions.filter(s => {
            const st = getSubscriptionStatus(s);
            return st === 'paused' || st === 'paused_by_admin';
        }).length;
        const cancelled = subscriptions.filter(s => getSubscriptionStatus(s) === 'cancelled').length;
        return { all, active, paused, cancelled };
    }, [subscriptions]);

    // ── Filter + search ───────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return subscriptionsWithStatus.filter(s => {
            // Status filter
            if (activeTab === 'active' && s.computedStatus !== 'active') return false;
            if (activeTab === 'paused' && s.computedStatus !== 'paused' && s.computedStatus !== 'paused_by_admin') return false;
            if (activeTab === 'cancelled' && s.computedStatus !== 'cancelled') return false;
            // Search
            if (!q) return true;
            return (
                s.customer_name?.toLowerCase().includes(q) ||
                s.customer_email?.toLowerCase().includes(q) ||
                s.product_name?.toLowerCase().includes(q) ||
                s.id.toLowerCase().includes(q)
            );
        });
    }, [subscriptionsWithStatus, activeTab, search]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handlePauseSubmit = () => {
        if (!pauseTarget || !pauseUntilDate || !user?.id) return;
        pauseMutation.mutate(
            { subscriptionId: pauseTarget.id, pauseUntil: pauseUntilDate, adminId: user.id },
            { onSuccess: () => setPauseTarget(null) }
        );
    };

    const handleResumeConfirm = () => {
        if (!resumeTarget || !user?.id) return;
        resumeMutation.mutate(
            { subscriptionId: resumeTarget.id, adminId: user.id },
            { onSuccess: () => setResumeTarget(null) }
        );
    };

    const handleCancelConfirm = () => {
        if (!cancelTarget || !user?.id) return;
        cancelMutation.mutate(
            { subscriptionId: cancelTarget.id, adminId: user.id },
            { onSuccess: () => setCancelTarget(null) }
        );
    };

    const handleQtySubmit = () => {
        if (!qtyTarget || !user?.id) return;
        const qty = parseInt(qtyValue, 10);
        updateQtyMutation.mutate(
            { subscriptionId: qtyTarget.id, quantity: qty, adminId: user.id },
            { onSuccess: () => setQtyTarget(null) }
        );
    };

    const handleTriggerDeliveries = () => {
        setGenerationResult(null);
        triggerGenerationMutation.mutate(deliveryGenDate, {
            onSuccess: (data) => {
                if (data) setGenerationResult(data);
            },
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Subscription Management</h1>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold">Subscription Management</h1>
                <Card className="border-destructive/50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 text-destructive">
                            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Failed to load subscriptions</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {(error as Error)?.message || 'An unexpected database error occurred.'}
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                            <RefreshCw className="w-4 h-4 mr-2" /> Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Subscription Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage all customer subscriptions, delivery generation, and status transitions.
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                </Button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: metrics.all, icon: Package, color: 'text-slate-600' },
                    { label: 'Active', value: metrics.active, icon: CheckCircle2, color: 'text-emerald-600' },
                    { label: 'Paused', value: metrics.paused, icon: Pause, color: 'text-amber-600' },
                    { label: 'Cancelled', value: metrics.cancelled, icon: XCircle, color: 'text-rose-600' },
                ].map(m => (
                    <Card key={m.label}>
                        <CardContent className="pt-5 pb-4">
                            <div className="flex items-center gap-3">
                                <m.icon className={`w-6 h-6 ${m.color}`} />
                                <div>
                                    <p className="text-2xl font-bold">{m.value}</p>
                                    <p className="text-xs text-muted-foreground">{m.label}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Delivery Generation Panel */}
            <Card className="border-dashed border-primary/40">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Zap className="w-5 h-5 text-primary" />
                        Manual Delivery Generation
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="delivery-gen-date" className="text-sm">Target Date</Label>
                            <Input
                                id="delivery-gen-date"
                                type="date"
                                value={deliveryGenDate}
                                onChange={e => setDeliveryGenDate(e.target.value)}
                                className="w-48"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                        <Button
                            onClick={handleTriggerDeliveries}
                            disabled={triggerGenerationMutation.isPending || !deliveryGenDate}
                            className="flex items-center gap-2"
                        >
                            {triggerGenerationMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Zap className="w-4 h-4" />
                            )}
                            Generate Deliveries
                        </Button>
                    </div>

                    {generationResult && (
                        <div className={`mt-4 p-4 rounded-lg text-sm ${generationResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                            {generationResult.success ? (
                                <div className="space-y-1">
                                    <p className="font-semibold text-emerald-800">✅ Generation complete for {generationResult.eligible_subscriptions} eligible subscriptions</p>
                                    <p className="text-emerald-700">Generated: <strong>{generationResult.deliveries_generated}</strong></p>
                                    <p className="text-emerald-700">Already existed: <strong>{generationResult.deliveries_already_existing}</strong></p>
                                    <p className="text-amber-700">Skipped (paused): <strong>{generationResult.skipped_paused_count}</strong></p>
                                </div>
                            ) : (
                                <p className="text-red-800 font-medium">❌ {generationResult.error}</p>
                            )}
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-3">
                        Runs the canonical <code>generate_subscription_deliveries(date)</code> RPC. Idempotent — repeated runs on the same date are safe.
                        Timezone: Asia/Kolkata (IST). Automated nightly generation occurs at 00:00 IST.
                    </p>
                </CardContent>
            </Card>

            {/* Filters + search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex gap-2 flex-wrap">
                    {(['all', 'active', 'paused', 'cancelled'] as FilterTab[]).map(tab => (
                        <Button
                            key={tab}
                            id={`filter-tab-${tab}`}
                            variant={activeTab === tab ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setActiveTab(tab)}
                            className="capitalize"
                        >
                            {tab === 'all' ? `All (${metrics.all})` :
                                tab === 'active' ? `Active (${metrics.active})` :
                                    tab === 'paused' ? `Paused (${metrics.paused})` :
                                        `Cancelled (${metrics.cancelled})`}
                        </Button>
                    ))}
                </div>
                <div className="relative flex-1 min-w-0 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="subscription-search"
                        placeholder="Search by customer, product, or ID…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">No subscriptions found</p>
                        {(search || activeTab !== 'all') && (
                            <Button variant="link" className="mt-2" onClick={() => { setSearch(''); setActiveTab('all'); }}>
                                Clear filters
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="overflow-x-auto rounded-xl border bg-card">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Customer</th>
                                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Product</th>
                                <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Qty</th>
                                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Dates</th>
                                <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Price/Unit</th>
                                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((sub, idx) => {
                                const isCancelled = sub.computedStatus === 'cancelled';
                                const isPaused = sub.computedStatus === 'paused' || sub.computedStatus === 'paused_by_admin';
                                const isActive = sub.computedStatus === 'active';
                                const mutationPending = pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending;

                                return (
                                    <tr
                                        key={sub.id}
                                        className={`border-b last:border-0 transition-colors ${isCancelled ? 'opacity-60 bg-muted/20' : 'hover:bg-muted/30'} ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                                    >
                                        {/* Customer */}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate max-w-[140px]">
                                                        {sub.customer_name || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                                                        {sub.customer_email || '—'}
                                                    </p>
                                                    {sub.customer_is_blocked && (
                                                        <Badge variant="destructive" className="text-xs py-0 px-1 mt-0.5">Blocked</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Product */}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <p className="font-medium truncate max-w-[120px]">
                                                        {sub.product_name || 'Unknown product'}
                                                    </p>
                                                    {!sub.product_is_active && (
                                                        <Badge variant="secondary" className="text-xs py-0 px-1 mt-0.5">Inactive</Badge>
                                                    )}
                                                    {!sub.product_subscription_enabled && sub.product_is_active && (
                                                        <Badge variant="outline" className="text-xs py-0 px-1 mt-0.5 border-amber-400 text-amber-600">Sub disabled</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Quantity */}
                                        <td className="py-3 px-4 text-center">
                                            <span className="font-semibold">{sub.quantity}</span>
                                            <span className="text-muted-foreground text-xs ml-1">{sub.product_unit || ''}</span>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-4">
                                            <StatusBadge status={sub.computedStatus} />
                                            {sub.paused_until && (isPaused) && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Until {sub.paused_until}
                                                </p>
                                            )}
                                        </td>

                                        {/* Dates */}
                                        <td className="py-3 px-4 hidden md:table-cell">
                                            <div className="space-y-0.5 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <CalendarDays className="w-3 h-3" />
                                                    <span>Start: {sub.start_date || '—'}</span>
                                                </div>
                                                {sub.end_date && (
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>End: {sub.end_date}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>Created: {format(new Date(sub.created_at), 'dd MMM yy')}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Price */}
                                        <td className="py-3 px-4 hidden lg:table-cell">
                                            <span className="font-medium">
                                                {sub.product_price_per_unit != null
                                                    ? `₹${sub.product_price_per_unit.toFixed(2)}`
                                                    : '—'}
                                            </span>
                                            <p className="text-xs text-muted-foreground">per {sub.product_unit || 'unit'}</p>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-end gap-1 flex-wrap">
                                                {/* Edit quantity (active/paused only) */}
                                                {!isCancelled && (
                                                    <Button
                                                        id={`edit-qty-${sub.id}`}
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Edit Quantity"
                                                        disabled={mutationPending}
                                                        onClick={() => { setQtyTarget(sub); setQtyValue(String(sub.quantity)); }}
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </Button>
                                                )}

                                                {/* Pause (active only) */}
                                                {isActive && (
                                                    <Button
                                                        id={`pause-${sub.id}`}
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Pause Subscription"
                                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                        disabled={mutationPending}
                                                        onClick={() => { setPauseTarget(sub); setPauseUntilDate(''); }}
                                                    >
                                                        <Pause className="w-4 h-4" />
                                                    </Button>
                                                )}

                                                {/* Resume (paused by admin only) */}
                                                {isPaused && sub.paused_by_admin && (
                                                    <Button
                                                        id={`resume-${sub.id}`}
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Resume Subscription"
                                                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                        disabled={mutationPending}
                                                        onClick={() => setResumeTarget(sub)}
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </Button>
                                                )}

                                                {/* Cancel (active or paused) */}
                                                {!isCancelled && (
                                                    <Button
                                                        id={`cancel-${sub.id}`}
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Cancel Subscription"
                                                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                        disabled={mutationPending}
                                                        onClick={() => setCancelTarget(sub)}
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                )}

                                                {isCancelled && (
                                                    <span className="text-xs text-muted-foreground italic">No actions</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ─── Pause Dialog ─────────────────────────────────────────────────────── */}
            <Dialog open={!!pauseTarget} onOpenChange={open => !open && setPauseTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pause Subscription</DialogTitle>
                        <DialogDescription>
                            Pausing will cancel upcoming deliveries through the pause date.
                            The customer will be notified automatically.
                        </DialogDescription>
                    </DialogHeader>

                    {pauseTarget && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                                <p><strong>Customer:</strong> {pauseTarget.customer_name} ({pauseTarget.customer_email})</p>
                                <p><strong>Product:</strong> {pauseTarget.product_name}</p>
                                <p><strong>Quantity:</strong> {pauseTarget.quantity} {pauseTarget.product_unit}</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="pause-until-date">Pause Until Date (inclusive)</Label>
                                <Input
                                    id="pause-until-date"
                                    type="date"
                                    value={pauseUntilDate}
                                    onChange={e => setPauseUntilDate(e.target.value)}
                                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Deliveries up to and including this date will be cancelled.
                                    The subscription resumes automatically on the next day.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPauseTarget(null)}>Cancel</Button>
                        <Button
                            id="pause-confirm-btn"
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            disabled={!pauseUntilDate || pauseMutation.isPending}
                            onClick={handlePauseSubmit}
                        >
                            {pauseMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Pause className="w-4 h-4 mr-2" />}
                            Pause Subscription
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Resume Confirm ───────────────────────────────────────────────────── */}
            <AlertDialog open={!!resumeTarget} onOpenChange={open => !open && setResumeTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Resume Subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {resumeTarget && (
                                <>
                                    Resume the subscription for <strong>{resumeTarget.customer_name}</strong> ({resumeTarget.product_name} × {resumeTarget.quantity})?
                                    Deliveries will resume from the next scheduled generation.
                                    The customer will be notified automatically.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            id="resume-confirm-btn"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleResumeConfirm}
                            disabled={resumeMutation.isPending}
                        >
                            {resumeMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                            Resume
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ─── Cancel Confirm ───────────────────────────────────────────────────── */}
            <AlertDialog open={!!cancelTarget} onOpenChange={open => !open && setCancelTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-rose-700">
                            <AlertTriangle className="w-5 h-5" /> Cancel Subscription?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {cancelTarget && (
                                <>
                                    Cancel the subscription for <strong>{cancelTarget.customer_name}</strong> ({cancelTarget.product_name} × {cancelTarget.quantity})?
                                    <br /><br />
                                    All future upcoming deliveries will be cancelled.
                                    Historical delivery records will be preserved.
                                    This action cannot be undone — the customer must create a new subscription to restart.
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                        <AlertDialogAction
                            id="cancel-confirm-btn"
                            className="bg-rose-600 hover:bg-rose-700 text-white"
                            onClick={handleCancelConfirm}
                            disabled={cancelMutation.isPending}
                        >
                            {cancelMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Yes, Cancel Subscription
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ─── Quantity Edit Dialog ─────────────────────────────────────────────── */}
            <Dialog open={!!qtyTarget} onOpenChange={open => !open && setQtyTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Update Subscription Quantity</DialogTitle>
                        <DialogDescription>
                            Changes apply to future deliveries only. Historical delivery records are not modified.
                        </DialogDescription>
                    </DialogHeader>

                    {qtyTarget && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                                <p><strong>Customer:</strong> {qtyTarget.customer_name}</p>
                                <p><strong>Product:</strong> {qtyTarget.product_name}</p>
                                <p><strong>Current Quantity:</strong> {qtyTarget.quantity} {qtyTarget.product_unit}</p>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="new-quantity">New Quantity</Label>
                                <Input
                                    id="new-quantity"
                                    type="number"
                                    min={1}
                                    max={100}
                                    step={1}
                                    value={qtyValue}
                                    onChange={e => setQtyValue(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Must be an integer between 1 and 100.</p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setQtyTarget(null)}>Cancel</Button>
                        <Button
                            id="update-qty-btn"
                            disabled={!qtyValue || updateQtyMutation.isPending}
                            onClick={handleQtySubmit}
                        >
                            {updateQtyMutation.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Edit3 className="w-4 h-4 mr-2" />}
                            Update Quantity
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SubscriptionManagement;
