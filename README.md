# Daily Drop (Delight Milk) 🥛

A modern, subscription-based milk delivery application built for reliability, speed, and a premium user experience.

![Project Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Supabase%20%7C%20PhonePe-blue)

## 🚀 Features

### 💳 Payments & Wallet
*   **PhonePe Integration**: 
    *   Full production flow implemented (Pay Page → OTP → Success).
    *   **Test Mode**: Simulates payments locally without live API calls.
*   **Secure Wallet**: 
    *   Add money, view balance, and track transaction history.
    *   **Row Level Security (RLS)**: Users see only their own data; transactions are tamper-proof.

### 🔔 Smart Notification System
*   **Real-time Alerts**: Instant notifications for deliveries, orders, and wallet updates.
*   **Centralized Hub**: Notification bell with unread badge and dropdown list.
*   **Categories**: Organized by Delivery, Payment, Subscription, System, etc.
*   **Deep Linking**: Click a notification to go directly to the relevant page (Track Order, Wallet).

### 🛍️ E-commerce Experience
*   **Universal Search**: Instant search for products (Milk, Curd, Ghee, etc.).
*   **Persistent Cart**: Cart items save automatically and follow you across devices.
*   **Guest-to-User Sync**: Start as a guest, cart merges when you login.
*   **Premium Catalog**: 
    *   Rich product images.
    *   Detailed descriptions (e.g., Pure Buffalo Ghee).

### 🏠 User Dashboard
*   **Quick Actions**: One-tap access to Recharge, Subscribe, and Support.
*   **Today's Status**: Live status of your morning delivery (Packed, Out for Delivery, Delivered).
*   **Subscription Management**: Easy pause/resume and plan changes.
*   **Clean UI**: Optimized layout (Delivery Calendar removed for cleaner look).

### 📦 Order Management (NEW!)
*   **Order History**: View all past orders with advanced search and filtering
*   **Status Tracking**: Filter by Delivered, Upcoming, Paused, or Missed
*   **Order Summary**: Quick stats showing total orders and status breakdown
*   **Reorder**: One-click reorder for delivered items
*   **Search**: Find orders by product name instantly

### 📍 Address Management (NEW!)
*   **Multiple Addresses**: Add and manage unlimited delivery addresses
*   **Address Types**: Categorize as Home, Work, or Other
*   **Default Address**: Set your preferred delivery location
*   **Full Details**: Store complete address with landmarks and contact info
*   **Easy Editing**: Update or delete addresses anytime

### 🎁 Referral Program (NEW!)
*   **Earn Rewards**: Get ₹50 for each successful referral
*   **Easy Sharing**: Share your unique referral code via any platform
*   **Track Earnings**: See total earned, pending, and referral count
*   **Milestone Bonuses**: Unlock extra rewards at 5, 10, 15 referrals
*   **Referral History**: Track all your referrals and their status
*   **Progress Tracking**: Visual progress bar to next milestone

### 🎧 Customer Support (NEW!)
*   **Multi-Channel Support**: Phone, Email, and Live Chat options
*   **Comprehensive FAQs**: Organized by category (Orders, Payments, Products, etc.)
*   **Contact Form**: Submit queries directly from the app
*   **Ticket Management**: Track all your support tickets in one place
*   **24/7 Availability**: Get help whenever you need it
*   **Quick Responses**: Email support within 24 hours

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), TypeScript, Tailwind CSS
*   **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
*   **Payments**: PhonePe PG Integration
*   **State Management**: React Query, Context API (Auth, Cart, Notification)
*   **UI Components**: Shadcn UI, Lucide React, Framer Motion

---

## 🏗️ Setup & Installation

Follow these steps to set up the project on a new machine.

### 1. Clone & Install
```bash
git clone https://github.com/your-repo/daily-drop.git
cd daily-drop
npm install
npm install date-fns  # Required dependency
```

### 2. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Database Setup (Supabase)
Run the migration scripts in your Supabase SQL Editor:
1.  **Auth & Cart**: (Standard setup)
2.  **Notifications**: Run content of `NOTIFICATION_QUICK_START.sql`
3.  **RLS Policies**: Run content of `supabase/migrations/20260114_phonepe_rls_policies.sql`

### 4. Run the App
```bash
npm run dev
```

---

## 💳 Payment Gateway Setup (PhonePe)

### For Local Testing (No credentials needed)
1.  Open `src/components/dashboard/AddMoneyDialog.tsx`.
2.  Set `const TEST_MODE = true;`.
3.  The app will simulate success/failure flows automatically.

