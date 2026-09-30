# STEP 5: Database Migration Consolidation Implementation Plan

**Project:** Delight Milk (v2.0.0)  
**Database Target:** Local Supabase / PostgreSQL  
**Source Document:** [STEP_4_MIGRATION_AUDIT.md](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/STEP_4_MIGRATION_AUDIT.md)  
**Status:** Architecture Design & Implementation Plan (Pre-Execution)  

---

## 1. Executive Architecture Summary

Following the comprehensive audit in [STEP_4_MIGRATION_AUDIT.md](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/STEP_4_MIGRATION_AUDIT.md), this document details the implementation plan for consolidating the 8 fragmented, conflicting migration files in `supabase/migrations/` into **one unified, idempotent, and coherent PostgreSQL schema**.

### Core Architecture Principles:
1. **Single Source of Truth for Authentication & RBAC**:
   - `auth.users` for credentials and user identity.
   - `public.user_roles` with `public.app_role` enum (`'admin'`, `'delivery_partner'`, `'customer'`).
   - `public.has_role(auth.uid(), 'admin')` as the canonical Security Definer authorization function.
   - Deprecate `admin_users` table whitelist and `profiles.role` column check.
2. **Canonical Customer Entity Model**:
   - All customer orders, balance tracking, and deliveries use:
     `profiles`, `products`, `subscriptions`, `deliveries`, `wallets`, `wallet_transactions`, `receipts`, `receipt_items`.
3. **Preservation of High-Value Features**:
   - Rich catalog attributes (`slug`, `rating`, `review_count`, `stock_status`, `tags`, etc.).
   - Dual pricing & price history schedules (`product_prices`, `price_history`).
   - Real-time notification system (`notifications`).
   - Missing customer notification settings (`user_preferences`).
   - Real-time delivery confirmation & tampering audit log (`delivery_audit_log`).
   - Admin audit trail (`admin_logs`).
   - Customer account block/suspend flags (`is_blocked`, `blocked_at`, `blocked_by` on `profiles`).
4. **Resolution of Admin Table Duplication**:
   - Admin hooks (`useAdmin.ts`) will be migrated to point to canonical tables (`deliveries`, `wallets`, `products.name`).
   - In addition, SQL compatibility views (`daily_deliveries` and `wallet`) will be established as a non-breaking safety net.
5. **Decoupled Admin Provisioning**:
   - Remove `20260111_create_admin_user.sql` from the migrations folder.
   - Replace it with an idempotent SQL bootstrap function and seed script in `supabase/seed.sql`.

---

## 2. Final Proposed Migration Order & File List

To guarantee successful execution under Supabase CLI (`supabase db reset` / `supabase migration up`), all migration files must share a consistent lexicographical prefix that strictly matches their dependency tree.

### Final File Sequence:

```
supabase/migrations/
├── 001_initial_core_schema.sql
├── 002_enhance_products_catalog.sql
├── 003_dual_pricing_system.sql
├── 004_update_product_images.sql
├── 005_notifications_and_preferences.sql
├── 006_delivery_tracking_and_audit.sql
└── 007_admin_system_compatibility.sql

supabase/
└── seed.sql (Separate from migrations: provisions initial admin & seed data)
```

---

## 3. Existing Migration Actions Matrix

Detailed disposition for each of the 8 existing files in `supabase/migrations/`:

