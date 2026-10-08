import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, ArrowLeft, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<"request" | "update">("request");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Only enter password update mode when arrived via genuine Supabase recovery flow
    useEffect(() => {
        const hash = window.location.hash;
        const search = window.location.search;
        const isRecoveryFlow = (hash && hash.includes("type=recovery")) || (search && search.includes("type=recovery"));

        if (isRecoveryFlow) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session) {
                    setMode("update");
                }
            });
        }

        // Listen for PASSWORD_RECOVERY event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY" && session) {
                setMode("update");
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !email.includes("@")) {
            toast.error("Please enter a valid email address");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                toast.error(error.message || "Failed to send reset email");
                return;
            }

            setIsSuccess(true);
            toast.success("Password reset link sent to your email!");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });

            if (error) {
                toast.error(error.message || "Failed to update password");
                return;
            }

            setIsSuccess(true);
            toast.success("Password updated successfully!");
            setTimeout(() => {
                navigate("/dashboard");
            }, 2000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unexpected error occurred";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <Link to="/auth" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Login
                    </Link>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Lock className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">
                        {mode === "update" ? "Set New Password" : "Reset Password"}
                    </CardTitle>
                    <CardDescription>
                        {mode === "update"
                            ? "Enter your new password below to secure your account"
                            : "Enter your registered email and we'll send a password recovery link"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isSuccess ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-4 py-4"
                        >
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-lg font-semibold">
                                {mode === "update" ? "Password Updated!" : "Check Your Inbox"}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {mode === "update"
                                    ? "Your password has been changed successfully. Redirecting you to dashboard..."
                                    : `We've sent a password reset link to ${email}. Click the link in the email to set a new password.`}
                            </p>
                            <Button
                                className="w-full mt-4"
                                onClick={() => navigate(mode === "update" ? "/dashboard" : "/auth")}
                            >
                                {mode === "update" ? "Continue to Dashboard" : "Back to Login"}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </motion.div>
                    ) : mode === "update" ? (
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="new-password">New Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="new-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="At least 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 pr-10"
                                        disabled={loading}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirm Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="confirm-password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Repeat new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="pl-10"
                                        disabled={loading}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Updating Password..." : "Update Password"}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleRequestReset} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reset-email">Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="reset-email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10"
                                        disabled={loading}
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Sending Link..." : "Send Reset Link"}
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={() => setMode("update")}
                                    className="text-xs text-primary hover:underline"
                                >
                                    Already have a recovery token? Enter new password
                                </button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPassword;
