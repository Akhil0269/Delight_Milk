import { motion } from 'framer-motion';
import { Calendar, Check, X, Pause, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrentMonthBilling } from '@/hooks/useBilling';
import { Skeleton } from '@/components/ui/skeleton';
import { generateBillingBreakdown, calculateSavings, validateBilling, getBillingSummary } from '@/utils/billing';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const MonthlyBillingSummary = () => {
    const { billing, isLoading } = useCurrentMonthBilling(false); // No GST for now

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32 w-full" />
                </CardContent>
            </Card>
        );
    }

    if (!billing) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Billing</CardTitle>
                    <CardDescription>No billing data available</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const savings = calculateSavings(billing);
    const validation = validateBilling(billing);
    const summary = getBillingSummary(billing);

    const handleViewBreakdown = () => {
        const breakdown = generateBillingBreakdown(billing);
        console.log(breakdown);
        toast.info('Billing breakdown logged to console', {
            description: 'Check your browser console for detailed breakdown'
        });
    };

    return (
        <div className="space-y-6">
            {/* Main Billing Card */}
            <Card className="border-2 border-primary/20">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Monthly Billing
                            </CardTitle>
                            <CardDescription>{billing.monthName}</CardDescription>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-primary">
                                ₹{billing.grandTotal.toFixed(2)}
                            </div>
                            <div className="text-sm text-muted-foreground">Total Bill</div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Calendar-Based Billing Explanation */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Calendar-Based Billing
                        </h4>
                        <p className="text-sm text-blue-800">
                            You are charged <strong>ONLY for delivered days</strong>. Missed and paused days are completely free!
                        </p>
                    </div>

                    {/* Billing Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* Delivered (Charged) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-green-50 border-2 border-green-200 rounded-xl p-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Check className="w-5 h-5 text-green-700" />
                                <span className="text-sm font-medium text-green-700">Delivered</span>
                            </div>
                            <div className="text-2xl font-bold text-green-900">
                                {billing.deliveredCount}
                            </div>
                            <div className="text-sm text-green-700 mt-1">
                                ₹{billing.deliveredAmount.toFixed(2)}
                            </div>
                            <div className="text-xs text-green-600 mt-1">✓ Charged</div>
                        </motion.div>

                        {/* Missed (Not Charged) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-red-50 border-2 border-red-200 rounded-xl p-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <X className="w-5 h-5 text-red-700" />
                                <span className="text-sm font-medium text-red-700">Missed</span>
                            </div>
                            <div className="text-2xl font-bold text-red-900">
                                {billing.missedCount}
                            </div>
                            <div className="text-sm text-red-700 mt-1">₹0.00</div>
                            <div className="text-xs text-red-600 mt-1">✗ Not charged</div>
                        </motion.div>

                        {/* Paused (Not Charged) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Pause className="w-5 h-5 text-yellow-700" />
                                <span className="text-sm font-medium text-yellow-700">Paused</span>
                            </div>
                            <div className="text-2xl font-bold text-yellow-900">
                                {billing.pausedCount}
                            </div>
                            <div className="text-sm text-yellow-700 mt-1">₹0.00</div>
                            <div className="text-xs text-yellow-600 mt-1">✗ Not charged</div>
                        </motion.div>
                    </div>

                    {/* Savings Display */}
                    {savings.savings > 0 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-5 h-5 text-green-700" />
                                        <span className="font-semibold text-green-900">You Saved</span>
                                    </div>
                                    <p className="text-sm text-green-700">
                                        By calendar-based billing
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-green-900">
                                        ₹{savings.savings.toFixed(2)}
                                    </div>
                                    <div className="text-sm text-green-700">
                                        {savings.savingsPercentage.toFixed(1)}% savings
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Billing Formula */}
                    <div className="border-t-2 border-dashed pt-4">
                        <h4 className="font-semibold mb-3 text-sm text-muted-foreground">
                            How Your Bill is Calculated:
                        </h4>
                        <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm space-y-2">
                            <div className="flex justify-between">
                                <span>Delivered Days × Daily Price</span>
                                <span className="font-semibold">
                                    {billing.deliveredCount} × ₹{billing.deliveredCount > 0 ? (billing.deliveredAmount / billing.deliveredCount).toFixed(2) : '0.00'}
                                </span>
                            </div>
                            <div className="border-t border-border my-2"></div>
                            <div className="flex justify-between font-bold text-base">
                                <span>Monthly Bill</span>
                                <span className="text-primary">₹{billing.totalBillAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Validation Status */}
                    {!validation.isValid && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-800 font-semibold">⚠️ Billing Validation Errors:</p>
                            {validation.errors.map((error, index) => (
                                <p key={index} className="text-xs text-red-700 mt-1">• {error}</p>
                            ))}
                        </div>
                    )}

                    {validation.isValid && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-800">
                                ✓ Billing calculation validated successfully
                            </p>
                        </div>
                    )}

                    {/* Action Button */}
                    <Button
                        onClick={handleViewBreakdown}
                        variant="outline"
                        className="w-full"
                    >
                        View Detailed Breakdown
                    </Button>

                    {/* Source of Truth Message */}
                    <div className="text-center pt-4 border-t">
                        <p className="text-xs text-muted-foreground">
                            📅 All amounts are calculated from your <strong>delivery calendar</strong>
                            <br />
                            The calendar is the <strong>single source of truth</strong> for billing
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Daily Breakdown (Optional - can be shown in a separate tab) */}
            {billing.deliveredDays.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Delivered Days Breakdown</CardTitle>
                        <CardDescription>
                            Showing {billing.deliveredDays.length} delivered {billing.deliveredDays.length === 1 ? 'day' : 'days'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {billing.deliveredDays.map((day, index) => (
                                <motion.div
                                    key={day.date}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Check className="w-4 h-4 text-green-700" />
                                        <div>
                                            <div className="font-medium text-sm text-green-900">
                                                {new Date(day.date).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short'
                                                })}
                                            </div>
                                            <div className="text-xs text-green-700">
                                                {day.quantity} × ₹{day.unitPrice.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-green-900">
                                            ₹{day.totalAmount.toFixed(2)}
                                        </div>
                                        {day.deliveryTime && (
                                            <div className="text-xs text-green-600">
                                                {new Date(day.deliveryTime).toLocaleTimeString('en-IN', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default MonthlyBillingSummary;
