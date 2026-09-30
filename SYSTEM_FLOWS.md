# System Flow Diagrams - Automatic Delivery Confirmation

## 📊 Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY CONFIRMATION SYSTEM                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Delivery        │         │   Admin Panel    │         │   Customer       │
│  Partner App     │         │   Dashboard      │         │   Dashboard      │
└────────┬─────────┘         └────────┬─────────┘         └────────┬─────────┘
         │                            │                            │
         │  Mark Delivered            │  Admin Correction          │  View Calendar
         │  (One-Click)               │  (With Reason)             │  (Read-Only)
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE BACKEND                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Database Functions (PostgreSQL)                           │ │
│  │  • mark_delivery_delivered()                               │ │
│  │  • admin_correct_delivery()                                │ │
│  │  • is_month_locked_for_billing()                           │ │
│  │  • lock_month_for_billing()                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│  ┌────────────────────────┴────────────────────────┐           │
│  │                                                  │           │
│  ▼                                                  ▼           │
│  ┌──────────────────┐                    ┌──────────────────┐  │
│  │   deliveries     │                    │ delivery_audit   │  │
│  │   table          │                    │ _log table       │  │
│  │  (Updated)       │                    │  (Audit Trail)   │  │
│  └──────────────────┘                    └──────────────────┘  │
│           │                                                     │
│           │ PostgreSQL NOTIFY Trigger                          │
│           ▼                                                     │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Real-Time Channel: "delivery-status-changes"          │   │
│  │  Event: UPDATE on deliveries table                     │   │
│  └────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ WebSocket Connection
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND REAL-TIME SYNC                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  useRealtimeDeliveryUpdates() Hook                         │ │
│  │  • Subscribes to delivery changes                          │ │
│  │  • Filters by user_id                                      │ │
│  │  • Invalidates React Query cache                           │ │
│  │  • Shows toast notification                                │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  DeliveryCalendar Component                                │ │
│  │  • Re-renders automatically                                │ │
│  │  • Shows green tick for delivered                          │ │
│  │  • No page refresh needed!                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Delivery Confirmation Flow

```
START: Delivery Partner arrives at customer location
  │
  ▼
┌─────────────────────────────────────┐
│ 1. Deliver Product to Customer      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Open Admin Panel / Mobile App    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Navigate to "Today's Deliveries" │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Find Customer's Delivery         │
│    - Customer Name                  │
│    - Product & Quantity             │
│    - Amount                         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 5. Click "Mark Delivered" Button    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 6. Dialog Opens                     │
│    - Upload Proof (Optional)        │
│    - Add Notes (Optional)           │
│    - Shows Delivery Details         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 7. Click "Confirm Delivery"         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ 8. Backend Processing (mark_delivery_delivered)     │
│    ✓ Verify user role (delivery_partner/admin)     │
│    ✓ Check not already delivered                   │
│    ✓ Check month not locked                        │
│    ✓ Update delivery status = 'delivered'          │
│    ✓ Set delivery_time = now()                     │
│    ✓ Set marked_delivered_by = user_id             │
│    ✓ Create audit log entry                        │
│    ✓ Trigger PostgreSQL NOTIFY                     │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 9. Real-Time Notification Sent      │
│    via WebSocket to Customer        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 10. Customer's Calendar Updates     │
│     • Green tick appears            │
│     • Delivery time shown           │
│     • Amount locked                 │
│     • Toast notification            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 11. Success Toast Shown             │
│     "Delivery marked as delivered!" │
└─────────────────────────────────────┘
               │
               ▼
             END
```

---

## 🔐 Security & Validation Flow

```
┌─────────────────────────────────────┐
│ User Attempts to Mark Delivery      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Check 1: Is User Authenticated?     │
└──────────────┬──────────────────────┘
               │
          ┌────┴────┐
          │         │
         NO        YES
          │         │
          ▼         ▼
    ┌─────────┐  ┌─────────────────────────────┐
    │ REJECT  │  │ Check 2: Has Required Role? │
    │ Error   │  │ (admin OR delivery_partner) │
    └─────────┘  └──────────┬──────────────────┘
                            │
                       ┌────┴────┐
                       │         │
                      NO        YES
                       │         │
                       ▼         ▼
                 ┌─────────┐  ┌──────────────────────────┐
                 │ REJECT  │  │ Check 3: Already Marked? │
                 │ Error   │  │ (status != 'delivered')  │
                 └─────────┘  └──────────┬───────────────┘
                                         │
                                    ┌────┴────┐
                                    │         │
                                   YES       NO
                                    │         │
                                    ▼         ▼
                              ┌─────────┐  ┌─────────────────────┐
                              │ REJECT  │  │ Check 4: Month Lock?│
                              │ Error   │  │ (billing completed) │
                              └─────────┘  └──────────┬──────────┘
                                                      │
                                                 ┌────┴────┐
                                                 │         │
                                               LOCKED    NOT LOCKED
                                                 │         │
                                                 ▼         ▼
                                           ┌─────────┐  ┌──────────────────┐
                                           │ REJECT  │  │ Check 5: Is      │
                                           │ Error   │  │ Delivery Day?    │
                                           └─────────┘  └──────────┬───────┘
                                                                   │
                                                              ┌────┴────┐
                                                              │         │
                                                             NO        YES
                                                              │         │
                                                              ▼         │
                                                        ┌──────────┐    │
                                                        │ Is Admin?│    │
                                                        └────┬─────┘    │
                                                             │          │
                                                        ┌────┴────┐     │
                                                        │         │     │
                                                       NO        YES    │
                                                        │         │     │
                                                        ▼         ▼     ▼
                                                   ┌─────────┐  ┌──────────────┐
                                                   │ REJECT  │  │ ✓ ALLOW      │
                                                   │ Error   │  │ Mark Delivery│
                                                   └─────────┘  └──────────────┘
```