| Existing File | Action | Destination / Role | Rationale |
| :--- | :--- | :--- | :--- |
| `20260111101716_ecc6ed7f-d37a-449d-a1dc-f88b7b8413f4.sql` | **Rewrite & Rename** | `001_initial_core_schema.sql` | Serves as the foundational base. Rewrite to include `email` sync in `profiles`, and clean RLS policies. |
| `003_create_products_table.sql` | **Rewrite & Rename** | `002_enhance_products_catalog.sql` | Convert from `CREATE TABLE` to `ALTER TABLE products ADD COLUMN IF NOT EXISTS ...`. Eliminate `admin_users` table and replace policies with `has_role()`. Fix forward reference bug. |
| `004_dual_pricing_system.sql` | **Rewrite & Rename** | `003_dual_pricing_system.sql` | Retain pricing schedules and history tables. Replace all `admin_users` references with `has_role()`. |
| `005_update_product_images.sql` | **Rewrite & Rename** | `004_update_product_images.sql` | Keep idempotent image URL updates. Remove stale `toned-milk` rename attempt. |
| `006_notifications_system.sql` | **Merge & Rename** | `005_notifications_and_preferences.sql` | Keep `notifications` table. Merge in the missing `user_preferences` table from documentation. Replace `admin_users` RLS with `has_role()`. |
| `007_automatic_delivery_confirmation.sql` | **Rewrite & Rename** | `006_delivery_tracking_and_audit.sql` | Keep `delivery_audit_log` and functions. Renumbered so it executes *after* `deliveries` table exists. |
| `20260111_admin_system.sql` | **Rewrite & Rename** | `007_admin_system_compatibility.sql` | Remove colliding table definitions (`products`, `subscriptions`, `wallet`, `daily_deliveries`). Create `admin_logs` table, add `is_blocked` to `profiles`, add `delivery_boy_id`/`area` to `deliveries`, and create compatibility views. |
| `20260111_create_admin_user.sql` | **Move out of migrations** | `supabase/scripts/create_admin_user.sql` & `supabase/seed.sql` | It is an ad-hoc operational script, not an idempotent schema migration. Replace with idempotent promotion function and `seed.sql`. |

---

## 4. Exact Schema Changes Required

### 4.1 Canonical Authentication & RBAC (`001_initial_core_schema.sql`)
- **Enums**:
  ```sql
  CREATE TYPE public.app_role AS ENUM ('admin', 'delivery_partner', 'customer');
  CREATE TYPE public.delivery_status AS ENUM ('delivered', 'missed', 'paused', 'upcoming', 'in_progress', 'failed');
  CREATE TYPE public.receipt_status AS ENUM ('paid', 'due', 'processing');
  ```
- **Table `public.user_roles`**:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL`
  - `role app_role NOT NULL DEFAULT 'customer'`
  - `UNIQUE (user_id, role)`
- **Function `public.has_role`**:
  ```sql
  CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
  RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    );
  $$;
  ```
- **Sync Trigger `public.handle_new_user`**:
  - Enhanced to populate `email` in `profiles`:
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
  ```

---

### 4.2 Canonical Customer Tables (`001_initial_core_schema.sql` & `002_enhance_products_catalog.sql`)
1. **`public.profiles`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE`
   - `full_name TEXT`
   - `email TEXT` *(NEW: synced from auth.users)*
   - `phone TEXT`
   - `address TEXT`
   - `avatar_url TEXT`
   - `is_blocked BOOLEAN DEFAULT false` *(from admin system)*
   - `blocked_at TIMESTAMPTZ`
   - `blocked_by UUID REFERENCES auth.users(id)`
   - `created_at TIMESTAMPTZ DEFAULT now()`
   - `updated_at TIMESTAMPTZ DEFAULT now()`
2. **`public.products`**:
   - Core fields in `001`: `id`, `name`, `description`, `category`, `unit`, `price_per_unit`, `image_url`, `is_active`, `created_at`, `updated_at`.
   - Enhanced fields added via `ALTER TABLE` in `002`:
     `images JSONB DEFAULT '[]'::jsonb`, `rating DECIMAL(2,1) DEFAULT 0.0`, `review_count INTEGER DEFAULT 0`, `stock_status VARCHAR(50) DEFAULT 'in_stock'`, `stock_quantity INTEGER DEFAULT 0`, `low_stock_threshold INTEGER DEFAULT 10`, `is_featured BOOLEAN DEFAULT false`, `display_order INTEGER DEFAULT 0`, `slug VARCHAR(255) UNIQUE`, `meta_description TEXT`, `tags TEXT[]`, `nutritional_info JSONB`, `created_by UUID REFERENCES auth.users(id)`.
   - Fields added in `003`:
     `subscription_enabled BOOLEAN DEFAULT true`, `addon_product BOOLEAN DEFAULT false`, `cutoff_time TIME DEFAULT '22:00:00'`.
3. **`public.subscriptions`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL`
   - `product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL`
   - `quantity DECIMAL(10,2) NOT NULL DEFAULT 1`
   - `is_active BOOLEAN NOT NULL DEFAULT true`
   - `paused_until DATE`
   - `paused_by_admin BOOLEAN DEFAULT false` *(admin extension)*
   - `paused_at TIMESTAMPTZ`
   - `paused_by UUID REFERENCES auth.users(id)`
   - `start_date DATE DEFAULT CURRENT_DATE`
   - `end_date DATE`
   - `created_at TIMESTAMPTZ DEFAULT now()`
   - `updated_at TIMESTAMPTZ DEFAULT now()`
