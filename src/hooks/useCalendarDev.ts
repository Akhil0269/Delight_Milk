import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface CalendarDay {
    id: string;
    user_id: string;
    delivery_date: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_amount: number;
    status: "scheduled" | "delivered" | "missed" | "paused";
    delivery_time?: string;
    delivery_partner_id?: string;
    delivery_proof_url?: string;
    notes?: string;
    is_locked: boolean;
    created_at: string;
}

// Development mode calendar hooks
export function useCalendarDev(year: number, month: number) {
    const { user } = useAuth();
    const [calendar, setCalendar] = useState<CalendarDay[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) {
            setIsLoading(false);
            return;
        }

        loadCalendar();
        setIsLoading(false);
    }, [user?.id, year, month]);

    const loadCalendar = () => {
        const calendarKey = 'dev_delivery_calendar';
        const calendarData = localStorage.getItem(calendarKey);
        const allCalendar = calendarData ? JSON.parse(calendarData) : [];

        // Filter by user and month
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        const userCalendar = allCalendar.filter((day: CalendarDay) => {
            const dayDate = new Date(day.delivery_date);
            return (
                day.user_id === user.id &&
                dayDate >= monthStart &&
                dayDate <= monthEnd
            );
        });

        setCalendar(userCalendar);
    };

    const markDelivered = (date: string) => {
        const calendarKey = 'dev_delivery_calendar';
        const calendarData = localStorage.getItem(calendarKey);
        const allCalendar = calendarData ? JSON.parse(calendarData) : [];

        const updated = allCalendar.map((day: CalendarDay) => {
            if (day.user_id === user.id && day.delivery_date === date) {
                return {
                    ...day,
                    status: 'delivered',
                    delivery_time: new Date().toISOString(),
                };
            }
            return day;
        });

        localStorage.setItem(calendarKey, JSON.stringify(updated));
        loadCalendar();
        window.dispatchEvent(new Event('storage'));
    };

    const markMissed = (date: string) => {
        const calendarKey = 'dev_delivery_calendar';
        const calendarData = localStorage.getItem(calendarKey);
        const allCalendar = calendarData ? JSON.parse(calendarData) : [];

        const updated = allCalendar.map((day: CalendarDay) => {
            if (day.user_id === user.id && day.delivery_date === date) {
                return { ...day, status: 'missed' };
            }
            return day;
        });

        localStorage.setItem(calendarKey, JSON.stringify(updated));
        loadCalendar();
        window.dispatchEvent(new Event('storage'));
    };

    const pauseDay = (date: string) => {
        const calendarKey = 'dev_delivery_calendar';
        const calendarData = localStorage.getItem(calendarKey);
        const allCalendar = calendarData ? JSON.parse(calendarData) : [];

        const updated = allCalendar.map((day: CalendarDay) => {
            if (day.user_id === user.id && day.delivery_date === date) {
                return { ...day, status: 'paused' };
            }
            return day;
        });

        localStorage.setItem(calendarKey, JSON.stringify(updated));
        loadCalendar();
        window.dispatchEvent(new Event('storage'));
    };

    return {
        data: calendar,
        isLoading,
        markDelivered,
        markMissed,
        pauseDay,
        refresh: loadCalendar,
    };
}

// Initialize sample calendar data
export function initializeSampleCalendar(userId: string) {
    const calendarKey = 'dev_delivery_calendar';
    const calendarData = localStorage.getItem(calendarKey);
    const allCalendar = calendarData ? JSON.parse(calendarData) : [];

    // Check if user already has calendar
    const userHasCalendar = allCalendar.some((day: CalendarDay) => day.user_id === userId);

    if (!userHasCalendar) {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        // Create sample calendar for current month
        const sampleCalendar: CalendarDay[] = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];

            // Determine status based on date
            let status: CalendarDay['status'] = 'scheduled';
            if (day < today.getDate() - 7) {
                status = 'delivered';
            } else if (day >= today.getDate() - 7 && day < today.getDate() - 3) {
                status = day % 3 === 0 ? 'missed' : 'delivered';
            } else if (day >= today.getDate() - 3 && day < today.getDate()) {
                status = day % 5 === 0 ? 'paused' : 'delivered';
            }

            sampleCalendar.push({
                id: `cal_${userId}_${dateStr}`,
                user_id: userId,
                delivery_date: dateStr,
                product_id: 'prod_milk_1',
                product_name: 'Full Cream Milk',
                quantity: 1,
                unit_price: 60,
                total_amount: 60,
                status,
                delivery_time: status === 'delivered' ? new Date(year, month, day, 6, 30).toISOString() : undefined,
                is_locked: day < today.getDate() - 30, // Lock previous month
                created_at: new Date().toISOString(),
            });
        }

        allCalendar.push(...sampleCalendar);
        localStorage.setItem(calendarKey, JSON.stringify(allCalendar));
    }
}

// Get delivery stats for a month
export function getMonthlyStats(userId: string, year: number, month: number) {
    const calendarKey = 'dev_delivery_calendar';
    const calendarData = localStorage.getItem(calendarKey);
    const allCalendar = calendarData ? JSON.parse(calendarData) : [];

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const monthCalendar = allCalendar.filter((day: CalendarDay) => {
        const dayDate = new Date(day.delivery_date);
        return (
            day.user_id === userId &&
            dayDate >= monthStart &&
            dayDate <= monthEnd
        );
    });

    return {
        total: monthCalendar.length,
        delivered: monthCalendar.filter((d: CalendarDay) => d.status === 'delivered').length,
        missed: monthCalendar.filter((d: CalendarDay) => d.status === 'missed').length,
        paused: monthCalendar.filter((d: CalendarDay) => d.status === 'paused').length,
        scheduled: monthCalendar.filter((d: CalendarDay) => d.status === 'scheduled').length,
        totalAmount: monthCalendar
            .filter((d: CalendarDay) => d.status === 'delivered')
            .reduce((sum, d) => sum + d.total_amount, 0),
    };
}
