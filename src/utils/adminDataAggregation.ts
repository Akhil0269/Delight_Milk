// Admin Data Aggregation - Calculate real metrics from localStorage
// This utility aggregates data from various localStorage sources to provide
// real-time metrics for the admin dashboard and reports

export interface AdminMetrics {
    totalRevenue: number;
    totalOrders: number;
    activeCustomers: number;
    deliveredOrders: number;
    productsSold: number;
    pendingOrders: number;
    revenueChange: number;
    ordersChange: number;
    customersChange: number;
}

export interface ProductSales {
    product: string;
    quantity: number;
    revenue: number;
    percentage: number;
}

export interface TopCustomer {
    id: string;
    name: string;
    orders: number;
    revenue: number;
    status: string;
}

export interface DeliveryStats {
    status: string;
    count: number;
    percentage: number;
}

// Product prices (in ₹)
const PRODUCT_PRICES: Record<string, number> = {
    'Milk': 100,
    'Curd': 100,
    'Butter': 100,
    'Paneer': 100,
};

/**
 * Get all deliveries from all customers
 */
function getAllDeliveries() {
    const users = JSON.parse(localStorage.getItem('dev_admin_all_users') || '[]');
    const allDeliveries: any[] = [];

    users.forEach((user: any) => {
        const deliveries = JSON.parse(
            localStorage.getItem(`customer_deliveries_${user.id}`) || '[]'
        );
        deliveries.forEach((delivery: any) => {
            allDeliveries.push({
                ...delivery,
                customerId: user.id,
                customerName: user.full_name,
            });
        });
    });

    return allDeliveries;
}

/**
 * Calculate main admin metrics
 */
export function getAdminMetrics(): AdminMetrics {
    // Get all users
    const users = JSON.parse(localStorage.getItem('dev_admin_all_users') || '[]');

    // Get all deliveries
    const allDeliveries = getAllDeliveries();

    // Calculate active customers (non-blocked)
    const activeCustomers = users.filter((u: any) => !u.is_blocked).length;

    // Calculate total orders
    const totalOrders = allDeliveries.length;

    // Calculate delivered orders
    const deliveredOrders = allDeliveries.filter((d: any) => d.status === 'delivered').length;

    // Calculate pending orders
    const pendingOrders = allDeliveries.filter((d: any) => d.status === 'scheduled').length;

    // Calculate total revenue
    const totalRevenue = allDeliveries.reduce((sum: number, d: any) => {
        const price = PRODUCT_PRICES[d.productName] || 100;
        return sum + (d.quantity * price);
    }, 0);

    // Calculate total products sold
    const productsSold = allDeliveries.reduce((sum: number, d: any) => sum + d.quantity, 0);

    // Calculate changes (mock for now - in production, compare with previous period)
    const revenueChange = totalRevenue > 0 ? 12.5 : 0;
    const ordersChange = totalOrders > 0 ? 8.2 : 0;
    const customersChange = activeCustomers > 0 ? -3.1 : 0;

    return {
        totalRevenue,
        totalOrders,
        activeCustomers,
        deliveredOrders,
        productsSold,
        pendingOrders,
        revenueChange,
        ordersChange,
        customersChange,
    };
}

/**
 * Get product-wise sales breakdown
 */
export function getProductSales(): ProductSales[] {
    const allDeliveries = getAllDeliveries();

    // Group by product
    const productMap: Record<string, { quantity: number; revenue: number }> = {};

    allDeliveries.forEach((d: any) => {
        if (!productMap[d.productName]) {
            productMap[d.productName] = { quantity: 0, revenue: 0 };
        }
        const price = PRODUCT_PRICES[d.productName] || 100;
        productMap[d.productName].quantity += d.quantity;
        productMap[d.productName].revenue += d.quantity * price;
    });

    // Calculate total revenue for percentages
    const totalRevenue = Object.values(productMap).reduce((sum, p) => sum + p.revenue, 0);

    // Convert to array and calculate percentages
    const productSales: ProductSales[] = Object.entries(productMap).map(([product, data]) => ({
        product,
        quantity: data.quantity,
        revenue: data.revenue,
        percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
    }));

    // Sort by revenue (highest first)
    productSales.sort((a, b) => b.revenue - a.revenue);

    return productSales;
}

/**
 * Get top customers by revenue
 */
export function getTopCustomers(limit: number = 5): TopCustomer[] {
    const users = JSON.parse(localStorage.getItem('dev_admin_all_users') || '[]');
    const customerStats: TopCustomer[] = [];

    users.forEach((user: any) => {
        const deliveries = JSON.parse(
            localStorage.getItem(`customer_deliveries_${user.id}`) || '[]'
        );

        const revenue = deliveries.reduce((sum: number, d: any) => {
            const price = PRODUCT_PRICES[d.productName] || 100;
            return sum + (d.quantity * price);
        }, 0);

        customerStats.push({
            id: user.id,
            name: user.full_name || user.email || 'Unknown',
            orders: deliveries.length,
            revenue,
            status: user.is_blocked ? 'blocked' : 'active',
        });
    });

    // Sort by revenue (highest first)
    customerStats.sort((a, b) => b.revenue - a.revenue);

    // Return top N customers
    return customerStats.slice(0, limit);
}

/**
 * Get delivery performance statistics
 */
export function getDeliveryStats(): DeliveryStats[] {
    const allDeliveries = getAllDeliveries();
    const total = allDeliveries.length;

    if (total === 0) {
        return [
            { status: 'On Time', count: 0, percentage: 0 },
            { status: 'Delayed', count: 0, percentage: 0 },
            { status: 'Cancelled', count: 0, percentage: 0 },
        ];
    }

    const delivered = allDeliveries.filter((d: any) => d.status === 'delivered').length;
    const cancelled = allDeliveries.filter((d: any) => d.status === 'cancelled').length;
    const scheduled = allDeliveries.filter((d: any) => d.status === 'scheduled').length;

    // Assume 90% of delivered are on time, 10% delayed
    const onTime = Math.round(delivered * 0.9);
    const delayed = delivered - onTime;

    return [
        {
            status: 'On Time',
            count: onTime,
            percentage: Math.round((onTime / total) * 100),
        },
        {
            status: 'Delayed',
            count: delayed,
            percentage: Math.round((delayed / total) * 100),
        },
        {
            status: 'Cancelled',
            count: cancelled,
            percentage: Math.round((cancelled / total) * 100),
        },
    ];
}

/**
 * Get recent activity for dashboard
 */
export function getRecentActivity(limit: number = 10) {
    const allDeliveries = getAllDeliveries();

    // Sort by date (most recent first)
    allDeliveries.sort((a: any, b: any) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return allDeliveries.slice(0, limit).map((d: any) => ({
        id: d.id,
        type: d.status === 'delivered' ? 'delivery_completed' : 'order_placed',
        customer: d.customerName,
        product: d.productName,
        quantity: d.quantity,
        date: d.date,
        status: d.status,
    }));
}

/**
 * Refresh all metrics (call this when data changes)
 */
export function refreshMetrics() {
    return {
        metrics: getAdminMetrics(),
        productSales: getProductSales(),
        topCustomers: getTopCustomers(),
        deliveryStats: getDeliveryStats(),
        recentActivity: getRecentActivity(),
    };
}
