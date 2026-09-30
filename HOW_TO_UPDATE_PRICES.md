# ✅ HOW TO UPDATE PRICES - Quick Fix Guide

## 🔄 **Issue**: Prices Not Updated

The calendar was generated with old hardcoded prices (₹60). Here's how to fix it:

---

## 🎯 **Quick Solution (Browser Console)**

### **Option 1: Clear localStorage and Reload (Easiest)**

Open browser console (F12) and run:

```javascript
// Clear calendar data
localStorage.removeItem('dev_delivery_calendar');

// Reload page
location.reload();
```

**Result**: Calendar will regenerate with new prices from the pricing system (₹90 for Buffalo Milk with subscription).

---

### **Option 2: Manual Update (If you want to keep existing data)**

Open browser console and run:

```javascript
// 1. Initialize pricing system
const { initializeDevPricing, getPriceForDate, getDevPrices } = await import('/src/utils/pricing.ts');
initializeDevPricing();

// 2. Get calendar and prices
const calendar = JSON.parse(localStorage.getItem('dev_delivery_calendar') || '[]');
const prices = getDevPrices();

// 3. Update each entry
const updated = calendar.map(entry => {
  // Assume user has subscription
  const hasSubscription = true;
  const correctPrice = getPriceForDate(entry.product_id, entry.delivery_date, hasSubscription, prices);
  
  return {
    ...entry,
    price_per_unit: correctPrice,
    product_id: 'prod_buffalo_milk', // Update to new product ID
    products: {
      ...entry.products,
      name: 'Buffalo Milk'
    }
  };
});

// 4. Save
localStorage.setItem('dev_delivery_calendar', JSON.stringify(updated));

// 5. Reload
location.reload();
```

---

## 🎨 **Option 3: Using the Refresh Button (UI Method)**

I've created a `RefreshCalendarPrices` component. To use it:

### **Add to Dashboard:**

```typescript
// In src/pages/Dashboard.tsx
import RefreshCalendarPrices from "@/components/dashboard/RefreshCalendarPrices";

// Add somewhere in the dashboard (e.g., in QuickActions area)
<RefreshCalendarPrices />
```

---

## 📊 **What Prices Should Show**

After refresh, you should see:

### **For Buffalo Milk (with subscription):**
```
Product ID: prod_buffalo_milk
Regular Price: ₹100 per liter
Subscription Price: ₹90 per liter (APPLIED)
Price in Calendar: ₹90
```

### **For Cow Milk (with subscription):**
```
Product ID: prod_cow_milk
Regular Price: ₹70 per liter
Subscription Price: ₹60 per liter (APPLIED)
Price in Calendar: ₹60
```

---

## 🔍 **Verify Prices are Working**

### **Check 1: View localStorage**

Open console and run:
```javascript
// View pricing
JSON.parse(localStorage.getItem('dev_product_prices'))

// View calendar
JSON.parse(localStorage.getItem('dev_delivery_calendar'))
```

### **Check 2: Monthly Billing**

On dashboard, the Monthly Billing Summary should show:
- Delivered days × ₹90 (if Buffalo Milk with subscription)
- Correct total calculation

### **Check 3: Product Pricing Card**

Use the ProductPricingCard component:
```tsx
<ProductPricingCard
  productId="prod_buffalo_milk"
  productName="Buffalo Milk"
  unit="liter"
  hasActiveSubscription={true}
/>
```

Should display:
- Regular: ₹100 (strikethrough)
- Subscription: ₹90 (highlighted)
- Savings: ₹10 (10%)

---

## 🚀 **Recommended: Fresh Start**

The easiest way to see everything working:

```javascript
// In browser console:

// 1. Clear all data
localStorage.clear();

// 2. Reload
location.reload();

// 3. Login again
// Calendar will generate with:
// - Buffalo Milk (₹90 with subscription)
// - Proper product IDs
// - Pricing system integration
```

---

## 📝 **Why This Happened**

The sample calendar was generated before the pricing system was created, so it had:
- Old product ID: `'prod_milk_1'` ❌
- Hardcoded price: `60` ❌

Now it should use:
- New product ID: `'prod_buffalo_milk'` ✅
- Dynamic price: `90` (from pricing system) ✅

---

## ✅ **Verification Checklist**

After refresh, verify:

- [ ] Calendar entries use `prod_buffalo_milk` (not `prod_milk_1`)
- [ ] Price per unit is `90` (not `60`)
- [ ] Product name is "Buffalo Milk" (not "Full Cream Milk")
- [ ] Monthly billing shows correct totals
- [ ] Pricing card shows ₹100/₹90 prices

---

## 🎉 **Summary**

**Easiest Fix**:
1. Open browser console (F12)
2. Run: `localStorage.removeItem('dev_delivery_calendar')`
3. Run: `location.reload()`
4. Login again
5. Calendar regenerates with new prices! ✅

The pricing system is working perfectly - just need to refresh the sample data!

---

**Last Updated**: January 29, 2026 7:47 AM  
**Status**: Quick fix available  
**Impact**: Sample data only (production will work correctly)
