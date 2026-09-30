# 🏷️ Quick Reference: Dual Pricing System

## Current Product Pricing (as of Jan 29, 2026)

### 🥛 Subscription Products (Daily Delivery)

| Product | Regular | Subscription | You Save |
|---------|---------|--------------|----------|
| **Buffalo Milk** (L) | ₹100 | ₹90 | ₹10 (10%) |
| **Cow Milk** (L) | ₹70 | ₹60 | ₹10 (14%) |
| **Fresh Curd** (kg) | ₹150 | ₹150 | - |
| **Fresh Paneer** (kg) | ₹350 | ₹320 | ₹30 (9%) |

### 🧈 Add-on Products (One-time Purchase)

| Product | Price |
|---------|-------|
| **Pure Desi Ghee** (kg) | ₹999 |
| **Pure Butter** (kg) | ₹450 |
| **Cheddar Cheese** (kg) | ₹600 |

---

## 🔑 Key Rules

### ✅ DO's
- Set prices with future effective dates only
- Apply subscription discounts to daily essentials
- Store price per day in delivery calendar
- Bill only for delivered days
- Log all price changes with reason

### ❌ DON'Ts
- Never modify past calendar entries
- Never set subscription price > regular price
- Never backdate price changes
- Never charge for missed/paused days
- Never skip the audit trail

---

## 📅 Price Change Workflow

```
1. Admin sets new price → 2. Validate future date → 3. Log in history 
   ↓
4. Update future calendar entries → 5. Past entries unchanged → 6. Done ✅
```

---

## 🎯 Quick Commands

### Check Product Price
```typescript
const price = getCurrentPrice('prod_buffalo_milk', hasSubscription, prices);
```

### Calculate Savings
```typescript
const { savings, savingsPercentage } = calculateSubscriptionSavings(
    'prod_buffalo_milk', 
    quantity, 
    prices
);
```

### Add New Price (Admin)
```typescript
addNewPrice({
    product_id: 'prod_buffalo_milk',
    product_name: 'Buffalo Milk',
    regular_price: 105,
    subscription_price: 95,
    effective_from: '2026-02-01',
    is_active: true,
    notes: 'Price adjustment'
}, 'Admin Name');
```

---

## 📊 Monthly Savings Example

**User subscribes to Buffalo Milk (1L daily)**

| Days | Regular Cost | Subscription Cost | Monthly Savings |
|------|-------------|-------------------|-----------------|
| 30 | ₹3,000 | ₹2,700 | **₹300** |

---

## 🚨 Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "Effective date must be in the future" | Trying to set past price | Use today or future date |
| "Subscription price cannot exceed regular price" | Sub > Regular | Lower subscription price |
| "Price already exists for this date" | Duplicate date | Choose different date |

---

## 📞 Support

- Documentation: `DUAL_PRICING_IMPLEMENTATION_GUIDE.md`
- Price Management: `/admin/prices`
- Product Management: `/admin/products`

---

**Last Updated**: January 29, 2026
