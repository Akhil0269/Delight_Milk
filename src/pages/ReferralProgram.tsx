import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Gift,
    Share2,
    Copy,
    Users,
    IndianRupee,
    Trophy,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Referral {
    id: string;
    name: string;
    phone: string;
    status: "pending" | "completed";
    reward: number;
    date: string;
}

const ReferralProgram = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Real user referral code derived from user session
    const referralCode = user?.id
        ? `DM${user.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`
        : "DELIGHT50";

    const [referrals] = useState<Referral[]>([]);

    const totalEarnings = referrals
        .filter(r => r.status === "completed")
        .reduce((sum, r) => sum + r.reward, 0);
    const pendingEarnings = referrals
        .filter(r => r.status === "pending")
        .reduce((sum, r) => sum + r.reward, 0);

    const handleCopyCode = () => {
        navigator.clipboard.writeText(referralCode);
        toast.success("Referral code copied to clipboard!");
    };

    const handleShare = async () => {
        const shareText = `Hey! Join Delight Milk for fresh milk delivery. Use my code ${referralCode} and get ₹50 off on your first order! Download now: https://delightmilk.app`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Delight Milk Referral",
                    text: shareText,
                });
            } catch (error) {
                // User cancelled share
            }
        } else {
            navigator.clipboard.writeText(shareText);
            toast.success("Referral message copied to clipboard!");
        }
    };

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary via-primary/90 to-accent text-white">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/dashboard")}
                            className="text-white hover:bg-white/20"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Gift className="w-6 h-6" />
                                Refer & Earn
                            </h1>
                            <p className="text-white/80 text-sm">Share the love, earn rewards!</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8 space-y-6">
                {/* Earnings Summary */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid md:grid-cols-3 gap-4"
                >
                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/80 text-sm mb-1">Total Earned</p>
                                    <div className="flex items-center gap-1">
                                        <IndianRupee className="w-5 h-5" />
                                        <p className="text-3xl font-bold">{totalEarnings}</p>
                                    </div>
                                </div>
                                <Trophy className="w-12 h-12 text-white/30" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/80 text-sm mb-1">Pending</p>
                                    <div className="flex items-center gap-1">
                                        <IndianRupee className="w-5 h-5" />
                                        <p className="text-3xl font-bold">{pendingEarnings}</p>
                                    </div>
                                </div>
                                <Sparkles className="w-12 h-12 text-white/30" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/80 text-sm mb-1">Total Referrals</p>
                                    <p className="text-3xl font-bold">{referrals.length}</p>
                                </div>
                                <Users className="w-12 h-12 text-white/30" />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Referral Code Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-2 border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gift className="w-5 h-5 text-primary" />
                                Your Referral Code
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    value={referralCode}
                                    readOnly
                                    className="text-lg font-mono font-bold text-center"
                                />
                                <Button onClick={handleCopyCode} variant="outline">
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                <h4 className="font-semibold flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    How it works
                                </h4>
                                <ol className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex gap-2">
                                        <span className="font-bold text-primary">1.</span>
                                        <span>Share your referral code with friends & family</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold text-primary">2.</span>
                                        <span>They sign up using your code and get ₹50 off</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold text-primary">3.</span>
                                        <span>When they complete their first order, you earn ₹50</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-bold text-primary">4.</span>
                                        <span>Rewards are added to your wallet instantly!</span>
                                    </li>
                                </ol>
                            </div>

                            <Button onClick={handleShare} className="w-full" size="lg">
                                <Share2 className="w-4 h-4 mr-2" />
                                Share Now
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Progress to Next Milestone */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary" />
                                Next Milestone
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Refer 3 more friends to unlock bonus ₹100</span>
                                <span className="font-semibold">{referrals.length}/5</span>
                            </div>
                            <Progress value={(referrals.length / 5) * 100} className="h-3" />
                            <p className="text-xs text-muted-foreground">
                                🎉 Complete 5 successful referrals to earn a bonus reward!
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Referral History */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle>Referral History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {referrals.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="text-muted-foreground">No referrals yet</p>
                                    <p className="text-sm text-muted-foreground">Start sharing your code to earn rewards!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {referrals.map((referral, index) => (
                                        <motion.div
                                            key={referral.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.4 + index * 0.05 }}
                                            className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Users className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{referral.name}</p>
                                                    <p className="text-sm text-muted-foreground">{referral.phone}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center gap-1 font-semibold text-green-600">
                                                    <IndianRupee className="w-4 h-4" />
                                                    {referral.reward}
                                                </div>
                                                <Badge
                                                    variant={referral.status === "completed" ? "default" : "secondary"}
                                                    className="mt-1"
                                                >
                                                    {referral.status === "completed" ? "Earned" : "Pending"}
                                                </Badge>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Terms & Conditions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Terms & Conditions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li>• Referral rewards are credited only after the referred user completes their first order</li>
                                <li>• Both referrer and referee must be unique users with verified phone numbers</li>
                                <li>• Rewards cannot be transferred or exchanged for cash</li>
                                <li>• Delight Milk reserves the right to modify or cancel the program at any time</li>
                                <li>• Fraudulent activities will result in account suspension</li>
                            </ul>
                        </CardContent>
                    </Card>
                </motion.div>
            </main>
        </div>
    );
};

export default ReferralProgram;
