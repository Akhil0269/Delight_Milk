import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { calculateMonthlyBilling, MonthlyBilling } from '@/utils/billing';

/**
 * Hook to calculate monthly billing from calendar data
 * Works in both dev mode (localStorage) and production mode (Supabase)
 */
export function useMonthlyBilling(
    year: number,
    month: number, // 0-11
    includeGST: boolean = false
): {
    billing: MonthlyBilling | null;
    isLoading: boolean;
    error: Error | null;
} {
    const { user } = useAuth();
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';

    const billing = useMemo(() => {
        if (!user?.id) return null;

        try {
            if (isDevMode) {
                // Development mode: Get from localStorage
                const calendarKey = 'dev_delivery_calendar';
                const calendarData = localStorage.getItem(calendarKey);
                const allCalendar = calendarData ? JSON.parse(calendarData) : [];

                // Filter for this user
                const userCalendar = allCalendar.filter(
                    (entry: any) => entry.user_id === user.id
                );

                return calculateMonthlyBilling(userCalendar, month, year, includeGST);
            } else {
                // Production mode: Would fetch from Supabase
                // This would be implemented with useQuery
                return null;
            }
        } catch (error) {
            console.error('Error calculating billing:', error);
            return null;
        }
    }, [user?.id, year, month, includeGST, isDevMode]);

    return {
        billing,
        isLoading: false,
        error: null,
    };
}

/**
 * Hook to get current month billing
 */
export function useCurrentMonthBilling(includeGST: boolean = false) {
    const now = new Date();
    return useMonthlyBilling(now.getFullYear(), now.getMonth(), includeGST);
}

/**
 * Hook to get billing for a specific month
 */
export function useBillingForMonth(monthDate: Date, includeGST: boolean = false) {
    return useMonthlyBilling(monthDate.getFullYear(), monthDate.getMonth(), includeGST);
}