---

## 📴 Offline Mode Flow

```
┌─────────────────────────────────────┐
│ Delivery Partner in Field           │
│ (No Internet Connection)            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Marks Delivery as Delivered         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ System Detects: navigator.onLine    │
│ = false                             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Save to localStorage                │
│ Key: "offline_deliveries"           │
│ Value: [{deliveryId, markedBy, ...}]│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Show Toast:                         │
│ "Delivery saved offline"            │
│ "Will sync when online"             │
└──────────────┬──────────────────────┘
               │
               │ ... Time passes ...
               │ ... Connection restored ...
               │
               ▼
┌─────────────────────────────────────┐
│ Browser Event: "online"             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ useOfflineDeliverySync() Hook       │
│ Detects Online Event                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Read localStorage                   │
│ "offline_deliveries"                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ For Each Offline Delivery:          │
│ • Call mark_delivery_delivered()    │
│ • Set offlineMarked = true          │
│ • Sync to database                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Clear localStorage                  │
│ "offline_deliveries"                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Show Toast:                         │
│ "Offline deliveries synced!"        │
│ "X deliveries updated"              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Customer Calendar Updates           │
│ (Real-Time Sync)                    │
└─────────────────────────────────────┘
```

---

## 💰 Billing Integration Flow

```
┌─────────────────────────────────────┐
│ Month End: January 31, 2026         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ System Queries Deliveries           │
│ WHERE delivery_date BETWEEN         │
│ '2026-01-01' AND '2026-01-31'       │
│ AND status = 'delivered'            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Calculate Total:                    │
│ SUM(quantity * price_per_unit)      │
│ GROUP BY product_id                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Generate Receipt:                   │
│ • Total Amount                      │
│ • Total Delivered Days              │
│ • GST Amount                        │
│ • Product-wise Breakdown            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Insert into receipts table          │
│ status = 'processing'               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Call: lock_month_for_billing()      │
│ • Sets is_locked = true             │
│ • Sets locked_at = now()            │
│ • Sets locked_reason = 'Billing'    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ All January Deliveries Now LOCKED   │
│ • Cannot be edited                  │
│ • Admin corrections require reason  │
│ • Audit trail for any changes       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Customer Receives Receipt           │
│ • View in dashboard                 │
│ • Download PDF                      │
│ • Pay online                        │
└─────────────────────────────────────┘

IMPORTANT RULES:
✓ Only 'delivered' status = charged
✗ 'missed' status = NOT charged
✗ 'paused' status = NOT charged
✗ 'upcoming' status = NOT charged
```

---

## 🔍 Audit Trail Flow

```
┌─────────────────────────────────────┐
│ Any Delivery Status Change          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Automatic Audit Log Entry Created   │
│ (via database function)             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────┐
│ Audit Log Entry Contains:                       │
│ • delivery_id (which delivery)                  │
│ • user_id (customer)                            │
│ • changed_by (who made the change)              │
│ • old_status (previous status)                  │
│ • new_status (new status)                       │
│ • change_reason (why changed)                   │
│ • is_admin_correction (true/false)              │
│ • metadata (offline_marked, role, time, etc.)   │
│ • created_at (timestamp)                        │
└──────────────┬──────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Stored in delivery_audit_log table  │
│ • Immutable (cannot be edited)      │
│ • RLS protected                     │
│ • Permanent record                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Viewable by:                        │
│ • Customer (own deliveries)         │
│ • Admin (all deliveries)            │
│ • Delivery Partner (assigned)       │
└─────────────────────────────────────┘

Example Audit Log:
┌──────────────────────────────────────────────────┐
│ 2026-01-31 18:30:00                              │
│ Status Change: upcoming → delivered              │
│ Changed by: delivery_partner@example.com         │
│ Reason: "Delivery confirmed"                     │
│ Metadata: {                                      │
│   "offline_marked": false,                       │
│   "marked_by_role": "delivery_partner",          │
│   "delivery_time": "2026-01-31T18:30:00Z"        │
│ }                                                │
└──────────────────────────────────────────────────┘
```

---

## 🎯 User Roles & Permissions

```
┌─────────────────────────────────────────────────────────┐
│                    ROLE HIERARCHY                        │
└─────────────────────────────────────────────────────────┘

                    ┌──────────┐
                    │  ADMIN   │
                    │ (Highest)│
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ View All     │  │ Mark Delivery│  │ Admin        │
│ Deliveries   │  │ Any Day      │  │ Corrections  │
└──────────────┘  └──────────────┘  └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                    ┌────┴─────┐
                    │ DELIVERY │
                    │ PARTNER  │
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ View Assigned│  │ Mark Delivery│  │ Upload Proof │
│ Deliveries   │  │ On Day Only  │  │ & Notes      │
└──────────────┘  └──────────────┘  └──────────────┘
                         │
                    ┌────┴─────┐
                    │ CUSTOMER │
                    │ (Lowest) │
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ View Own     │  │ Read-Only    │  │ View Audit   │
│ Calendar     │  │ Calendar     │  │ Log (Own)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

**Created**: 2026-01-31  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
