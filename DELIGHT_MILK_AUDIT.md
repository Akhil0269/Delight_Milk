# Delight Milk - Comprehensive System Audit Report

**Date:** September 2026  
**Audit Scope:** Full codebase audit (Frontend, Backend/BaaS, Database, Auth, Security, Build, Routing, Business Logic)  
**Status:** Read-only inspection completed. No source files were modified.

---

## 1. Current Architecture

### Overview
Delight Milk is a single-page web application (SPA) built with **React 18** and **Vite 5**, styled using **Tailwind CSS** and **shadcn/ui** (Radix UI primitives). Client state and data fetching are handled by **TanStack React Query v5**, routing by **React Router DOM v6**, and animation by **Framer Motion v12**.

### Dual-Mode Architecture & Split Personality
The application is architected around an environment switch: `VITE_DEV_MODE=true` (in [.env](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/.env)).
- **Development Mode (`VITE_DEV_MODE=true`)**: A mock layer intercepts various hooks and routes data to browser `localStorage` (e.g., `dev_user`, `dev_email_users`, `dev_wallets`, `dev_delivery_calendar`, `dev_admin_notifications`).
- **Production Mode (`VITE_DEV_MODE=false`)**: Directly queries Supabase PostgreSQL tables and auth services.
- **Architecture Flaw**: The implementation of dev mode is uneven and incomplete. Several core hooks (`useProducts`, `useSubscriptions`, `useNotifications`, `useDeliveryConfirmation`) have **zero dev mode support** and crash when Supabase credentials are placeholders. Conversely, parts of the admin and pricing systems only write to `localStorage` and never persist to Supabase even when in production mode.

### Backend & Edge Functions
- **Database / BaaS**: Supabase PostgreSQL with Row Level Security (RLS).
- **Edge Functions**: A single Edge Function exists at `supabase/functions/GetDelivery/index.ts`, but it is **never invoked** by any client code (`supabase.functions.invoke` is absent across the codebase).
- **Payment Processing**: A mock simulation service (`phonePeService.ts`) handles transaction state via `localStorage`. Real payment gateway API integration is missing.

---

## 2. Current Features

| Feature Area | Implementation Summary | Primary Files |
| :--- | :--- | :--- |
| **Auth** | Dual: Dev mock OTP / email vs Supabase auth; hardcoded admin email | `AuthContext.tsx`, `Auth.tsx`, `AdminAuth.tsx` |
| **Routing** | React Router v6 with `ProtectedRoute` for user and `/admin` routes | `App.tsx`, `ProtectedRoute.tsx` |
| **Product Catalog** | Enhanced catalog with dual regular/subscription pricing | `ProductsEnhanced.tsx`, `useProducts.ts`, `usePricing.ts` |
| **Cart** | Client cart stored in `localStorage.delightmilk_cart` | `CartContext.tsx`, `CartSheet.tsx` |
| **Orders** | Derived purely from delivery records (no dedicated orders table) | `OrderHistory.tsx`, `useDeliveries.ts` |
| **Subscriptions** | Subscriptions query and card on dashboard | `useSubscriptions.ts`, `SubscriptionCard.tsx` |
| **Delivery Calendar** | Monthly interactive calendar tracking delivery status | `DeliveryCalendar.tsx`, `useDeliveries.ts` |
| **Wallet** | Prepaid balance with recharge and transaction logging | `useWallet.ts`, `useWalletDev.ts`, `WalletCard.tsx` |
| **Payments** | Deep link UPI (`upi://pay`) + client self-confirmation modal | `PaymentProcess.tsx`, `phonePeService.ts` |
| **Notifications** | In-app notification bell with dropdown for customer & admin | `NotificationsDropdown.tsx`, `AdminNotifications.tsx` |
| **Search** | Debounced keyword and category search with recent searches | `SearchPage.tsx`, `useProductSearch.ts` |
| **Profile & Settings**| User info card, notification preferences; other settings placeholder | `Profile.tsx`, `Settings.tsx`, `settings/*` |
| **Address Book** | Modal dialog managing addresses in local component state | `AddressManagement.tsx` |
| **Referrals** | Referral code display and mock referrals list | `ReferralProgram.tsx` |
| **Customer Support** | Static FAQs, mock tickets list, client-side inquiry form | `CustomerSupport.tsx` |
| **Admin Dashboard** | Real-time overview metrics, user/product/delivery/wallet management | `AdminDashboard.tsx`, `pages/admin/*` |

