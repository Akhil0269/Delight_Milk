// Admin Auth Page - Login only for authorized admin
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Mail, Lock } from "lucide-react";

const AdminAuth = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    // HARDCODED ADMIN CREDENTIALS
    const AUTHORIZED_ADMIN_EMAIL = "yaswanthvenkata245@gmail.com";
    const ADMIN_PASSWORD = "Yashu@524230";

    // Pre-create admin account in localStorage on component mount
    useEffect(() => {
        const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

        if (isDevMode) {
            const storedAdmins = JSON.parse(localStorage.getItem('dev_admin_users') || '{}');
            const userKey = AUTHORIZED_ADMIN_EMAIL.toLowerCase();

            // Create admin account if it doesn't exist
            if (!storedAdmins[userKey]) {
                console.log("🔧 Pre-creating admin account...");

                const adminAccount = {
                    id: 'admin_001',
                    email: AUTHORIZED_ADMIN_EMAIL,
                    password: ADMIN_PASSWORD,
                    full_name: 'Admin User',
                    created_at: new Date().toISOString(),
                    role: 'admin',
                };

                storedAdmins[userKey] = adminAccount;
                localStorage.setItem('dev_admin_users', JSON.stringify(storedAdmins));
                console.log("✅ Admin account pre-created successfully");
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Check if email is authorized for admin access
            if (formData.email.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
                toast.error("Access denied. You are not authorized to access the admin panel.");
                setLoading(false);
                return;
            }

            // ✅ CHECK DEVELOPMENT MODE FIRST
            const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

            if (isDevMode) {
                console.log("🔧 Admin Development mode: Using localStorage");

                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Development mode LOGIN
                const storedAdmins = JSON.parse(localStorage.getItem('dev_admin_users') || '{}');
                const userKey = formData.email.toLowerCase();

                // Check if admin exists and password matches
                if (storedAdmins[userKey] && storedAdmins[userKey].password === formData.password) {
                    // Admin exists and password matches
                    const devAdmin = {
                        id: storedAdmins[userKey].id,
                        email: formData.email,
                        full_name: storedAdmins[userKey].full_name,
                        created_at: storedAdmins[userKey].created_at,
                        role: 'admin',
                    };

                    localStorage.setItem('dev_user', JSON.stringify(devAdmin));
                    localStorage.setItem('dev_session', 'active');
                    localStorage.setItem('dev_admin_session', 'active');

                    toast.success("Welcome back, Admin!", {
                        description: "Redirecting to admin panel..."
                    });

                    navigate("/admin");
                } else {
                    toast.error("Invalid password. Please try again.");
                }

                setLoading(false);
                return;
            }

            // ✅ PRODUCTION MODE: Real Supabase authentication
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (error) throw error;

            // Double check email matches authorized admin
            if (data.user.email?.toLowerCase() !== AUTHORIZED_ADMIN_EMAIL.toLowerCase()) {
                await supabase.auth.signOut();
                toast.error("Access denied. You are not authorized to access the admin panel.");
                return;
            }

            toast.success("Welcome back, Admin!");
            navigate("/admin");
        } catch (error: any) {
            console.error("Admin auth error:", error);

            // ✅ FALLBACK: If Supabase fails, use development mode
            if (error.message && (
                error.message.includes("fetch") ||
                error.message.includes("Failed to fetch") ||
                error.message.includes("network") ||
                error.message.includes("Invalid login credentials")
            )) {
                console.log("🔧 Supabase failed, falling back to admin development mode");

                // Check localStorage for admin
                const storedAdmins = JSON.parse(localStorage.getItem('dev_admin_users') || '{}');
                const userKey = formData.email.toLowerCase();

                if (storedAdmins[userKey] && storedAdmins[userKey].password === formData.password) {
                    const devAdmin = {
                        id: storedAdmins[userKey].id,
                        email: formData.email,
                        full_name: storedAdmins[userKey].full_name,
                        created_at: storedAdmins[userKey].created_at,
                        role: 'admin',
                    };

                    localStorage.setItem('dev_user', JSON.stringify(devAdmin));
                    localStorage.setItem('dev_session', 'active');
                    localStorage.setItem('dev_admin_session', 'active');

                    toast.warning("Admin logged in (Development Mode)", {
                        description: "Supabase unavailable, using offline mode"
                    });

                    navigate("/admin");
                } else {
                    toast.error("Invalid email or password");
                }
            } else {
                toast.error(error.message || "Authentication failed");
            }
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
                        <Label htmlFor="email">Email</Label>
                        <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="admin@dailydrop.com"
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
                        {loading ? "Signing in..." : "Sign In"}
                    </Button>
                </form>

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-xs text-center text-muted-foreground">
                        🔒 Admin access is restricted to authorized personnel only
                    </p>
                    <p className="text-xs text-center text-muted-foreground mt-1">
                        Contact system administrator for access
                    </p>
                </div>

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
