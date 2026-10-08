import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AdminAuth = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const { user, loading: authLoading, refreshSession } = useAuth();

    // If an authenticated admin visits /admin-auth, seamlessly direct them to /admin
    useEffect(() => {
        if (authLoading) return;
        if (user) {
            const checkExistingAdmin = async () => {
                const { data: rpcAdmin } = await supabase.rpc("is_admin", { user_id: user.id });
                if (rpcAdmin === true) {
                    navigate("/admin", { replace: true });
                }
            };
            checkExistingAdmin();
        }
    }, [user, authLoading, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const emailToUse = formData.email.trim();

        try {
            // 1. Authenticate with Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password: formData.password,
            });

            if (error) throw error;

            if (!data.user) {
                throw new Error("Authentication failed: No user session returned.");
            }

            // 2. Check if account is suspended/blocked
            const { data: profileData } = await supabase
                .from("profiles")
                .select("is_blocked")
                .eq("user_id", data.user.id)
                .maybeSingle();

            if (profileData?.is_blocked) {
                await supabase.auth.signOut();
                toast.error("Your account has been suspended or blocked.");
                return;
            }

            // 3. Real admin role verification via Supabase RBAC
            let isAdmin = false;

            const { data: rpcAdmin, error: rpcError } = await supabase.rpc("is_admin", {
                user_id: data.user.id,
            });

            if (!rpcError && rpcAdmin === true) {
                isAdmin = true;
            } else {
                const { data: roleData, error: roleError } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", data.user.id)
                    .eq("role", "admin")
                    .maybeSingle();

                if (!roleError && roleData?.role === "admin") {
                    isAdmin = true;
                }
            }

            if (!isAdmin) {
                await supabase.auth.signOut();
                toast.error("Access denied. Your account does not have administrator privileges.");
                return;
            }

            await refreshSession();
            toast.success("Welcome back, Administrator!");
            navigate("/admin", { replace: true });
        } catch (error: unknown) {
            console.error("Admin authentication error:", error);
            const message = error instanceof Error ? error.message : "Invalid credentials or authentication failed.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-accent/20 flex items-center justify-center p-4">
            <Card className="w-full max-w-md p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold">Admin Portal</h1>
                    <p className="text-muted-foreground mt-2">
                        Sign in to access admin panel
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="email">Admin Email</Label>
                        <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@delightmilk.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="pl-10"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="password">Password</Label>
                        <div className="relative mt-1">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="pl-10"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In to Admin Portal"}
                    </Button>
                </form>

                {/* Back to Home */}
                <div className="mt-4 text-center">
                    <button
                        type="button"
                        onClick={() => navigate("/")}
                        className="text-sm text-muted-foreground hover:text-primary"
                    >
                        ← Back to Home
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default AdminAuth;