---

## 3. Working Features

Features that function as intended without runtime crashes in dev mode:
1. **Landing Page (`/`)**: Parallax animations, responsive layout, feature callouts, CTA navigation (`Index.tsx`).
2. **Dev Mode Authentication (`/auth`)**:
   - Phone OTP with mock code `123456`.
   - Email/password registration and login persisting to `localStorage.dev_email_users`.
   - Session persistence in `localStorage.dev_user` and context state updates.
3. **Cart Management**:
   - Adding items from catalog (`ProductsEnhanced.tsx`) or search (`SearchPage.tsx`).
   - Updating quantities, removing items, calculating subtotal and free delivery.
   - Persistence in `localStorage.delightmilk_cart`.
4. **Search Page (`/search`)**:
   - Debounced keyword query filtering.
   - Category filtering (Milk, Dairy, Ghee).
   - Recent search query storage in `localStorage`.
5. **Dashboard Layout & Widgets (`/dashboard`)**:
   - Delivery calendar rendering days with status colors.
   - Wallet card displaying current balance.
   - Today's status widget showing daily delivery.
6. **Transaction History (`/transactions`)**:
   - Listing transactions from `dev_wallets` in dev mode.
   - Client-side PDF receipt generation via `jspdf` (`receiptGenerator.ts`).
7. **Admin Navigation & Layout (`/admin`)**:
   - Collapsible sidebar, active route styling, responsive drawer layout.
8. **Admin Product Management (`/admin/products`)**:
   - Creating, editing, and deleting products in dev mode.
9. **Admin User Management (`/admin/users`)**:
   - Viewing users, toggling block/unblock status in `localStorage.dev_admin_all_users`.
10. **Admin Delivery Calendar (`/admin/customer/:userId/calendar`)**:
    - Viewing and toggling delivery status per customer in `localStorage`.

---

## 4. Incomplete Features

1. **Payment Gateway Integration (`PaymentProcess.tsx`, `phonePeService.ts`)**:
   - Uses `upi://pay` deep link with hardcoded UPI ID `9963450427@axl`.
   - Displays a client dialog asking "Did you complete the payment?". Clicking "Yes" marks it successful without server-side verification, signature check, or webhook.
   - In `AddMoneyDialog.tsx`, production mode displays: `"Payment integration not configured. Use development mode."`
2. **Settings Sub-Pages (`src/pages/settings/`)**:
   - `SubscriptionSettings.tsx`: Static placeholder containing "Coming Soon".
   - `LanguageSettings.tsx`: Static placeholder containing "Coming Soon".
   - `PaymentMethods.tsx`: Static placeholder containing "Coming Soon".
3. **Customer Support (`CustomerSupport.tsx`)**:
   - Tickets are hardcoded static items (`TKT001`, `TKT002`).
   - Contact form submit only triggers a Sonner toast notification; does not save or send tickets.
4. **Referral Program (`ReferralProgram.tsx`)**:
   - Hardcoded referral code `MILK2024XYZ` and mock referral stats. No backend referral tracking.
5. **Admin Reports (`AdminReports.tsx`)**:
   - Aggregates data solely from `localStorage` (`dev_admin_all_users`, `customer_deliveries_*`). No aggregation pipeline for Supabase tables in production mode.
6. **Admin Notifications (`AdminNotifications.tsx`)**:
   - Uses `setInterval` polling every 2 seconds on `localStorage.dev_admin_notifications`; disconnected from Supabase `notifications` table.
7. **Order History Scope (`OrderHistory.tsx`)**:
   - Calls `useDeliveries()` with no argument, defaulting to `targetMonth = new Date()`. Consequently, only the **current month's** deliveries appear; historical orders from past months are invisible.

