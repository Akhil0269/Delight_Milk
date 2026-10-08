import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Wallet, Smartphone, Banknote, ShieldCheck, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { useWallet } from "@/hooks/useWallet";
import AddMoneyDialog from "@/components/dashboard/AddMoneyDialog";

const PaymentMethods = () => {
    const navigate = useNavigate();
    const { data: wallet, isLoading: walletLoading } = useWallet();
    const [addMoneyOpen, setAddMoneyOpen] = useState(false);

    const balance = Number(wallet?.balance) || 0;

    return (
        <div className="min-h-screen bg-muted/30">
            <DashboardNavbar />

            {/* Header */}
            <div className="bg-card border-b sticky top-16 md:top-20 z-30">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Payment Methods</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage your payment modes and prepaid balance
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
                {/* Delight Milk Prepaid Wallet */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="border-primary/20 shadow-sm overflow-hidden">
                        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Wallet className="w-5 h-5" />
                                        <span className="font-semibold text-sm uppercase tracking-wider text-white/90">
                                            Delight Milk Wallet
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-bold mt-2">
                                        {walletLoading ? "₹..." : `₹${balance.toFixed(2)}`}
                                    </h2>
                                    <p className="text-xs text-white/80">Available Prepaid Balance</p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setAddMoneyOpen(true)}
                                    className="bg-white text-primary hover:bg-white/90 font-semibold"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Top Up Wallet
                                </Button>
                            </div>
                        </div>
                        <CardContent className="p-4 bg-card text-xs text-muted-foreground flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                Seamless automated billing for daily milk subscriptions
                            </span>
                            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate("/transactions")}>
                                View Ledger
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Other Accepted Payment Options */}
                <div className="space-y-3">
                    <h3 className="text-base font-semibold">Accepted Payment Methods</h3>

                    {/* PhonePe Online Payment */}
                    <Card className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-sm">PhonePe Gateway</h4>
                                        <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">
                                            Instant
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Pay securely via PhonePe (UPI, Credit/Debit Cards & Net Banking)
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                                Active
                            </span>
                        </CardContent>
                    </Card>

                    {/* Cash on Delivery */}
                    <Card className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                                    <Banknote className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-sm">Cash on Delivery (COD)</h4>
                                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                                            Doorstep
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Pay in cash directly to your delivery partner upon receipt
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                                Active
                            </span>
                        </CardContent>
                    </Card>
                </div>

                {/* Security Note */}
                <div className="bg-muted/40 p-4 rounded-xl border flex items-start gap-3 text-xs text-muted-foreground">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-foreground">Secure Payments & Mandates</p>
                        <p className="mt-0.5">
                            All online payments are encrypted and processed through PhonePe gateway. Saved card tokenization and recurring UPI autopay will be enabled when recurring mandates launch.
                        </p>
                    </div>
                </div>
            </div>

            <AddMoneyDialog
                open={addMoneyOpen}
                onOpenChange={setAddMoneyOpen}
            />
        </div>
    );
};

export default PaymentMethods;