### For Production
1.  Set `TEST_MODE = false` in `AddMoneyDialog.tsx`.
2.  Deploy Edge Functions:
    ```bash
    npx supabase functions deploy phonepe-payment
    npx supabase functions deploy phonepe-callback
    npx supabase functions deploy phonepe-status
    ```
3.  Set Supabase Secrets:
    ```bash
    npx supabase secrets set PHONEPE_MERCHANT_ID=your_mid
    npx supabase secrets set PHONEPE_SALT_KEY=your_key
    ```

---

## 📂 Project Structure

```
src/
├── components/
│   ├── dashboard/       # Dashboard widgets (Wallet, Status, Actions)
│   ├── notifications/   # Bell, List, Context
│   └── cart/            # Cart drawer, Summary
├── contexts/            # Global State (Auth, Cart, Notification)
├── hooks/               # Custom hooks (usePaymentStatus, etc.)
├── pages/               # Main Pages (Dashboard, Checkout, Auth)
│   ├── OrderHistory.tsx         # NEW: Order history with search/filter
│   ├── AddressManagement.tsx    # NEW: Manage delivery addresses
│   ├── ReferralProgram.tsx      # NEW: Refer & earn rewards
│   └── CustomerSupport.tsx      # NEW: Help center & support
└── integrations/        # Supabase client setup
supabase/
├── functions/           # Edge Functions (Payment, Callback)
└── migrations/          # SQL Database Schema
```

---

## 🎯 New Features Implementation

### Quick Actions Enhancement
The dashboard now includes **10 quick action buttons** for easy navigation:
1. **Add Milk** - Schedule tomorrow's delivery
2. **Pause** - Skip tomorrow's delivery
3. **Repeat** - Repeat yesterday's order
4. **Calendar** - View delivery schedule
5. **Track** - Live delivery tracking
6. **Receipts** - View monthly bills
7. **Orders** - Complete order history (NEW!)
8. **Addresses** - Manage delivery locations (NEW!)
9. **Refer** - Earn referral rewards (NEW!)
10. **Support** - Get help 24/7 (NEW!)

### Routes Added
```typescript
/orders       // Order History Page
/addresses    // Address Management
/referral     // Referral Program
/support      // Customer Support
```

---

## 🚀 Getting Started

### Development Mode
```bash
npm run dev
```
Visit `http://localhost:5173`

### Production Build
```bash
npm run build
npm run preview
```

---

## 📱 Key User Flows

### 1. Order Management Flow
```
Dashboard → Orders → View History → Filter/Search → Reorder
```

### 2. Address Management Flow
```
Dashboard → Addresses → Add New → Fill Details → Set as Default
```

### 3. Referral Flow
```
Dashboard → Refer → Copy Code → Share → Track Earnings
```

### 4. Support Flow
```
Dashboard → Support → Browse FAQs / Submit Ticket / Contact
```

---

## 🎨 Design Highlights

*   **Modern UI**: Gradient headers, smooth animations, glassmorphism effects
*   **Responsive**: Mobile-first design with adaptive layouts
*   **Accessible**: Proper ARIA labels, keyboard navigation support
*   **Performance**: Optimized with React Query caching and lazy loading
*   **Consistent**: Unified color scheme and component library

---

## 🔒 Security Features

*   **Row Level Security (RLS)**: Database-level access control
*   **Secure Authentication**: Phone OTP with Firebase/Supabase
*   **Payment Security**: PhonePe PG with encryption
*   **Data Privacy**: User data isolated and protected
*   **HTTPS Only**: Secure communication channels

---

## 📊 Admin Features

*   **User Management**: View and manage all users
*   **Product Management**: Add/edit/delete products
*   **Delivery Management**: Track and update delivery status
*   **Wallet Management**: Monitor transactions and balances
*   **Reports**: Analytics and insights (Coming Soon)

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

*   **Supabase** - Backend infrastructure
*   **PhonePe** - Payment gateway
*   **Shadcn UI** - Component library
*   **Lucide React** - Icon library
*   **Framer Motion** - Animation library

---

## 📞 Support

For support, email support@dailydrop.com or use the in-app support feature.

---

## 🗺️ Roadmap

- [x] Order History with Search/Filter
- [x] Address Management
- [x] Referral Program
- [x] Customer Support Center
- [ ] Product Reviews & Ratings
- [ ] Push Notifications
- [ ] Loyalty Points System
- [ ] Subscription Plans (Weekly/Monthly)
- [ ] Multi-language Support
- [ ] Dark Mode Toggle

---

**Made with ❤️ by the Daily Drop Team**
#   D e l i g h t - m i l k - a p p  
 #   D e l i g h t - m i l k - a p p  
 #   D e l i g h t - M i l k  
 