---

## 5. Broken Features

*(Verified directly from source code and compiler checks)*

1. **Payment Success / Cart Checkout Crash (`PaymentSuccess.tsx`, `usePhonePePayment.ts`)**:
   - In [usePhonePePayment.ts](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/hooks/usePhonePePayment.ts#L80-L95), `useCompletePhonePePayment` unconditionally executes `await supabase.from("wallets").select(...)` without checking `VITE_DEV_MODE`. In dev mode with placeholder keys, completing checkout throws an unhandled error.
   - **Logic inversion**: Lines 78–94 credit `wallet.balance + amount` on cart checkout instead of deducting it.
   - In production mode (`isDevMode === false`), lines 109–160 skip creating deliveries entirely, leaving the cart order nonexistent.
2. **Dead Route: Edit Profile (`/profile/edit`)**:
   - Both [Profile.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/pages/Profile.tsx#L41) and [UserProfileAvatar.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/components/UserProfileAvatar.tsx) have buttons navigating to `/profile/edit`.
   - `/profile/edit` is **not registered** in [App.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/App.tsx). Clicking it routes to the `NotFound` (404) page.
3. **Monthly Receipts Dialog Runtime Corruption (`ReceiptsDialog.tsx`)**:
   - [ReceiptsDialog.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/components/dashboard/ReceiptsDialog.tsx#L55-L84) accesses `delivery.price`, `delivery.payment_method`, and `delivery.product_name`.
   - The `Delivery` type ([useDeliveries.ts](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/hooks/useDeliveries.ts#L9-L30)) does not have these properties (it has `price_per_unit`, `products?.name`, and no `payment_method`).
   - At runtime, `delivery.price / delivery.quantity` evaluates to `NaN`, producing corrupted receipts with `NaN` totals and `undefined` fields.
4. **Broken Hook Lifecycle in Notification Preferences (`NotificationPreferences.tsx`)**:
   - In [NotificationPreferences.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/pages/settings/NotificationPreferences.tsx#L70-L74), synchronization is declared as:
     ```tsx
     useState(() => {
       if (preferences) setLocalPreferences(preferences);
     });
     ```
   - This state initializer executes only once on mount before async query resolution. `setLocalPreferences` is never invoked when `preferences` loads.
5. **Broken Hook Lifecycle in Admin Delivery Calendar (`AdminDeliveryCalendar.tsx`)**:
   - In [AdminDeliveryCalendar.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/components/admin/AdminDeliveryCalendar.tsx#L52), data fetching is wrapped in `useState(() => { ... })` instead of `useEffect`, causing data synchronization bugs when `customerId` changes.
6. **Address Management Ephemeral State (`AddressManagement.tsx`)**:
   - Addresses are stored in local React component state (`useState`) seeded with hardcoded "John Doe". Changes are lost upon page refresh or navigation. It is not connected to checkout or user profiles.
7. **Broken Supabase Admin Verification (`20260111_admin_system.sql`)**:
   - `is_admin(user_id)` checks `WHERE id = user_id` on table `profiles`.
   - In `profiles`, `id` is a separate random UUID primary key, while `auth.uid()` corresponds to `profiles.user_id`. Checking `id = auth.uid()` will never match unless `id` was explicitly synced.

---

## 6. Critical Issues

1. **69 TypeScript Compilation Errors (`npx tsc -p tsconfig.app.json --noEmit`)**:
   - While `vite build` passes (because `@vitejs/plugin-react-swc` strips types without typechecking), actual TypeScript type validation fails across 8 files:
     - `src/components/dashboard/ReceiptsDialog.tsx` (10 errors)
     - `src/components/NotificationsDropdown.tsx` (3 errors)
     - `src/hooks/useAdmin.ts` (26 errors)
     - `src/hooks/useDeliveryConfirmation.ts` (10 errors)
     - `src/hooks/useFirebasePhoneAuth.ts` (1 error)
     - `src/hooks/useNotifications.ts` (14 errors)
     - `src/lib/firebase.ts` (2 errors)
     - `src/pages/settings/NotificationPreferences.tsx` (3 errors)
2. **Missing `firebase` Package Dependency**:
   - `src/lib/firebase.ts` imports `firebase/app` and `firebase/auth`, but `firebase` is **not declared in `package.json`** and not installed in `node_modules`. If any file imports `firebase.ts`, the build will fail immediately.
3. **Database Types Mismatch (`types.ts`)**:
   - `src/integrations/supabase/types.ts` is an outdated snapshot from early January 2026.
   - It is missing tables (`notifications`, `user_preferences`, `product_prices`, `delivery_audit_log`, `admin_logs`), new columns on `profiles` (`role`, `is_blocked`, `blocked_at`), and RPC functions (`mark_delivery_delivered`, `admin_correct_delivery_status`).
4. **Fragmented Sources of Truth for Products and Pricing**:
   - 6 disconnected hardcoded catalogs exist across the codebase:
     1. `PRODUCT_CATALOG` in `ProductsEnhanced.tsx`
     2. `SAMPLE_PRODUCTS` in `Products.tsx`
     3. `MOCK_PRODUCTS` in `useProductSearch.ts`
     4. `INITIAL_PRODUCT_PRICES` in `pricing.ts`
     5. `SAMPLE_FAVORITES` in `Favorites.tsx`
     6. `PRODUCT_PRICES` in `adminDataAggregation.ts`
   - Prices, units, and images differ across these files.

---

## 7. Security Issues

1. **Hardcoded Admin Password Committed to Repository (Critical)**:
   - [AdminAuth.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/pages/AdminAuth.tsx#L21-L23):
     ```ts
     const AUTHORIZED_ADMIN_EMAIL = "yaswanthvenkata245@gmail.com";
     const ADMIN_PASSWORD = "Yashu@524230";
     ```
   - Bundled directly into production build output (`dist/assets/index-*.js`) and documented in 11 markdown files.
   - [create-admin.html](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/create-admin.html#L174) also contains hardcoded password `admin123`.
2. **Insecure Admin Authorization in AdminLayout**:
   - [AdminLayout.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/layouts/AdminLayout.tsx#L34-L37):
     ```ts
     // TODO: Check if user has admin role
     // For now, allow all authenticated users
     ```
   - Any authenticated customer account can access `/admin`, view all users, modify product prices, and adjust wallet balances.
3. **Plaintext Passwords in Browser Storage**:
   - `Auth.tsx` stores plaintext passwords in `localStorage.dev_email_users` during dev mode signup.
4. **Client-Controlled Payment & Wallet Manipulation**:
   - No server validation on payment completion. Any user can trigger `phonePeService.simulatePaymentCompletion(txnId, amount, true)` or make a direct mutation to credit wallet funds.
5. **Hardcoded Sensitive Personal Data**:
   - Hardcoded personal email (`yaswanthvenkata245@gmail.com`) and phone number / UPI ID (`9963450427@axl`) across multiple files.

---

## 8. Duplicate Code / Files

1. **`src/components/auth/ProtectedRoute.tsx` vs `src/components/ProtectedRoute.tsx`**:
   - `src/components/auth/ProtectedRoute.tsx` is completely unused; `App.tsx` imports from `src/components/ProtectedRoute.tsx`.
2. **`src/pages/Products.tsx` vs `src/pages/ProductsEnhanced.tsx`**:
   - `ProductsEnhanced.tsx` is used in `App.tsx`. `Products.tsx` is an older, 382-line duplicate catalog that is never routed or imported.
3. **`src/components/admin/AdminProductManagement.tsx` vs `src/pages/admin/ProductManagement.tsx`**:
   - `AdminProductManagement.tsx` in `components/` is never imported or rendered.
4. **Landing Page Dead Duplicates**:
   - `src/pages/Index.tsx` defines its entire landing page inline (362 lines).
   - The following 6 standalone components in `src/components/` were built for the landing page but are completely unused:
     - `src/components/Navbar.tsx`
     - `src/components/Hero.tsx`
     - `src/components/HowItWorks.tsx`
     - `src/components/Products.tsx`
     - `src/components/Testimonials.tsx`
     - `src/components/CTA.tsx`
     - `src/components/NavLink.tsx`
5. **Orphaned Admin Components**:
   - `src/components/admin/TodayDeliveries.tsx`
   - `src/components/admin/DeliveryAuditLog.tsx`
   - `src/components/admin/AdminCorrectionDialog.tsx`
   - `src/components/admin/MarkDeliveredDialog.tsx`
   These components were built for delivery confirmation workflows but are never imported in `DeliveryManagement.tsx` or any route.
6. **Dual Navbar Implementations**:
   - `DashboardHeader.tsx` vs `DashboardNavbar.tsx`: Both render a top navigation bar. `DashboardNavbar` is used on subpages and displays the wrong brand name ("DailyDairy" instead of "Delight Milk").

---

## 9. Missing Features

1. **Order Processing Table & Pipeline**:
   - No `orders` or `order_items` table in database schema or mock layer. Orders are conflated with single daily deliveries.
2. **User Profile Edit Page (`/profile/edit`)**:
   - UI has buttons navigating to `/profile/edit`, but no route or form exists to edit full name, phone number, address, or avatar.
3. **Real Payment Gateway Integration**:
   - No PhonePe, Razorpay, or Cashfree backend integration (only client mock and `upi://` deep link).
4. **True Multi-Month Order History**:
   - Inability to paginate or query deliveries across multiple months in `OrderHistory.tsx`.
5. **Interactive Favorites**:
   - No "Favorite / Wishlist" button on product cards. `Favorites.tsx` only displays static seed data.
6. **Automated Testing**:
   - Zero test coverage (0 unit, 0 integration, 0 E2E tests).
7. **Missing Routes for Footer Links**:
   - 18 links in `Footer.tsx` (`/about`, `/terms`, `/privacy`, `/faq`, etc.) route to 404.

---

## 10. Recommended Implementation Order

### Phase 1: Security & Stability (Immediate)
1. **Remove hardcoded credentials**:
   - Purge `ADMIN_PASSWORD` and hardcoded email from `AdminAuth.tsx` and `create-admin.html`.
   - Remove hardcoded UPI ID and phone numbers; place into environment configuration.
2. **Fix Admin Authorization**:
   - Update `AdminLayout.tsx` and `ProtectedRoute.tsx` to verify `user.role === 'admin'` or query `user_roles` before granting access to `/admin/*`.
3. **Resolve TypeScript & Build Errors**:
   - Either remove unused `firebase.ts` / `useFirebasePhoneAuth.ts` or install `firebase`.
   - Synchronize `src/integrations/supabase/types.ts` with all migration schemas.
   - Fix field mismatches in `ReceiptsDialog.tsx` (`price_per_unit` vs `price`).
   - Fix `useState(() => ...)` bugs in `NotificationPreferences.tsx` and `AdminDeliveryCalendar.tsx`.

### Phase 2: Core Business Logic & Persistence
1. **Fix Payment & Checkout Flow**:
   - Make `useCompletePhonePePayment` dev-mode aware so it does not crash on missing Supabase keys.
   - Correct the logic inversion so cart checkout does not credit money to the wallet.
   - Implement order/delivery record creation on successful checkout in both dev and production modes.
2. **Unify Products & Pricing Catalog**:
   - Create a single shared product service/hook (`useProducts`) with dev mode fallback so that `ProductsEnhanced`, search, and admin operate on the same data store.
3. **Create Missing Profile Edit Route**:
   - Add `/profile/edit` route in `App.tsx` and create the corresponding edit form component.
4. **Fix Order History Month Range**:
   - Allow `OrderHistory.tsx` to query beyond the current calendar month.

### Phase 3: Cleanup & Refactoring
1. **Delete Dead Code**:
   - Remove unused components (`src/components/Navbar.tsx`, `Hero.tsx`, `HowItWorks.tsx`, `Products.tsx`, `Testimonials.tsx`, `CTA.tsx`, `NavLink.tsx`, `auth/ProtectedRoute.tsx`, `pages/Products.tsx`, `components/admin/AdminProductManagement.tsx`).
2. **Brand & Header Consolidation**:
   - Unify `DashboardHeader.tsx` and `DashboardNavbar.tsx` to consume `src/config/brand.ts`.
3. **Connect Orphaned Admin Components**:
   - Integrate `TodayDeliveries.tsx`, `DeliveryAuditLog.tsx`, and correction dialogs into `DeliveryManagement.tsx`.

### Phase 4: Production Readiness
1. **Real Payment Gateway Integration**:
   - Set up backend API / Edge Function for payment initiation and webhook verification.
2. **Implement Missing Setting Pages**:
   - Complete `SubscriptionSettings.tsx`, `PaymentMethods.tsx`, and `LanguageSettings.tsx`.
3. **Database Migration Execution**:
   - Ensure clean sequential execution of Supabase migrations and enable RLS policies.
4. **Automated Testing Suite**:
   - Set up Vitest and React Testing Library for core calculations (billing, pricing, cart).

---

## 11. Exact Files That Should Be Changed Later

### High Priority (Bugs & Security)
- [src/pages/AdminAuth.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/pages/AdminAuth.tsx) (Remove hardcoded credentials)
- [src/layouts/AdminLayout.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/layouts/AdminLayout.tsx) (Enforce admin role check)
- [src/hooks/usePhonePePayment.ts](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/hooks/usePhonePePayment.ts) (Fix checkout crash & wallet logic inversion)
- [src/components/dashboard/ReceiptsDialog.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/components/dashboard/ReceiptsDialog.tsx) (Fix `NaN` / property name mismatch)
- [src/pages/settings/NotificationPreferences.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/pages/settings/NotificationPreferences.tsx) (Fix `useState` lifecycle bug)
- [src/components/admin/AdminDeliveryCalendar.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/components/admin/AdminDeliveryCalendar.tsx) (Fix `useState` lifecycle bug & Supabase sync)
- [src/integrations/supabase/types.ts](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/integrations/supabase/types.ts) (Regenerate / update database schema types)
- [src/App.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/App.tsx) (Add `/profile/edit`, fix unconditional `<Footer />` rendering)

### Medium Priority (Data Consistency & Broken Views)
- [src/pages/OrderHistory.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/pages/OrderHistory.tsx) (Enable multi-month order fetching)
- [src/pages/AddressManagement.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/pages/AddressManagement.tsx) (Add storage persistence and connect to checkout)
- [src/hooks/useProducts.ts](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/hooks/useProducts.ts) (Add dev mode fallback)
- [src/hooks/useSubscriptions.ts](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/hooks/useSubscriptions.ts) (Add dev mode fallback)
- [src/hooks/useNotifications.ts](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/hooks/useNotifications.ts) (Add dev mode fallback)
- [src/components/dashboard/DashboardNavbar.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/components/dashboard/DashboardNavbar.tsx) (Fix "DailyDairy" branding mismatch)
- [src/pages/admin/DeliveryManagement.tsx](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/pages/admin/DeliveryManagement.tsx) (Integrate orphaned delivery dialogs)

### Cleanup (Dead Code Deletion)
- `src/components/Navbar.tsx` (Delete)
- `src/components/Hero.tsx` (Delete)
- `src/components/HowItWorks.tsx` (Delete)
- `src/components/Products.tsx` (Delete)
- `src/components/Testimonials.tsx` (Delete)
- `src/components/CTA.tsx` (Delete)
- `src/components/NavLink.tsx` (Delete)
- `src/components/auth/ProtectedRoute.tsx` (Delete)
- `src/pages/Products.tsx` (Delete)
- `src/components/admin/AdminProductManagement.tsx` (Delete)
- `src/lib/firebase.ts` & `src/hooks/useFirebasePhoneAuth.ts` (Delete if Firebase is abandoned)
- `create-admin.html` (Remove plain credentials / delete)
