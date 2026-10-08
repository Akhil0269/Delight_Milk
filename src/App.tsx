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
import CustomerLayout from "./layouts/CustomerLayout";

import SubscriptionSettings from "./pages/settings/SubscriptionSettings";
import PaymentMethods from "./pages/settings/PaymentMethods";
import LanguageSettings from "./pages/settings/LanguageSettings";
import NotificationPreferencesPage from "./pages/settings/NotificationPreferences";
import ResetPassword from "./pages/ResetPassword";
import EditProfile from "./pages/EditProfile";
import ProductDetail from "./pages/ProductDetail";


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
import AdminLogs from "./pages/admin/AdminLogs";
import SubscriptionManagement from "./pages/admin/SubscriptionManagement";
import OrderManagement from "./pages/admin/OrderManagement";
import AdminManagement from "./pages/admin/AdminManagement";
import DeliveryBoyManagement from "./pages/admin/DeliveryBoyManagement";
import DeliveryBoyPortal from "./pages/delivery/DeliveryBoyPortal";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Routes>
              {/* Auth Routes (Standalone, NO Customer Footer) */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/admin/auth" element={<AdminAuth />} />
              <Route path="/admin-auth" element={<AdminAuth />} />

              {/* Admin Routes (Protected AdminLayout, NO Customer Footer) */}
              <Route
                path="/admin"
                element={<AdminLayout />}
              >
                <Route index element={<AdminDashboard />} />
                <Route path="orders" element={<OrderManagement />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="customer/:userId/calendar" element={<CustomerCalendar />} />
                <Route path="products" element={<ProductManagement />} />
                <Route path="prices" element={<AdminPriceManagement />} />
                <Route path="deliveries" element={<DeliveryManagement />} />
                <Route path="delivery-boys" element={<DeliveryBoyManagement />} />
                <Route path="admins" element={<AdminManagement />} />
                <Route path="wallet" element={<WalletManagement />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="subscriptions" element={<SubscriptionManagement />} />
                <Route path="logs" element={<AdminLogs />} />
                <Route path="settings" element={<AdminDashboard />} />
                <Route path="*" element={<AdminDashboard />} />
              </Route>

              {/* Delivery Worker Standalone Route */}
              <Route
                path="/delivery"
                element={
                  <ProtectedRoute>
                    <DeliveryBoyPortal />
                  </ProtectedRoute>
                }
              />

              {/* Public & Customer Routes (CustomerLayout WITH Customer Footer) */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<Index />} />
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
                <Route
                  path="/transactions"
                  element={
                    <ProtectedRoute>
                      <TransactionHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <ProtectedRoute>
                      <OrderHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/addresses"
                  element={
                    <ProtectedRoute>
                      <AddressManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/address"
                  element={
                    <ProtectedRoute>
                      <AddressManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/address"
                  element={
                    <ProtectedRoute>
                      <AddressManagement />
                    </ProtectedRoute>
                  }
                />
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
                <Route
                  path="/products/:id"
                  element={
                    <ProtectedRoute>
                      <ProductDetail />
                    </ProtectedRoute>
                  }
                />

                {/* Profile Pages - Protected */}
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />

                {/* Settings Pages - Protected */}
                <Route path="/settings/notifications" element={<ProtectedRoute><NotificationPreferencesPage /></ProtectedRoute>} />
                <Route path="/settings/subscriptions" element={<ProtectedRoute><SubscriptionSettings /></ProtectedRoute>} />
                <Route path="/settings/payments" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
                <Route path="/settings/language" element={<ProtectedRoute><LanguageSettings /></ProtectedRoute>} />
                <Route path="/settings/security" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/settings/privacy" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

                {/* Catch-all 404 inside customer layout */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
</ErrorBoundary>
);

export default App;