4. **`public.deliveries`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL`
   - `subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE` *(nullable for one-time orders)*
   - `product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL`
   - `delivery_date DATE NOT NULL`
   - `quantity DECIMAL(10,2) NOT NULL`
   - `price_per_unit DECIMAL(10,2) NOT NULL`
   - `status delivery_status NOT NULL DEFAULT 'upcoming'`
   - `delivery_time TIMESTAMPTZ`
   - `delivery_proof_url TEXT`
   - `delivered_by UUID REFERENCES auth.users(id)`
   - `delivery_boy_id UUID REFERENCES auth.users(id)` *(admin extension)*
   - `assigned_at TIMESTAMPTZ`
   - `assigned_by UUID REFERENCES auth.users(id)`
   - `area TEXT` *(admin routing extension)*
   - `notes TEXT`
   - `marked_delivered_at TIMESTAMPTZ`
   - `marked_delivered_by UUID REFERENCES auth.users(id)`
   - `delivery_partner_name TEXT`
   - `is_locked BOOLEAN DEFAULT false`
   - `locked_at TIMESTAMPTZ`
   - `locked_reason TEXT`
   - `offline_marked BOOLEAN DEFAULT false`
   - `synced_at TIMESTAMPTZ`
   - `created_at TIMESTAMPTZ DEFAULT now()`
   - `updated_at TIMESTAMPTZ DEFAULT now()`
   - `UNIQUE(user_id, subscription_id, delivery_date)`
5. **`public.wallets`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE`
   - `balance DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0)`
   - `created_at TIMESTAMPTZ DEFAULT now()`
   - `updated_at TIMESTAMPTZ DEFAULT now()`
6. **`public.wallet_transactions`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE` *(nullable with fallback)*
   - `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL`
   - `amount DECIMAL(10,2) NOT NULL`
   - `type TEXT NOT NULL CHECK (type IN ('credit', 'debit'))`
   - `source TEXT DEFAULT 'wallet'` *(admin support)*
   - `status TEXT DEFAULT 'completed'`
   - `description TEXT`
   - `reference_id TEXT`
   - `admin_id UUID REFERENCES auth.users(id)`
   - `created_at TIMESTAMPTZ DEFAULT now()`
7. **`public.receipts` & `public.receipt_items`**:
   - Retained exactly as established in `20260111101716`.

---

### 4.3 Missing Entity: `public.user_preferences` (`005_notifications_and_preferences.sql`)
Add missing table required by [`NotificationPreferences.tsx`](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/pages/settings/NotificationPreferences.tsx):
```sql
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    notification_preferences JSONB DEFAULT '{
        "order_notifications": true,
        "delivery_notifications": true,
        "payment_notifications": true,
        "subscription_notifications": true,
        "promotional_notifications": true,
        "email_notifications": true,
        "sms_notifications": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

---

### 4.4 Admin Audit Trail: `public.admin_logs` (`007_admin_system_compatibility.sql`)
```sql
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view logs"
  ON public.admin_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert logs"
  ON public.admin_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

---

### 4.5 Compatibility Views & Aliases (`007_admin_system_compatibility.sql`)
To guarantee backward compatibility during transitions:
```sql
-- Compatibility View for wallet
CREATE OR REPLACE VIEW public.wallet AS
SELECT id, user_id, balance, updated_at
FROM public.wallets;

