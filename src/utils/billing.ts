/**
 * Calendar-Based Billing System
 * 
 * Core Principle: The calendar is the SINGLE SOURCE OF TRUTH for billing
 * 
 * Rules:
 * 1. Charge ONLY for Delivered (green) dates
 * 2. Daily amount = product price × quantity (stored per day)
 * 3. Monthly bill = sum of all delivered days
 * 4. Paused and missed days = ₹0 (NOT charged)
 * 5. Prices are LOCKED per day (no retroactive changes)
 */

export interface DailyBillingEntry {
    date: string;
    productName: string;
    quantity: number;
    unitPrice: number; // LOCKED price for this specific day
    totalAmount: number; // quantity × unitPrice
    status: 'delivered' | 'missed' | 'paused' | 'upcoming';
    deliveryTime?: string;
}

export interface MonthlyBilling {
    month: string; // "2026-01"
    year: number;
    monthName: string; // "January 2026"

    // Delivered days (charged)
    deliveredDays: DailyBillingEntry[];
    deliveredCount: number;
    deliveredAmount: number;

    // Non-charged days
    missedDays: DailyBillingEntry[];
    missedCount: number;

    pausedDays: DailyBillingEntry[];
    pausedCount: number;

    upcomingDays: DailyBillingEntry[];
    upcomingCount: number;

    // Monthly totals
    totalScheduledDays: number;
    totalBillAmount: number; // ONLY delivered days

    // Breakdown
    subtotal: number;
    gst?: number; // Optional GST
    grandTotal: number;
}

/**
 * Calculate billing for a single day
 * Daily amount = product price × quantity
 */
export function calculateDailyAmount(
    quantity: number,
    unitPrice: number
): number {
    return quantity * unitPrice;
}

/**
 * Calculate monthly billing from calendar data
 * This is the CORE billing function - Calendar as Source of Truth
 */
export function calculateMonthlyBilling(
    calendarData: any[], // Array of calendar entries
    month: number, // 0-11
    year: number,
    includeGST: boolean = false,
    gstRate: number = 0.18 // 18% GST
): MonthlyBilling {
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    // Filter data for the specific month
    const monthData = calendarData.filter(entry => {
        const entryDate = new Date(entry.delivery_date);
        return (
            entryDate.getMonth() === month &&
            entryDate.getFullYear() === year
        );
    });

    // Categorize by status
    const deliveredDays: DailyBillingEntry[] = [];
    const missedDays: DailyBillingEntry[] = [];
    const pausedDays: DailyBillingEntry[] = [];
    const upcomingDays: DailyBillingEntry[] = [];

    monthData.forEach(entry => {
        const dailyEntry: DailyBillingEntry = {
            date: entry.delivery_date,
            productName: entry.products?.name || entry.product_name || 'Unknown Product',
            quantity: entry.quantity,
            unitPrice: entry.price_per_unit, // LOCKED price for this day
            totalAmount: calculateDailyAmount(entry.quantity, entry.price_per_unit),
            status: entry.status,
            deliveryTime: entry.delivery_time,
        };

        // Categorize by status
        switch (entry.status) {
            case 'delivered':
                deliveredDays.push(dailyEntry);
                break;
            case 'missed':
                missedDays.push(dailyEntry);
                break;
            case 'paused':
                pausedDays.push(dailyEntry);
                break;
            case 'upcoming':
                upcomingDays.push(dailyEntry);
                break;
        }
    });

    // Calculate amounts - ONLY delivered days are charged!
    const deliveredAmount = deliveredDays.reduce((sum, entry) => sum + entry.totalAmount, 0);

    // Subtotal = ONLY delivered days
    const subtotal = deliveredAmount;

    // Calculate GST if required
    const gst = includeGST ? subtotal * gstRate : 0;

    // Grand total
    const grandTotal = subtotal + gst;

    return {
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        year,
        monthName: `${monthNames[month]} ${year}`,

        // Delivered (charged)
        deliveredDays,
        deliveredCount: deliveredDays.length,
        deliveredAmount,

        // Not charged
        missedDays,
        missedCount: missedDays.length,

        pausedDays,
        pausedCount: pausedDays.length,

        upcomingDays,
        upcomingCount: upcomingDays.length,

        // Totals
        totalScheduledDays: monthData.length,
        totalBillAmount: deliveredAmount,
        subtotal,
        gst: includeGST ? gst : undefined,
        grandTotal,
    };
}

/**
 * Generate a detailed billing breakdown text
 */
