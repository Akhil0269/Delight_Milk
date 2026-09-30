# System Architecture - Dual Pricing & Product Management

## 🏗️ Component Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DELIGHT MILK PLATFORM                            │
│                 Dairy Delivery with Dual Pricing                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          DATABASE LAYER                             │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │   products   │      │product_prices│      │price_history │
    │              │      │              │      │              │
    │ - id         │◄─────│ - product_id │──────│ - product_id │
    │ - name       │      │ - regular    │      │ - old_price  │
    │ - category   │      │ - subscription│      │ - new_price  │
    │ - unit       │      │ - effective  │      │ - admin      │
    │ - sub_enabled│      │ - is_active  │      │ - timestamp  │
    └──────────────┘      └──────────────┘      └──────────────┘
           │                     │                      │
           │                     ▼                      │
           │          ┌──────────────────┐             │
           │          │   RLS POLICIES   │             │
           │          │ - Admin only     │             │
           │          │ - Future dates   │             │
           │          │ - Validation     │             │
           │          └──────────────────┘             │
           │                     │                      │
           └─────────────────────┴──────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        CALENDAR & BILLING                           │
└─────────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────┐
    │           delivery_calendar (per-day)                │
    │                                                      │
    │  Date        Product      Qty   Price/Unit  Status  │
    │  ──────────  ──────────  ────  ──────────  ───────  │
    │  2026-01-29  Buffalo      1L      ₹90      delivered│
    │  2026-01-30  Buffalo      1L      ₹90      delivered│
    │  2026-02-01  Buffalo      1L      ₹95      upcoming │
    │              (new price) ────────^                   │
    └──────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────────┐
    │              BILLING CALCULATION                     │
    │                                                      │
    │  Monthly Bill = SUM(delivered × price_per_unit)     │
    │                                                      │
    │  Jan 2026:                                          │
    │    29 delivered days × ₹90 = ₹2,610                │
    │    (uses LOCKED per-day prices)                     │
    └──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       PRICING UTILITIES                             │
└─────────────────────────────────────────────────────────────────────┘

    src/utils/pricing.ts
    ┌──────────────────────────────────────────────────────┐
    │  getPriceForDate(product, date, hasSub, prices)     │
    │      ↓                                               │
    │  1. Find active price for date                      │
    │  2. Check effective_from <= date                    │
    │  3. Return subscription or regular price            │
    └──────────────────────────────────────────────────────┘
    
    ┌──────────────────────────────────────────────────────┐
    │  calculateSubscriptionSavings(product, qty, prices) │
    │      ↓                                               │
    │  1. Get regular price                               │
    │  2. Get subscription price                          │
    │  3. Calculate: regular - subscription × qty         │
    │  4. Return: {savings, savingsPercentage}           │
    └──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN INTERFACES                             │
└─────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────┐    ┌─────────────────────────┐
    │  Price Management       │    │  Product Management     │
    │  /admin/prices          │    │  /admin/products        │
    │                         │    │                         │
    │  • Set future prices    │    │  • Add/edit products    │
    │  • View history         │    │  • Set pricing          │
    │  • Validate changes     │    │  • Enable/disable       │
    │  • Audit log            │    │  • Subscription config  │
    └─────────────────────────┘    └─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      CUSTOMER INTERFACE                             │
└─────────────────────────────────────────────────────────────────────┘

    ProductsEnhanced (/products)
    ┌──────────────────────────────────────────────────────┐
    │  Product Card                                        │
    │  ┌────────────────────────────────────────────────┐ │
    │  │  🥛 Buffalo Milk                               │ │
    │  │                                                │ │
    │  │  Regular:        ₹100  (crossed out)          │ │
    │  │  Subscription:   ₹90   (green, bold)          │ │
    │  │  💰 Save ₹10 (10%)                            │ │
    │  │                                                │ │
    │  │  [Quantity: - 2 +]                            │ │
    │  │  [Add to Cart] [Subscribe]                    │ │
    │  └────────────────────────────────────────────────┘ │
    └──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                   │
└─────────────────────────────────────────────────────────────────────┘

    ADMIN SETS NEW PRICE
         │
         ▼
    ┌─────────────────────┐
    │ Validate:           │
    │ • Future date?      │ ──NO──> ❌ Error
    │ • Sub <= Regular?   │
    │ • No overlap?       │
    └─────────────────────┘
         │ YES
         ▼
    ┌─────────────────────┐
    │ Insert into         │
    │ product_prices      │
    └─────────────────────┘
         │
         ▼
    ┌─────────────────────┐
    │ Trigger logs to     │
    │ price_history       │
    └─────────────────────┘
         │
         ▼
    ┌─────────────────────┐
    │ Update FUTURE       │
    │ calendar entries    │
    │ (past unchanged)    │
    └─────────────────────┘

    CUSTOMER SUBSCRIBES
         │
         ▼
    ┌─────────────────────┐
    │ Create calendar     │
    │ entries with        │
    │ SUBSCRIPTION price  │
    └─────────────────────┘
         │
         ▼
    Each day locks price
         │
         ▼
    ┌─────────────────────┐
    │ Delivery marked     │
    │ (price locked)      │
    └─────────────────────┘
         │
         ▼
    ┌─────────────────────┐
    │ Monthly billing     │
    │ uses locked prices  │
    └─────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    SAFETY MECHANISMS                                │
