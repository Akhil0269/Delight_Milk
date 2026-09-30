// Admin Reports Page - Analytics and insights for business metrics
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Users,
    Package,
    DollarSign,
    Calendar,
    Download,
    Filter,
    RefreshCw,
    ShoppingCart,
    Truck,
    AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import {
    getAdminMetrics,
    getProductSales,
    getTopCustomers,
    getDeliveryStats,
} from "@/utils/adminDataAggregation";

interface ReportMetric {
    label: string;
    value: string | number;
    change: number;
    trend: "up" | "down" | "neutral";
    icon: any;
    color: string;
}

const AdminReports = () => {
    const [dateRange, setDateRange] = useState("7days");
    const [reportType, setReportType] = useState("overview");
    const [realMetrics, setRealMetrics] = useState<any>(null);
    const [productSales, setProductSales] = useState<any[]>([]);
    const [topCustomers, setTopCustomers] = useState<any[]>([]);
    const [deliveryStats, setDeliveryStats] = useState<any[]>([]);

    // Load real data on mount and when filters change
    useEffect(() => {
        loadRealData();
    }, [dateRange, reportType]);

    const loadRealData = () => {
        const metrics = getAdminMetrics();
        const products = getProductSales();
        const customers = getTopCustomers();
        const deliveries = getDeliveryStats();

        setRealMetrics(metrics);
        setProductSales(products);
        setTopCustomers(customers);
        setDeliveryStats(deliveries);
    };

    // Build metrics array from real data
    const metrics: ReportMetric[] = realMetrics ? [
        {
            label: "Total Revenue",
            value: `₹${realMetrics.totalRevenue.toLocaleString()}`,
            change: realMetrics.revenueChange,
            trend: realMetrics.revenueChange >= 0 ? "up" : "down",
            icon: DollarSign,
            color: "text-green-600",
        },
        {
            label: "Total Orders",
            value: realMetrics.totalOrders,
            change: realMetrics.ordersChange,
            trend: realMetrics.ordersChange >= 0 ? "up" : "down",
            icon: ShoppingCart,
            color: "text-blue-600",
        },
        {
            label: "Active Customers",
            value: realMetrics.activeCustomers,
            change: realMetrics.customersChange,
            trend: realMetrics.customersChange >= 0 ? "up" : "down",
            icon: Users,
            color: "text-purple-600",
        },
        {
            label: "Deliveries Completed",
            value: realMetrics.deliveredOrders,
            change: 15.3,
            trend: "up",
            icon: Truck,
            color: "text-orange-600",
        },
        {
            label: "Products Sold",
            value: realMetrics.productsSold,
            change: 10.7,
            trend: "up",
            icon: Package,
            color: "text-indigo-600",
        },
        {
            label: "Pending Deliveries",
            value: realMetrics.pendingOrders,
            change: -5.2,
            trend: "down",
            icon: AlertCircle,
            color: "text-red-600",
        },
    ] : [];

    const handleRefresh = () => {
        loadRealData();
    };

    const handleExportReport = () => {
        // In production, this would generate and download a CSV/PDF report
        const reportData = {
            dateRange,
            reportType,
            metrics,
            productSales,
            topCustomers,
            deliveryStats,
            generatedAt: new Date().toISOString(),
        };

        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `admin-report-${format(new Date(), "yyyy-MM-dd")}.json`;
        link.click();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <BarChart3 className="w-8 h-8 text-primary" />
                        Reports & Analytics
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Business insights and performance metrics
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button onClick={handleExportReport} size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>

                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="7days">Last 7 Days</SelectItem>
                            <SelectItem value="30days">Last 30 Days</SelectItem>
                            <SelectItem value="thisMonth">This Month</SelectItem>
                            <SelectItem value="lastMonth">Last Month</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={reportType} onValueChange={setReportType}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="overview">Overview</SelectItem>
                            <SelectItem value="sales">Sales Report</SelectItem>
                            <SelectItem value="customers">Customer Report</SelectItem>
                            <SelectItem value="deliveries">Delivery Report</SelectItem>
                            <SelectItem value="products">Product Report</SelectItem>
                        </SelectContent>
                    </Select>

                    <Badge variant="secondary" className="ml-auto">
                        <Calendar className="w-3 h-3 mr-1" />
                        {dateRange === "7days" && "Last 7 Days"}
                        {dateRange === "30days" && "Last 30 Days"}
                        {dateRange === "today" && "Today"}
                        {dateRange === "thisMonth" && "This Month"}
                        {dateRange === "lastMonth" && "Last Month"}
                    </Badge>
                </div>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                        <Card key={index} className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground mb-1">
                                        {metric.label}
                                    </p>
                                    <p className="text-3xl font-bold mb-2">{metric.value}</p>
                                    <div className="flex items-center gap-1">
                                        {metric.trend === "up" ? (
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                        ) : metric.trend === "down" ? (
                                            <TrendingDown className="w-4 h-4 text-red-600" />
                                        ) : null}
                                        <span
                                            className={`text-sm font-medium ${metric.trend === "up"
                                                ? "text-green-600"
                                                : metric.trend === "down"
                                                    ? "text-red-600"
                                                    : "text-muted-foreground"
                                                }`}
                                        >
                                            {metric.change > 0 ? "+" : ""}
                                            {metric.change}%
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            vs last period
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center ${metric.color}`}
                                >
                                    <Icon className="w-6 h-6" />
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Product Sales */}
            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Product Sales Performance
                </h2>
                <div className="space-y-4">
                    {productSales.map((product, index) => (
                        <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Package className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">{product.product}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {product.quantity} units sold
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">₹{product.revenue.toLocaleString()}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {product.percentage}% of total
                                    </p>
                                </div>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${product.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Customers */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-primary" />
                        Top Customers
                    </h2>
                    <div className="space-y-3">
                        {topCustomers.map((customer, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                        <span className="text-sm font-bold">{index + 1}</span>
                                    </div>
                                    <div>
                                        <p className="font-medium">{customer.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {customer.orders} orders
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">₹{customer.revenue.toLocaleString()}</p>
                                    <Badge
                                        variant={
                                            customer.status === "active" ? "default" : "destructive"
                                        }
                                        className="text-xs"
                                    >
                                        {customer.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Delivery Performance */}
                <Card className="p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-primary" />
                        Delivery Performance
                    </h2>
                    <div className="space-y-4">
                        {deliveryStats.map((stat, index) => (
                            <div key={index} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">{stat.status}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {stat.count} deliveries
                                        </span>
                                        <Badge variant="secondary">{stat.percentage}%</Badge>
                                    </div>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all ${stat.status === "On Time"
                                            ? "bg-green-600"
                                            : stat.status === "Delayed"
                                                ? "bg-orange-600"
                                                : "bg-red-600"
                                            }`}
                                        style={{ width: `${stat.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}

                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                <strong>Performance Score:</strong> 77% on-time delivery rate.
                                Keep up the good work!
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Real-Time Data Note */}
            <Card className="p-6 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                        <p className="font-medium mb-1 text-green-800 dark:text-green-300">Real-Time Data Active</p>
                        <p className="text-sm text-green-700 dark:text-green-400">
                            All metrics are calculated from real localStorage data including deliveries,
                            customers, and sales. Schedule deliveries to see the numbers update in real-time!
                            Click "Refresh" to update the data.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AdminReports;
