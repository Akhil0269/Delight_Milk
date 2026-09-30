/**
 * Update Calendar Prices to use Pricing System
 * 
 * Run this to refresh all calendar entries with prices from the pricing system
 */

import { initializeDevPricing, getPriceForDate, getDevPrices } from './pricing';

export function updateCalendarPrices(userId?: string): {
    updated: number;
    message: string;
} {
    // Initialize pricing if needed
    initializeDevPricing();

    const calendarKey = 'dev_delivery_calendar';
    const calendarData = localStorage.getItem(calendarKey);

    if (!calendarData) {
        return { updated: 0, message: 'No calendar data found' };
    }

    const allCalendar = JSON.parse(calendarData);
    const allPrices = getDevPrices();

    let updatedCount = 0;

    // Update each calendar entry with correct price
    const updatedCalendar = allCalendar.map((entry: any) => {
        // Skip if filtering by user and this isn't the user
        if (userId && entry.user_id !== userId) {
            return entry;
        }

        // Determine if user has subscription (assume yes for demo)
        const hasSubscription = entry.subscription_id && entry.subscription_id !== 'none';

        // Get the correct price for this date
        const correctPrice = getPriceForDate(
            entry.product_id,
            entry.delivery_date,
            hasSubscription,
            allPrices
        );

        // Only update future and upcoming entries (don't modify delivered/missed/paused)
        if (entry.status === 'upcoming' || new Date(entry.delivery_date) > new Date()) {
            if (entry.price_per_unit !== correctPrice) {
                updatedCount++;
                return {
                    ...entry,
                    price_per_unit: correctPrice,
                    updated_at: new Date().toISOString(),
                };
            }
        }

        return entry;
    });

    // Save updated calendar
    localStorage.setItem(calendarKey, JSON.stringify(updatedCalendar));

    // Trigger storage event to update UI
    window.dispatchEvent(new Event('storage'));

    return {
        updated: updatedCount,
        message: `Updated ${updatedCount} calendar entries with pricing system prices`
    };
}

/**
 * Clear and regenerate calendar with new prices
 * WARNING: This will delete existing calendar data!
 */
export function regenerateCalendar(userId: string): void {
    const calendarKey = 'dev_delivery_calendar';
    const calendarData = localStorage.getItem(calendarKey);
    const allCalendar = calendarData ? JSON.parse(calendarData) : [];

    // Remove only this user's calendar
    const otherUsersCalendar = allCalendar.filter((entry: any) => entry.user_id !== userId);
    localStorage.setItem(calendarKey, JSON.stringify(otherUsersCalendar));

    // Will be regenerated on next page load with new prices
    window.location.reload();
}