-- Compatibility View for daily_deliveries
CREATE OR REPLACE VIEW public.daily_deliveries AS
SELECT 
    d.id,
    d.user_id,
    d.product_id,
    d.subscription_id,
    d.quantity,
    d.delivery_date,
    d.status::text AS status,
    d.delivery_boy_id,
    d.assigned_at,
    d.assigned_by,
    d.delivery_time AS delivered_at,
    d.notes,
    d.area,
    d.created_at
FROM public.deliveries d;

-- Helper function alias for legacy admin checks
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_role(user_id, 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## 5. Investigation: Views vs. Frontend Code Migration

### ⚠️ Technical Assessment: Why Views Alone Are Insufficient for PostgREST
We investigated whether `daily_deliveries` and `wallet` can simply be PostgreSQL views:
1. **PostgREST Foreign Key Relationship Failure**:
   - In [`useAdmin.ts`](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/hooks/useAdmin.ts#L569-L575):
     ```ts
     supabase
       .from("daily_deliveries")
       .select(`
         *,
         user:profiles!daily_deliveries_user_id_fkey(full_name, phone, address),
         product:products(product_name, unit),
         delivery_boy:profiles!daily_deliveries_delivery_boy_id_fkey(full_name)
       `)
     ```
   - In PostgreSQL, **views do not have foreign key constraints**.
   - When PostgREST sees `!daily_deliveries_user_id_fkey`, it queries `pg_constraint`. Because `daily_deliveries` is a view, PostgREST throws:
     `PGRST200: Could not find a relationship between 'daily_deliveries' and 'profiles'`.
2. **UPSERT Incompatibility on Views**:
   - In [`useAdmin.ts`](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/hooks/useAdmin.ts#L695-L701):
     `supabase.from("wallet").upsert({ user_id, balance })`
   - PostgREST does not support `ON CONFLICT` / `UPSERT` on views without custom C-level or complex INSTEAD OF triggers.

### ✅ Decision: Migrate `useAdmin.ts` to Canonical Tables + Keep Views as Fallback
The frontend code in `useAdmin.ts` must be updated to query canonical tables directly:
1. Query `deliveries` instead of `daily_deliveries`.
2. Query `wallets` instead of `wallet`.
3. In `useAdminDeliveries`, select `product:products(name, unit)` instead of `product:products(product_name, unit)`.
4. In `useAdminWalletOperation`, supply `wallet_id` along with `user_id`.

---

## 6. Exact Frontend Changes Required

The required changes in `src/` are isolated to **one file**: [`src/hooks/useAdmin.ts`](file:///Users/pydiabhishek/Downloads/Delight-Milk-main/src/hooks/useAdmin.ts).

### Summary of Edits to `src/hooks/useAdmin.ts`:
1. **`useAdminDeliveries` (Line 569)**:
   ```diff
   - let query = supabase.from("daily_deliveries").select(`
   -     *,
   -     user:profiles!daily_deliveries_user_id_fkey(full_name, phone, address),
   -     product:products(product_name, unit),
   -     delivery_boy:profiles!daily_deliveries_delivery_boy_id_fkey(full_name)
   - `)
   + let query = supabase.from("deliveries").select(`
   +     *,
   +     user:profiles!deliveries_user_id_fkey(full_name, phone, address),
   +     product:products(name, unit),
   +     delivery_boy:profiles!deliveries_delivery_boy_id_fkey(full_name)
   + `)
   ```
2. **`useAssignDeliveryBoy` (Line 624)**:
   ```diff
   - const { error } = await supabase.from("daily_deliveries").update({
   + const { error } = await supabase.from("deliveries").update({
   ```
3. **`useAdminWalletOperation` (Line 680, 696)**:
   ```diff
   - const { data: wallet } = await supabase.from("wallet").select("id, balance").eq("user_id", userId).single();
   + const { data: wallet } = await supabase.from("wallets").select("id, balance").eq("user_id", userId).single();
   ...
   - const { error: walletError } = await supabase.from("wallet").upsert({
   + const { error: walletError } = await supabase.from("wallets").upsert({
         user_id: userId,
         balance: newBalance,
     });
   ...
     const { error: txnError } = await supabase.from("wallet_transactions").insert({
   +     wallet_id: wallet?.id,
         user_id: userId,
         amount,
         type,
         source,
         description,
         admin_id: user?.id,
     });
   ```

---

## 7. Retained vs. Removed Database Objects

### Tables & Objects Retained:
| Object Name | Type | Purpose |
| :--- | :--- | :--- |
| `public.app_role` | Enum | System roles (`admin`, `delivery_partner`, `customer`) |
| `public.delivery_status` | Enum | Delivery states (`delivered`, `missed`, `paused`, `upcoming`, `in_progress`, `failed`) |
| `public.receipt_status` | Enum | Invoice status (`paid`, `due`, `processing`) |
| `public.user_roles` | Table | Canonical RBAC mapping |
| `public.profiles` | Table | User profiles with sync trigger and block fields |
| `public.products` | Table | Rich catalog (slug, rating, tags, pricing) |
| `public.product_prices` | Table | Dual pricing schedules with date ranges |
| `public.price_history` | Table | Immutable price modification audit trail |
| `public.subscriptions` | Table | Recurring daily orders |
| `public.deliveries` | Table | Calendar deliveries with tracking & assignment |
| `public.delivery_audit_log` | Table | Tamper-proof delivery log |
| `public.wallets` | Table | Customer balance |
| `public.wallet_transactions` | Table | Financial transactions ledger |
| `public.receipts` | Table | Monthly billing invoices |
| `public.receipt_items` | Table | Invoice line items |
| `public.notifications` | Table | User in-app notifications |
| `public.user_preferences` | Table | Customer communication preferences |
| `public.admin_logs` | Table | Admin action audit log |
| `public.has_role()` | Function | Security Definer role check |
| `public.is_admin()` | Function | Compatibility alias pointing to `has_role()` |
| `public.mark_delivery_delivered()`| Function | Atomic delivery confirmation |
| `public.admin_correct_delivery()` | Function | Audited delivery correction |
| `public.get_price_for_date()` | Function | Dynamic pricing resolver |
| `public.get_current_price()` | Function | Current pricing resolver |
| `public.log_admin_action()` | Function | Activity logging helper |

### Duplicate / Conflicting Objects Removed:
| Conflicting Object | Found In | Reason for Removal |
| :--- | :--- | :--- |
| `public.admin_users` | `003` | Replaced by canonical `user_roles` (`has_role()`). |
| Duplicate `public.products` (re-create) | `003`, `20260111_admin` | Converted to non-conflicting `ALTER TABLE ADD COLUMN`. |
| `public.daily_deliveries` (table) | `20260111_admin` | Replaced by canonical `deliveries` table + view. |
| `public.wallet` (singular table) | `20260111_admin` | Replaced by canonical `wallets` table + view. |
| Duplicate `public.subscriptions` (table) | `20260111_admin` | Merged admin columns (`paused_by_admin`, `start_date`) into canonical table. |
| Duplicate `public.wallet_transactions` | `20260111_admin` | Merged `source` and `admin_id` into canonical table. |
| `profiles.role` column check | `20260111_admin` | Insecure; replaced by `user_roles` table. |
| `uuid_generate_v4()` calls | `20260111_admin` | Replaced with built-in standard `gen_random_uuid()`. |

---

## 8. Hidden Dependencies Identified

During static analysis of the frontend queries and schema definitions, 5 critical hidden dependencies were uncovered:

1. **`wallet_transactions.wallet_id` Constraint**:
   - `20260111101716` declared `wallet_id UUID REFERENCES wallets(id) NOT NULL`.
   - `useAdminWalletOperation` inserted transactions without providing `wallet_id`.
   - **Resolution**: Make `wallet_id` nullable OR auto-populate it in a `BEFORE INSERT` trigger from `wallets WHERE user_id = NEW.user_id`.
2. **`products.created_by` Column**:
   - `useCreateProduct` sends `created_by: user?.id`, which is missing from `20260111101716`.
   - **Resolution**: Add `created_by UUID REFERENCES auth.users(id)` to `products` in `002_enhance_products_catalog.sql`.
3. **`deliveries.delivery_boy_id` & `deliveries.area`**:
   - `DeliveryManagement.tsx` expects `delivery_boy_id` and groups by `area`.
   - **Resolution**: Add `delivery_boy_id UUID REFERENCES auth.users(id)` and `area TEXT` directly to `deliveries` in `006_delivery_tracking_and_audit.sql`.
4. **`profiles.email` Sync**:
   - `AdminLogs` and `UserManagement` attempt to read `admin.email` from `profiles`.
   - In Supabase, `auth.users` contains the email, but PostgREST cannot directly join `auth.users`.
   - **Resolution**: Add `email TEXT` to `profiles` and populate it inside `public.handle_new_user()`.
5. **Real-Time Replication Publication**:
   - `AdminDashboard.tsx` listens via `supabase.channel` to postgres changes on `profiles`, `products`, and `deliveries`.
   - By default, Supabase only publishes tables added to `supabase_realtime` publication.
   - **Resolution**: Add `ALTER PUBLICATION supabase_realtime ADD TABLE profiles, products, deliveries, notifications;` to migration `007`.

---

## 9. Safe Admin Seeding Strategy

The ad-hoc maintenance script `20260111_create_admin_user.sql` must **not** be executed as a migration. Instead:

1. **Create Bootstrap Admin Promotion Function (`007_admin_system_compatibility.sql`)**:
   ```sql
   CREATE OR REPLACE FUNCTION public.promote_user_to_admin(target_email TEXT)
   RETURNS JSONB
   LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
   DECLARE
     _user_id UUID;
   BEGIN
     SELECT id INTO _user_id FROM auth.users WHERE email = target_email;
     IF _user_id IS NULL THEN
       RETURN jsonb_build_object('success', false, 'error', 'User not found');
     END IF;

     INSERT INTO public.user_roles (user_id, role)
     VALUES (_user_id, 'admin')
     ON CONFLICT (user_id, role) DO NOTHING;

     RETURN jsonb_build_object('success', true, 'user_id', _user_id);
   END;
   $$;
   ```
2. **Dedicated Local Seed (`supabase/seed.sql`)**:
   - Supabase CLI automatically applies `supabase/seed.sql` on `supabase db reset`.
   - Include standard product catalog additions and test users if desired.
3. **Admin User Creation Workflow**:
   - In local dev mode, when a user signs up with the authorized admin email (`yaswanthvenkata245@gmail.com` or `admin@dailydrop.com`), an auto-promotion check or manual command `SELECT public.promote_user_to_admin('yaswanthvenkata245@gmail.com');` grants the admin role cleanly.

---

## 10. "SAFE TO IMPLEMENT" Checklist

Before executing any file modifications or launching Supabase, verify each gate:

- [ ] **Gate 1: Audit Verification** — All 8 migration files analyzed and cataloged in `STEP_4_MIGRATION_AUDIT.md`.
- [ ] **Gate 2: Architecture Alignment** — One unified model agreed upon (`auth.users` + `user_roles` + `has_role()`).
- [ ] **Gate 3: File Sequencing Prepared** — New sequential prefix `001_` through `007_` defined to eliminate lexicographical reordering.
- [ ] **Gate 4: Missing Table Designed** — `user_preferences` schema and RLS policies drafted for migration `005`.
- [ ] **Gate 5: Hidden Dependencies Addressed** — `profiles.email`, `products.created_by`, `deliveries.delivery_boy_id`, `wallet_id` trigger, and `supabase_realtime` publication included in schema plan.
- [ ] **Gate 6: Frontend Update Scope Isolated** — Edits to `src/hooks/useAdmin.ts` prepared to switch from `daily_deliveries`/`wallet` to canonical `deliveries`/`wallets`.
- [ ] **Gate 7: Safe Seed Decoupled** — `20260111_create_admin_user.sql` scheduled for removal from migration queue into standalone script.
