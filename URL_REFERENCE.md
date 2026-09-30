# 🔗 CORRECT URLs - Quick Reference

## ✅ ALL WORKING URLs

### 🏠 **Main Pages**

| Page | URL | Description |
|------|-----|-------------|
| **Home** | http://localhost:8080/ | Landing page |
| **Customer Login** | http://localhost:8080/auth | Customer authentication |
| **Customer Dashboard** | http://localhost:8080/dashboard | Customer main page |

---

### 🛡️ **Admin Pages**

| Page | URL | Description |
|------|-----|-------------|
| **Admin Login** | http://localhost:8080/admin-auth | Admin authentication ✅ |
| **Admin Login (Alt)** | http://localhost:8080/admin/auth | Alternative URL ✅ |
| **Admin Dashboard** | http://localhost:8080/admin | Admin main page |
| **User Management** | http://localhost:8080/admin/users | Manage users |
| **Product Management** | http://localhost:8080/admin/products | Manage products |
| **Delivery Management** | http://localhost:8080/admin/deliveries | Manage deliveries |
| **Wallet Management** | http://localhost:8080/admin/wallet | Manage wallets |
| **Price Management** | http://localhost:8080/admin/prices | Manage prices |

---

### 🛍️ **Customer Features**

| Page | URL | Description |
|------|-----|-------------|
| **Products** | http://localhost:8080/products | Browse products |
| **Orders** | http://localhost:8080/orders | Order history |
| **Addresses** | http://localhost:8080/addresses | Manage addresses |
| **Referral** | http://localhost:8080/referral | Referral program |
| **Support** | http://localhost:8080/support | Customer support |
| **Transactions** | http://localhost:8080/transactions | Transaction history |

---

### ⚙️ **Settings Pages**

| Page | URL | Description |
|------|-----|-------------|
| **Profile** | http://localhost:8080/profile | User profile |
| **Settings** | http://localhost:8080/settings | General settings |
| **Notifications** | http://localhost:8080/settings/notifications | Notification settings |
| **Subscriptions** | http://localhost:8080/settings/subscriptions | Subscription settings |
| **Payments** | http://localhost:8080/settings/payments | Payment methods |
| **Language** | http://localhost:8080/settings/language | Language settings |
| **Favorites** | http://localhost:8080/favorites | Favorite products |

---

### 💳 **Payment Pages**

| Page | URL | Description |
|------|-----|-------------|
| **Payment Process** | http://localhost:8080/payment/process | Payment processing |
| **Payment Success** | http://localhost:8080/payment/success | Payment successful |
| **Payment Failure** | http://localhost:8080/payment/failure | Payment failed |

---

## 🎯 **Quick Access Links**

### **For Testing Customer Features:**
```
1. Login: http://localhost:8080/auth
   - Phone: 9876543210
   - OTP: 123456

2. Dashboard: http://localhost:8080/dashboard
```

### **For Testing Admin Features:**
```
1. Admin Login: http://localhost:8080/admin-auth
   - Email: yaswanthvenkata245@gmail.com
   - Password: admin123

2. Admin Dashboard: http://localhost:8080/admin
```

---

## 🔧 **Common URLs You'll Use**

### **Customer:**
- **Login:** http://localhost:8080/auth
- **Dashboard:** http://localhost:8080/dashboard
- **Products:** http://localhost:8080/products
- **Orders:** http://localhost:8080/orders

### **Admin:**
- **Login:** http://localhost:8080/admin-auth ⭐
- **Dashboard:** http://localhost:8080/admin
- **Users:** http://localhost:8080/admin/users
- **Products:** http://localhost:8080/admin/products

---

## ✅ **Fixed URLs**

### **Admin Login Now Works on BOTH:**
1. ✅ http://localhost:8080/admin-auth (NEW - Easy to remember!)
2. ✅ http://localhost:8080/admin/auth (Original)

**Use either one - both work!**

---

## 🐛 **If You Get 404 Error**

### **Check These:**

1. **Server Running?**
   - Look for: `VITE v5.4.19 ready`
   - URL should be: `http://localhost:8080/`

2. **Correct URL?**
   - Admin login: `/admin-auth` (not `/admin`)
   - Customer login: `/auth` (not `/login`)

3. **Restart Server:**
   ```bash
   Ctrl+C
   npm run dev
   ```

---

## 📋 **URL Patterns**

### **Customer Pages:**
```
/                    → Home
/auth                → Login/Signup
/dashboard           → Dashboard
/products            → Products
/orders              → Orders
/addresses           → Addresses
/referral            → Referral
/support             → Support
/profile             → Profile
/settings            → Settings
/settings/*          → Settings subpages
```

### **Admin Pages:**
```
/admin-auth          → Admin Login ⭐
/admin/auth          → Admin Login (Alt)
/admin               → Admin Dashboard
/admin/users         → User Management
/admin/products      → Product Management
/admin/deliveries    → Delivery Management
/admin/wallet        → Wallet Management
/admin/prices        → Price Management
```

---

## 🎉 **Summary**

### **Main URLs to Remember:**

**Customer:**
- Login: http://localhost:8080/auth
- Dashboard: http://localhost:8080/dashboard

**Admin:**
- Login: http://localhost:8080/admin-auth ⭐
- Dashboard: http://localhost:8080/admin

---

## 🚀 **Start Testing!**

### **Customer Login:**
```
URL: http://localhost:8080/auth
Phone: 9876543210
OTP: 123456
```

### **Admin Login:**
```
URL: http://localhost:8080/admin-auth
Email: yaswanthvenkata245@gmail.com
Password: admin123
```

---

**All URLs are working! No more 404 errors!** ✅
