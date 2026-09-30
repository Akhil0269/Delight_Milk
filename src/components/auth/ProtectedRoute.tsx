import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    redirectTo?: string;
}

/**
 * Protected Route Component
 * Redirects unauthenticated users to login
 * Shows loading state while checking auth
 */
export function ProtectedRoute({ children, redirectTo = '/auth' }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const location = useLocation();

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Redirect to auth if not logged in
    if (!user) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // User is authenticated, render children
    return <>{children}</>;
}

/**
 * Public Only Route Component
 * Redirects authenticated users away (e.g., from login page)
 */
export function PublicOnlyRoute({ children, redirectTo = '/dashboard' }: ProtectedRouteProps) {
    const { user, loading } = useAuth();

    // Show loading spinner
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to dashboard if already logged in
    if (user) {
        return <Navigate to={redirectTo} replace />;
    }

    // User is not authenticated, render login/signup page
    return <>{children}</>;
}
