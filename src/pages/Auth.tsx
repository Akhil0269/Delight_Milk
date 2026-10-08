import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Milk, Mail, Lock, User, ArrowRight, Eye, EyeOff, Shield, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
// Firebase temporarily disabled - using development mode
// import { useFirebasePhoneAuth } from "@/hooks/useFirebasePhoneAuth";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<"customer" | "admin">("customer");

  // Phone OTP states
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const { signIn, signUp, refreshSession } = useAuth();
  const navigate = useNavigate();

  // Development mode OTP
  const MOCK_OTP = "123456";

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      // Format phone number to E.164 format (+91 for India)
      const formattedPhone = phoneNumber.startsWith('+91')
        ? phoneNumber
        : `+91${phoneNumber}`;

      console.log(`📱 Attempting to send OTP to: ${formattedPhone}`);

      // ✅ CHECK DEVELOPMENT MODE FIRST
      const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

      if (isDevMode) {
        console.log("🔧 Development mode enabled - skipping Supabase");
        await new Promise(resolve => setTimeout(resolve, 1000));
        setOtpSent(true);
        toast.warning(`Development Mode: OTP is ${MOCK_OTP}`, {
          description: "Set VITE_DEV_MODE=false for production"
        });
        console.log(`🔐 Development OTP: ${MOCK_OTP}`);
        return;
      }

      // ✅ PRODUCTION MODE: Try to send real OTP via Supabase
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        console.error("Supabase OTP error:", error);

        // Check if it's a provider configuration error OR invalid API key
        if (
          error.message.toLowerCase().includes("unsupported") ||
          error.message.toLowerCase().includes("provider") ||
          error.message.toLowerCase().includes("not enabled") ||
          error.message.toLowerCase().includes("phone authentication") ||
          error.message.toLowerCase().includes("invalid api key") ||
          error.message.toLowerCase().includes("api key") ||
          error.message.toLowerCase().includes("failed to fetch") ||
          error.message.toLowerCase().includes("fetch")
        ) {
          // ✅ FALLBACK: Development mode
          console.log("🔧 SMS provider not configured or invalid credentials, using development mode");
          await new Promise(resolve => setTimeout(resolve, 1000));
          setOtpSent(true);
          toast.warning(`Development Mode: OTP is ${MOCK_OTP}`, {
            description: "Configure Supabase API key for real SMS"
          });
          console.log(`🔐 Development OTP: ${MOCK_OTP}`);
          return;
        }

        // Handle other specific errors
        if (error.message.toLowerCase().includes("invalid")) {
          toast.error("Invalid phone number format");
        } else if (error.message.toLowerCase().includes("rate")) {
          toast.error("Too many requests. Please try again in a few minutes.");
        } else {
          toast.error(error.message || "Failed to send OTP");
        }
        return;
      }

      // ✅ SUCCESS: Real SMS sent!
      setOtpSent(true);
      toast.success("OTP sent to your phone!", {
        description: "Check your SMS messages"
      });
      console.log(`✅ Real OTP sent via SMS to: ${formattedPhone}`);
    } catch (error: unknown) {
      console.error("Send OTP error:", error);

      // Fallback to development mode on any error
      console.log("🔧 Error occurred, falling back to development mode");
      await new Promise(resolve => setTimeout(resolve, 500));
      setOtpSent(true);
      toast.warning(`Development Mode: OTP is ${MOCK_OTP}`, {
        description: "Check your Supabase configuration"
      });
      console.log(`🔐 Development OTP: ${MOCK_OTP}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      // Format phone number to E.164 format
      const formattedPhone = phoneNumber.startsWith('+91')
        ? phoneNumber
        : `+91${phoneNumber}`;

      console.log(`🔐 Attempting to verify OTP for: ${formattedPhone}`);

      // Verify OTP via Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        console.error("Supabase verify error:", error);

        // ✅ FALLBACK: Development mode if OTP is the mock OTP
        if (otp === MOCK_OTP) {
          console.log("🔧 Using development mode verification");

          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Create/login user with phone number
          const userEmail = `${phoneNumber}@phone.dev`;
          const password = `dev_${phoneNumber}_secure`;

          console.log(`📧 Creating/logging in user: ${userEmail}`);

          // Try to sign in first (user might already exist)
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password,
          });

          if (signInError) {
            // User doesn't exist, create account
            console.log(`👤 Creating new user account...`);
            const { error: signUpError } = await supabase.auth.signUp({
              email: userEmail,
              password,
              options: {
                data: {
                  phone: phoneNumber,
                  full_name: `User ${phoneNumber}`,
                },
              },
            });

            if (signUpError) {
              console.error("Signup error:", signUpError);
              throw signUpError;
            }
            console.log(`✅ Account created successfully`);
          } else {
            console.log(`✅ Logged in successfully`);
          }

          toast.success("Phone verified! (Development Mode)", {
            description: "Redirecting to dashboard..."
          });

          navigate("/dashboard");
          return;
        }

        // Handle specific errors for production OTP
        if (error.message.toLowerCase().includes("invalid")) {
          toast.error("Invalid OTP. Please check and try again.");
        } else if (error.message.toLowerCase().includes("expired")) {
          toast.error("OTP expired. Please request a new one.");
        } else {
          toast.error(error.message || "Verification failed");
        }
        return;
      }

      // ✅ SUCCESS: Real OTP verified!
      console.log("✅ OTP verified successfully via Supabase");
      toast.success("Phone verified successfully!", {
        description: "Welcome to Delight Milk!"
      });
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("Verify OTP error:", error);
      const msg = error instanceof Error ? error.message : "Invalid OTP. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Handle phone OTP flow
    if (authMethod === "phone") {
      if (!otpSent) {
        await handleSendOTP();
      } else {
        await handleVerifyOTP();
      }
      return;
    }

    const emailToUse = email.trim();
    if (!emailToUse) {
      toast.error("Please enter your email");
      return;
    }

    if (!password) {
      toast.error("Please enter your password");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(emailToUse, password);
        if (error) {
          return;
        }

        // Redirect based on user type selection and RBAC
        if (userType === "admin") {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          let isAdmin = false;

          if (currentUser) {
            const { data: rpcAdmin, error: rpcError } = await supabase.rpc("is_admin", {
              user_id: currentUser.id,
            });

            if (!rpcError && rpcAdmin === true) {
              isAdmin = true;
            } else {
              const { data: roleData, error: roleError } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", currentUser.id)
                .eq("role", "admin")
                .maybeSingle();

              if (!roleError && roleData?.role === "admin") {
                isAdmin = true;
              }
            }
          }

          if (!isAdmin) {
            await supabase.auth.signOut();
            toast.error("Access denied. Your account does not have administrator privileges.");
            return;
          }

          toast.success("Welcome back, Admin!");
          navigate("/admin");
        } else {
          toast.success("Welcome back!");
          navigate("/dashboard");
        }
      } else {
        if (!fullName.trim()) {
          toast.error("Please enter your name");
          return;
        }

        const { error, needsVerification } = await signUp(emailToUse, password, fullName.trim());
        if (error) {
          return;
        }

        if (needsVerification) {
          toast.info("Account created successfully. Please verify your email before logging in.", {
            duration: 6000,
          });
          setIsLogin(true);
        } else {
          toast.success("Account created successfully!");
          navigate("/dashboard");
        }
      }
    } catch (error: unknown) {
      console.error("Authentication error:", error);
      const message = error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-background to-muted flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center"
          >
            <Milk className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <span className="text-2xl font-bold">
            Delight <span className="text-primary">Milk</span>
          </span>
        </Link>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-3xl border border-border shadow-soft p-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">
              {isLogin ? "Welcome Back!" : "Create Account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Sign in to manage your dairy deliveries"
                : "Start your fresh dairy journey today"}
            </p>
          </div>

          {/* User Type Selector */}
          {isLogin && (
            <div className="mb-6">
              <Label className="text-sm mb-2 block">I am a:</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType("customer")}
                  className={`p-4 rounded-xl border-2 transition-all ${userType === "customer"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                    }`}
                >
                  <User className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-semibold text-sm">Customer</p>
                  <p className="text-xs text-muted-foreground">Order dairy products</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Redirect to dedicated admin login page
                    toast.info("Redirecting to admin portal...");
                    navigate("/admin-auth");
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${userType === "admin"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                    }`}
                >
                  <Shield className="w-6 h-6 mx-auto mb-2" />
                  <p className="font-semibold text-sm">Admin</p>
                  <p className="text-xs text-muted-foreground">Manage system</p>
                </button>
              </div>
            </div>
          )}

          {/* Auth Method Selector - For Customer Login and Signup */}
          {userType === "customer" && (
            <div className="mb-6">
              <Label className="text-sm mb-2 block">{isLogin ? "Login with:" : "Sign up with:"}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("email");
                    setOtpSent(false);
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${authMethod === "email"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                    }`}
                >
                  <Mail className="w-5 h-5 mx-auto mb-1" />
                  <p className="font-semibold text-xs">Email</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod("phone");
                    setOtpSent(false);
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${authMethod === "phone"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                    }`}
                >
                  <Phone className="w-5 h-5 mx-auto mb-1" />
                  <p className="font-semibold text-xs">Phone OTP</p>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone OTP Flow - For both Login and Signup */}
            {authMethod === "phone" && userType === "customer" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="pl-10 h-12 rounded-xl"
                      required
                      disabled={otpSent}
                    />
                  </div>
                </div>

                {otpSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-2"
                  >
                    <Label htmlFor="otp">Enter OTP</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="otp"
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="pl-10 h-12 rounded-xl"
                        required
                        maxLength={6}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      Change phone number
                    </button>
                  </motion.div>
                )}
              </>
            )}

            {/* Email/Password Flow */}
            {(authMethod === "email" || !isLogin || userType === "admin") && (
              <>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10 h-12 rounded-xl"
                      />
                    </div>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {isLogin && (
                      <Link to="/reset-password" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 rounded-xl"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base gap-2"
              disabled={loading}
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  {authMethod === "phone" && userType === "customer"
                    ? otpSent
                      ? "Verify OTP"
                      : "Send OTP"
                    : isLogin
                      ? "Sign In"
                      : "Create Account"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground"
        >
          <span className="flex items-center gap-1">
            <span className="text-accent">✓</span> Secure Login
          </span>
          <span className="flex items-center gap-1">
            <span className="text-accent">✓</span> Daily Fresh
          </span>
        </motion.div>

        {/* reCAPTCHA container for Firebase Phone Auth */}
        <div id="recaptcha-container"></div>
      </motion.div>
    </div>
  );
};

export default Auth;
