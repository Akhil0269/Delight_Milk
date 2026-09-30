import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import PaymentProcess from "./pages/PaymentProcess";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import TransactionHistory from "./pages/TransactionHistory";
import OrderHistory from "./pages/OrderHistory";
import AddressManagement from "./pages/AddressManagement";
import ReferralProgram from "./pages/ReferralProgram";
import CustomerSupport from "./pages/CustomerSupport";

// Customer Products
import ProductsEnhanced from "./pages/ProductsEnhanced";
import SearchPage from "./pages/SearchPage";

// Profile Pages
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Favorites from "./pages/Favorites";
import Footer from "./components/Footer";

import SubscriptionSettings from "./pages/settings/SubscriptionSettings";
import PaymentMethods from "./pages/settings/PaymentMethods";
import LanguageSettings from "./pages/settings/LanguageSettings";
import NotificationPreferencesPage from "./pages/settings/NotificationPreferences";


import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import ProductManagement from "./pages/admin/ProductManagement";
import DeliveryManagement from "./pages/admin/DeliveryManagement";
import WalletManagement from "./pages/admin/WalletManagement";
import CustomerCalendar from "./pages/admin/CustomerCalendar";
import AdminReports from "./pages/admin/AdminReports";
import AdminPriceManagement from "./components/admin/AdminPriceManagement";
import AdminAuth from "./pages/AdminAuth";
import AdminNotifications from "./pages/admin/AdminNotifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/payment/process" element={<PaymentProcess />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/failure" element={<PaymentFailure />} />
              <Route path="/transactions" element={<TransactionHistory />} />
              <Route path="/orders" element={<OrderHistory />} />
              <Route path="/addresses" element={<AddressManagement />} />
              <Route path="/referral" element={<ReferralProgram />} />
              <Route path="/support" element={<CustomerSupport />} />

              {/* Search Page */}
              <Route path="/search" element={<SearchPage />} />

              {/* Customer Products Catalog - Protected */}
              <Route
                path="/products"
                element={
                  <ProtectedRoute>
                    <ProductsEnhanced />
                  </ProtectedRoute>
                }
              />

              {/* Profile Pages - Protected */}
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />

              {/* Settings Pages - Protected */}
              <Route path="/settings/notifications" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />
              <Route path="/settings/subscriptions" element={<ProtectedRoute><SubscriptionSettings /></ProtectedRoute>} />
              <Route path="/settings/payments" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
              <Route path="/settings/language" element={<ProtectedRoute><LanguageSettings /></ProtectedRoute>} />

              {/* Admin Auth Routes */}
              <Route path="/admin/auth" element={<AdminAuth />} />
              <Route path="/admin-auth" element={<AdminAuth />} />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="customer/:userId/calendar" element={<CustomerCalendar />} />
                <Route path="products" element={<ProductManagement />} />
                <Route path="prices" element={<AdminPriceManagement />} />
                <Route path="deliveries" element={<DeliveryManagement />} />
                <Route path="wallet" element={<WalletManagement />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="logs" element={<div className="p-8">Admin Logs - Coming Soon</div>} />
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Footer />
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