└─────────────────────────────────────────────────────────────────────┘

    Layer 1: DATABASE TRIGGERS
    ┌─────────────────────────────────────────────────┐
    │ validate_price_change()                         │
    │ • effective_from >= CURRENT_DATE                │
    │ • subscription_price <= regular_price           │
    │ • No duplicate dates per product                │
    └─────────────────────────────────────────────────┘

    Layer 2: RLS POLICIES
    ┌─────────────────────────────────────────────────┐
    │ • Only admins can insert/update prices          │
    │ • Anyone can view active prices                 │
    │ • Price history is public for transparency      │
    └─────────────────────────────────────────────────┘

    Layer 3: TYPESCRIPT VALIDATION
    ┌─────────────────────────────────────────────────┐
    │ validatePriceChange(newPrice, existingPrices)   │
    │ • Client-side validation before submit          │
    │ • User-friendly error messages                  │
    └─────────────────────────────────────────────────┘

    Layer 4: IMMUTABLE CALENDAR
    ┌─────────────────────────────────────────────────┐
    │ updateCalendarPrices()                          │
    │ • Only updates status === 'upcoming'            │
    │ • Never modifies 'delivered' entries            │
    │ • Preserves historical billing data             │
    └─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      PRICE UPDATE FLOW                              │
└─────────────────────────────────────────────────────────────────────┘

    Today: Jan 29, 2026
    Buffalo Milk: ₹90 (subscription)

    Admin sets new price for Feb 1:
    Buffalo Milk: ₹95 (subscription)

    CALENDAR STATE:
    ┌──────────┬────────────┬────────┬───────────┐
    │ Date     │ Product    │ Price  │ Status    │
    ├──────────┼────────────┼────────┼───────────┤
    │ Jan 28   │ Buffalo    │ ₹90    │ DELIVERED │ ← Locked ✓
    │ Jan 29   │ Buffalo    │ ₹90    │ DELIVERED │ ← Locked ✓
    │ Jan 30   │ Buffalo    │ ₹90    │ UPCOMING  │ ← Stays ₹90
    │ Jan 31   │ Buffalo    │ ₹90    │ UPCOMING  │ ← Stays ₹90
    │ Feb 01   │ Buffalo    │ ₹95    │ UPCOMING  │ ← New price!
    │ Feb 02   │ Buffalo    │ ₹95    │ UPCOMING  │ ← New price!
    └──────────┴────────────┴────────┴───────────┘

    BILLING GUARANTEES:
    • January bill uses ₹90 (locked)
    • February bill uses ₹95 (new price)
    • Historical data never changes

┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCT TYPES                                    │
└─────────────────────────────────────────────────────────────────────┘

    SUBSCRIPTION PRODUCTS (subscription_enabled = true)
    ┌──────────────────────────────────────┐
    │ • Buffalo Milk   (save 10%)          │
    │ • Cow Milk       (save 14%)          │
    │ • Curd           (no discount)       │
    │ • Paneer         (save 9%)           │
    │                                      │
    │ Features:                            │
    │ • Daily delivery                     │
    │ • Subscription discount              │
    │ • Quantity adjustable                │
    │ • Pause/resume capability            │
    └──────────────────────────────────────┘

    ADD-ON PRODUCTS (addon_product = true)
    ┌──────────────────────────────────────┐
    │ • Ghee    ₹999                       │
    │ • Butter  ₹450                       │
    │ • Cheese  ₹600                       │
    │                                      │
    │ Features:                            │
    │ • One-time purchase only             │
    │ • No subscription discount           │
    │ • Same price for all users           │
    └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                       SUCCESS FLOW                                  │
└─────────────────────────────────────────────────────────────────────┘

         USER JOURNEY
              │
    ┌─────────▼─────────┐
    │ Browse Products   │
    │ See dual pricing  │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │ Compare Prices    │
    │ ₹100 vs ₹90      │
    │ Save ₹10 (10%)   │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │ Choose to         │
    │ Subscribe         │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │ Calendar created  │
    │ with ₹90/day      │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │ Daily deliveries  │
    │ Price locked      │
    └─────────┬─────────┘
              │
    ┌─────────▼─────────┐
    │ Monthly bill      │
    │ Uses locked price │
    └───────────────────┘
              │
         ✅ SUCCESS!

┌─────────────────────────────────────────────────────────────────────┐
│                    KEY BENEFITS                                     │
└─────────────────────────────────────────────────────────────────────┘

    FOR CUSTOMERS                    FOR BUSINESS
    ──────────────                   ────────────
    ✅ Transparent pricing           ✅ No data corruption
    ✅ Clear savings                 ✅ Complete audit trail
    ✅ Fair billing                  ✅ Future-proof system
    ✅ No hidden costs               ✅ Trust building
    
    FOR ADMINS
    ──────────
    ✅ Easy price updates
    ✅ Product management
    ✅ Error prevention
    ✅ Audit visibility

┌─────────────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT READY                                │
└─────────────────────────────────────────────────────────────────────┘

    ✅ Database migration created
    ✅ Safety rules enforced
    ✅ Admin interfaces built
    ✅ Customer UI enhanced
    ✅ Documentation complete
    ✅ Testing checklist provided
    
    🚀 READY TO LAUNCH!
