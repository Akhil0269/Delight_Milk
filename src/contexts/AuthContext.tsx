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
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-refresh token setup
  const setupTokenRefresh = (session: Session | null) => {
    // Clear existing timer
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }

    if (!session) return;

    // Set up auto-refresh
    const timer = setInterval(async () => {
      console.log('🔄 Auto-refreshing session token...');
      try {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('Token refresh error:', error);
          toast.error('Session expired. Please login again.');
          await signOut();
        } else if (data.session) {
          console.log('✅ Token refreshed successfully');
          setSession(data.session);
          setUser(data.session.user);
          // Persist to localStorage
          persistSession(data.session);
        }
      } catch (err) {
        console.error('Token refresh failed:', err);
      }
    }, TOKEN_REFRESH_INTERVAL);

    setRefreshTimer(timer);
  };

  // Persist session to localStorage
  const persistSession = (session: Session | null) => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
      }));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  };

  // Load persisted session
  const loadPersistedSession = async () => {
    try {
      const persistedData = localStorage.getItem(SESSION_KEY);
      if (persistedData) {
        const data = JSON.parse(persistedData);

        // Check if token is still valid
        if (data.expires_at && data.expires_at * 1000 > Date.now()) {
          console.log('📦 Loading persisted session...');

          // Validate with Supabase
          const { data: { session }, error } = await supabase.auth.getSession();

          if (session && !error) {
            setSession(session);
            setUser(session.user);
            setupTokenRefresh(session);
            return true;
          }
        }

        // Token expired, clear it
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (err) {
      console.error('Error loading persisted session:', err);
      localStorage.removeItem(SESSION_KEY);
    }
    return false;
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription: any;

    const initializeAuth = async () => {
      // Check for development mode
      const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

      if (isDevMode) {
        // Development mode setup
        const devSession = localStorage.getItem('dev_session');
        const devUserData = localStorage.getItem('dev_user');

        if (devSession === 'active' && devUserData) {
          try {
            const devUser = JSON.parse(devUserData);
            const mockUser = {
              id: devUser.id,
              email: devUser.email || `${devUser.phone}@phone.dev`,
              phone: devUser.phone || null,
              user_metadata: {
                full_name: devUser.full_name,
              },
              app_metadata: {},
              aud: 'authenticated',
              created_at: devUser.created_at,
            } as User;

            console.log('✅ Development mode: Loaded user from localStorage');
            if (mounted) {
              setUser(mockUser);
              setSession({ user: mockUser, access_token: 'dev-token' } as Session);
              setLoading(false);
            }
            return;
          } catch (e) {
            console.error('Error parsing dev user:', e);
            // Corrupted session? Clear it so user can login again
            localStorage.removeItem('dev_session');
            localStorage.removeItem('dev_user');
            setLoading(false);
          }
        }

        if (mounted) {
          setLoading(false);
        }
        return;
      }

      // Production mode: Supabase authentication
      console.log('🔐 Initializing Supabase authentication...');

      // Try to load persisted session first
      const hasPersistedSession = await loadPersistedSession();

      if (!hasPersistedSession) {
        // No persisted session, check with Supabase
        try {
          const { data: { session }, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Error getting session:', error);
          } else if (session) {
            console.log('✅ Active Supabase session found');
            if (mounted) {
              setSession(session);
              setUser(session.user);
              persistSession(session);
              setupTokenRefresh(session);
            }
          }
        } catch (err) {
          console.error('Session initialization error:', err);
        }
      }

      // Set up auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('🔔 Auth state changed:', event);

          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
            persistSession(session);

            // Handle specific events
            switch (event) {
              case 'SIGNED_IN':
                console.log('✅ User signed in');
                toast.success('Welcome back!');
                setupTokenRefresh(session);
                break;

              case 'SIGNED_OUT':
                console.log('👋 User signed out');
                if (refreshTimer) clearInterval(refreshTimer);
                break;

              case 'TOKEN_REFRESHED':
                console.log('🔄 Token refreshed');
                break;

              case 'USER_UPDATED':
                console.log('📝 User profile updated');
                break;

              case 'PASSWORD_RECOVERY':
                console.log('🔑 Password recovery initiated');
                toast.info('Check your email for password reset link');
                break;
            }
          }
        }
      );

      authSubscription = subscription;

      if (mounted) {
        setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, []);

  // Sign up with email verification
  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // ✅ CHECK DEVELOPMENT MODE FIRST
      const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

      if (isDevMode) {
        console.log('🔧 Development mode: Skipping Supabase signUp');
        // Return success - Auth.tsx will handle the actual dev mode signup
        return { error: null, needsVerification: false };
      }

      // Production mode: Use Supabase
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

      // Check if email verification is required
      const needsVerification = data.user && !data.session;

      if (needsVerification) {
        toast.success('Please check your email to verify your account!', {
          duration: 5000,
        });
      } else if (data.session) {
        toast.success('Account created successfully!');
        persistSession(data.session);
        setupTokenRefresh(data.session);
      }

      return { error: null, needsVerification };
    } catch (err: any) {
      const error = err as AuthError;
      toast.error(error.message || 'Signup failed');
      return { error };
    }
  };

  // Sign in with email & password
  const signIn = async (email: string, password: string) => {
    try {
      // ✅ CHECK DEVELOPMENT MODE FIRST
      const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

      if (isDevMode) {
        console.log('🔧 Development mode: Skipping Supabase signIn');
        // Return success - Auth.tsx will handle the actual dev mode login
        return { error: null };
      }

      // Production mode: Use Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Provide user-friendly error messages
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email before signing in');
        } else {
          toast.error(error.message);
        }
        return { error };
      }

      if (data.session) {
        toast.success('Signed in successfully!');
        persistSession(data.session);
        setupTokenRefresh(data.session);
      }

      return { error: null };
    } catch (err: any) {
      const error = err as AuthError;
      toast.error(error.message || 'Sign in failed');
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      // Clear local state
      setUser(null);
      setSession(null);

      // Clear persistence
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('dev_user');
      localStorage.removeItem('dev_session');

      // Clear refresh timer
      if (refreshTimer) {
        clearInterval(refreshTimer);
        setRefreshTimer(null);
      }

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Signout error:', error);
        toast.error('Error signing out');
      } else {
        toast.success('Signed out successfully');
      }
    } catch (err) {
      console.error('Signout failed:', err);
      toast.error('Failed to sign out');
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
    } catch (err: any) {
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
    } catch (err: any) {
      const error = err as AuthError;
      toast.error(error.message || 'Profile update failed');
      return { error };
    }
  };

  // Manual session refresh
  const refreshSession = async () => {
    try {
      const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

      if (isDevMode) {
        console.log('🔄 Manual refresh (Dev Mode)');
        const devSession = localStorage.getItem('dev_session');
        const devUserData = localStorage.getItem('dev_user');

        if (devSession === 'active' && devUserData) {
          const devUser = JSON.parse(devUserData);
          const mockUser = {
            id: devUser.id,
            email: devUser.email || `${devUser.phone}@phone.dev`,
            phone: devUser.phone || null,
            user_metadata: { full_name: devUser.full_name },
            app_metadata: {},
            aud: 'authenticated',
            created_at: devUser.created_at,
          } as User;

          setUser(mockUser);
          setSession({ user: mockUser, access_token: 'dev-token' } as Session);
          return;
        }
      }

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Manual refresh error:', error);
        toast.error('Session refresh failed');
        return;
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        persistSession(data.session);
        toast.success('Session refreshed');
      }
    } catch (err) {
      console.error('Refresh failed:', err);
      toast.error('Failed to refresh session');
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
