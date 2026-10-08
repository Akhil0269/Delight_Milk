import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null; needsVerification?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (data: { full_name?: string; phone?: string }) => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session persistence keys
const SESSION_KEY = 'sb-auth-session';
const TOKEN_REFRESH_INTERVAL = 55 * 60 * 1000; // 55 minutes (tokens expire in 60)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Initial session load from Supabase client
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session initialization error:', error);
        } else if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
      } catch (err) {
        console.error('Session get error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 2. Listen to all auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (mounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign up with email and password
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      // Check if email verification is required (session will be null if confirmation is pending)
      const needsVerification = data.user && !data.session;

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }

      return { error: null, needsVerification };
    } catch (err: unknown) {
      const error = err as AuthError;
      toast.error(error.message || 'Signup failed');
      return { error };
    }
  };

  // Sign in with email & password
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let userMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Invalid email or password';
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Please verify your email before signing in';
        }
        toast.error(userMessage);
        return { error };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
      }

      return { error: null };
    } catch (err: unknown) {
      const error = err as AuthError;
      toast.error(error.message || 'Sign in failed');
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setUser(null);
      setSession(null);

      // Clean up any lingering legacy storage keys
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('dev_user');
      localStorage.removeItem('dev_session');
      localStorage.removeItem('dev_admin_session');
      localStorage.removeItem('dev_admin_users');
      localStorage.removeItem('dev_email_users');

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Signout error:', error);
      }
    } catch (err) {
      console.error('Signout failed:', err);
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Password reset email sent! Check your inbox.');
      return { error: null };
    } catch (err: unknown) {
      const error = err as AuthError;
      toast.error(error.message || 'Password reset failed');
      return { error };
    }
  };

  // Update user profile
  const updateProfile = async (data: { full_name?: string; phone?: string }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data,
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success('Profile updated successfully!');
      return { error: null };
    } catch (err: unknown) {
      const error = err as AuthError;
      toast.error(error.message || 'Profile update failed');
      return { error };
    }
  };

  // Synchronize active session state
  const refreshSession = async () => {
    try {
      const { data: { session: activeSession }, error } = await supabase.auth.getSession();
      if (!error && activeSession) {
        setSession(activeSession);
        setUser(activeSession.user);
      }
    } catch (err) {
      console.error('Refresh session error:', err);
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