export function generateBillingBreakdown(billing: MonthlyBilling): string {
    let breakdown = `📅 BILLING FOR ${billing.monthName}\n`;
    breakdown += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Delivered days (charged)
    breakdown += `✅ DELIVERED DAYS (Charged):\n`;
    breakdown += `   Days: ${billing.deliveredCount}\n`;
    breakdown += `   Amount: ₹${billing.deliveredAmount.toFixed(2)}\n\n`;

    // Missed days (not charged)
    breakdown += `❌ MISSED DAYS (Not Charged):\n`;
    breakdown += `   Days: ${billing.missedCount}\n`;
    breakdown += `   Amount: ₹0.00\n\n`;

    // Paused days (not charged)
    breakdown += `⏸️ PAUSED DAYS (Not Charged):\n`;
    breakdown += `   Days: ${billing.pausedCount}\n`;
    breakdown += `   Amount: ₹0.00\n\n`;

    breakdown += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    breakdown += `SUBTOTAL: ₹${billing.subtotal.toFixed(2)}\n`;

    if (billing.gst !== undefined) {
        breakdown += `GST (18%): ₹${billing.gst.toFixed(2)}\n`;
    }

    breakdown += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    breakdown += `GRAND TOTAL: ₹${billing.grandTotal.toFixed(2)}\n`;
    breakdown += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    breakdown += `📌 Note: You are charged ONLY for delivered days.\n`;
    breakdown += `   Missed and paused days are FREE.\n`;

    return breakdown;
}

/**
 * Validate billing calculation
 * Ensures that only delivered days are charged
 */
export function validateBilling(billing: MonthlyBilling): {
    isValid: boolean;
    errors: string[];
} {
    const errors: string[] = [];

    // Check 1: Delivered amount should equal sum of delivered days
    const calculatedDeliveredAmount = billing.deliveredDays.reduce(
        (sum, day) => sum + day.totalAmount,
        0
    );

    if (Math.abs(calculatedDeliveredAmount - billing.deliveredAmount) > 0.01) {
        errors.push(`Delivered amount mismatch: Expected ₹${calculatedDeliveredAmount}, got ₹${billing.deliveredAmount}`);
    }

    // Check 2: Total bill should ONLY include delivered days
    if (Math.abs(billing.totalBillAmount - billing.deliveredAmount) > 0.01) {
        errors.push(`Total bill should equal delivered amount only`);
    }

    // Check 3: Subtotal should equal delivered amount (before GST)
    if (Math.abs(billing.subtotal - billing.deliveredAmount) > 0.01) {
        errors.push(`Subtotal should equal delivered amount`);
    }

    // Check 4: Each daily amount should equal quantity × unit price
    billing.deliveredDays.forEach((day, index) => {
        const expectedAmount = calculateDailyAmount(day.quantity, day.unitPrice);
        if (Math.abs(day.totalAmount - expectedAmount) > 0.01) {
            errors.push(`Day ${day.date}: Amount mismatch. Expected ₹${expectedAmount}, got ₹${day.totalAmount}`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
}

/**
 * Get billing summary for display
 */
export function getBillingSummary(billing: MonthlyBilling): {
    label: string;
    value: string;
    description: string;
}[] {
    return [
        {
            label: 'Delivered Days',
            value: billing.deliveredCount.toString(),
            description: `Charged ₹${billing.deliveredAmount.toFixed(2)}`,
        },
        {
            label: 'Missed Days',
            value: billing.missedCount.toString(),
            description: 'Not charged (₹0)',
        },
        {
            label: 'Paused Days',
            value: billing.pausedCount.toString(),
            description: 'Not charged (₹0)',
        },
        {
            label: 'Total Days',
            value: billing.totalScheduledDays.toString(),
            description: `${billing.monthName}`,
        },
        {
            label: 'Monthly Bill',
            value: `₹${billing.grandTotal.toFixed(2)}`,
            description: 'Only delivered days',
        },
    ];
}

/**
 * Example: Calculate what user saves by calendar-based billing
 */
export function calculateSavings(billing: MonthlyBilling): {
    potentialCharge: number; // If all days were charged
    actualCharge: number; // Only delivered days
    savings: number;
    savingsPercentage: number;
} {
    // If we charged for all scheduled days
    const potentialCharge = billing.deliveredDays.reduce((sum, day) => sum + day.totalAmount, 0) +
        billing.missedDays.reduce((sum, day) => sum + day.totalAmount, 0) +
        billing.pausedDays.reduce((sum, day) => sum + day.totalAmount, 0);

    const actualCharge = billing.deliveredAmount;
    const savings = potentialCharge - actualCharge;
    const savingsPercentage = potentialCharge > 0 ? (savings / potentialCharge) * 100 : 0;

    return {
        potentialCharge,
        actualCharge,
        savings,
        savingsPercentage,
    };
}
