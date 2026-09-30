# 🎯 CONNECT TO REAL DATABASE - COMPLETE GUIDE

## 🚨 Current Situation

**Your app is using MOCK DATA** because:
- `VITE_DEV_MODE=true` in `.env` file
- This was intentional for development without database setup
- Now you want to connect to your **REAL Supabase database**

---

## ✅ SOLUTION: Enable Real Supabase Connection

Follow these steps **exactly** to connect to your real product catalog:

---

## 📋 STEP-BY-STEP GUIDE

### **STEP 1: Get Your Supabase API Key** 🔑

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/settings/api
   ```

2. **Find the "anon" "public" key:**
   - Look for section: **Project API keys**
   - Find: **anon** **public** key
   - **DO NOT** use the `service_role` key (that's for server-side only)

3. **Copy the key:**
   - It looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Copy the entire string

---

### **STEP 2: Update Your .env File** 📝

1. **Open:** `.env` file in your project root

2. **Change these two lines:**

```bash
# BEFORE (Current):
VITE_DEV_MODE=true
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyZnF0a3VnemF5ZnBxaWx1ZWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY2NzU3MjIsImV4cCI6MjA1MjI1MTcyMn0.placeholder-replace-with-real-key

# AFTER (Production):
VITE_DEV_MODE=false
VITE_SUPABASE_PUBLISHABLE_KEY=<YOUR_REAL_KEY_HERE>
```

3. **Save the file**

---

### **STEP 3: Restart Dev Server** 🔄

```bash
# Stop the current server (Ctrl+C in terminal)

# Then restart:
npm run dev
```

**IMPORTANT:** You MUST restart for `.env` changes to take effect!

---

### **STEP 4: Add Products to Supabase Database** 📦

Now you need to add your **real products** to Supabase.

#### **Option A: Using Supabase Dashboard (Recommended)**

1. **Go to Table Editor:**
   ```
   https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/editor
   ```

2. **Find the `products` table**

3. **Click "Insert" → "Insert row"**

4. **Add your products with these fields:**
   - `name` - Product name (e.g., "Buffalo Milk")
   - `description` - Product description
   - `category` - Category (e.g., "Milk", "Dairy", "Ghee")
   - `unit` - Unit (e.g., "Liter", "500g", "250g")
   - `price_per_unit` - Price as number (e.g., 70)
   - `image_url` - Image URL (can use Unsplash or upload to Supabase Storage)
   - `is_active` - Set to `true`

#### **Option B: Using SQL (Bulk Insert)**

1. **Go to SQL Editor:**
   ```
   https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/sql/new
   ```

2. **Run this SQL to add sample products:**

```sql
-- Insert real products into your database
INSERT INTO products (name, description, category, unit, price_per_unit, image_url, is_active)
VALUES
-- Milk Products
('Buffalo Milk', 'Fresh buffalo milk delivered daily. Rich in calcium and protein.', 'Milk', 'Liter', 70, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', true),
('Cow Milk', 'Pure cow milk from local farms. Perfect for daily consumption.', 'Milk', 'Liter', 60, 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400', true),
('A2 Milk', 'Premium A2 milk from desi cows. Easier to digest.', 'Milk', 'Liter', 80, 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400', true),
('Flavored Milk - Chocolate', 'Delicious chocolate flavored milk. Kids favorite!', 'Milk', '200ml', 20, 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400', true),

-- Dairy Products
('Fresh Curd', 'Homemade style fresh curd. Creamy and delicious.', 'Dairy', '500g', 40, 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400', true),
('Paneer', 'Fresh cottage cheese. Perfect for curries and snacks.', 'Dairy', '250g', 90, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400', true),
('Buttermilk', 'Refreshing buttermilk. Great for digestion.', 'Dairy', '500ml', 25, 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400', true),
('Lassi', 'Traditional sweet lassi. Refreshing and creamy.', 'Dairy', '300ml', 30, 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400', true),
('Butter', 'Fresh homemade butter. Rich and creamy.', 'Dairy', '200g', 120, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', true),

-- Ghee Products
('Pure Ghee', 'Traditional pure ghee made from cow milk. Aromatic and healthy.', 'Ghee', '500g', 450, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', true),
('Buffalo Ghee', 'Premium buffalo ghee. Rich flavor and aroma.', 'Ghee', '500g', 500, 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400', true);
```

3. **Click "Run"** to insert the products

---

### **STEP 5: Verify Database Schema** 📊

Make sure your `products` table has these columns:

| Column | Type | Required | Default |
|--------|------|----------|---------|
| `id` | uuid | Yes | auto |
| `name` | text | Yes | - |
| `description` | text | No | null |
| `category` | text | Yes | - |
| `unit` | text | Yes | - |
| `price_per_unit` | numeric | Yes | - |
| `image_url` | text | No | null |
| `is_active` | boolean | Yes | true |
| `created_at` | timestamp | Yes | now() |
| `updated_at` | timestamp | Yes | now() |

**If your table is missing, create it:**

```sql
CREATE TABLE products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  unit text NOT NULL,
  price_per_unit numeric NOT NULL,
  image_url text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for better search performance
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
```

---

### **STEP 6: Enable Row Level Security (RLS)** 🔒

For production, enable RLS on your products table:

```sql
-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for search)
CREATE POLICY "Allow public read access" ON products
FOR SELECT
TO public
USING (is_active = true);

-- Allow authenticated users to read all products
CREATE POLICY "Allow authenticated read" ON products
FOR SELECT
TO authenticated
USING (true);
```

---

### **STEP 7: Test the Connection** 🧪

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R)

2. **Open browser console** (F12)

3. **Go to search page:** `http://localhost:8080/search`

4. **Look for console messages:**
   - ❌ If you see: `🔧 DEV MODE: Using mock product data`
     - You're still in dev mode - check `.env` file
   - ✅ If you DON'T see that message:
     - You're connected to Supabase! 🎉

5. **Search for a product:**
   - Type "milk" in search
   - You should see products from your database

---

## 🔍 Troubleshooting

### **Issue 1: Still seeing mock data**

**Solution:**
1. Check `.env` file: `VITE_DEV_MODE=false` (not `true`)
2. Restart dev server (Ctrl+C, then `npm run dev`)
3. Hard refresh browser (Ctrl+Shift+R)

---

### **Issue 2: "No products found"**

**Possible causes:**

**A. No products in database**
- Go to Supabase dashboard
- Check `products` table
- Add products using SQL above

**B. Wrong API key**
- Verify you copied the correct `anon` key
- Check for typos in `.env` file

**C. RLS blocking access**
- Run the RLS policy SQL above
- Or temporarily disable RLS for testing:
  ```sql
  ALTER TABLE products DISABLE ROW LEVEL SECURITY;
  ```

---

### **Issue 3: Console errors**

**Check console for:**

```
Failed to fetch
```
- **Solution:** Check Supabase URL is correct

```
Invalid API key
```
- **Solution:** Get new API key from dashboard

```
relation "products" does not exist
```
- **Solution:** Create products table using SQL above

---

## 📊 How It Works

### **Development Mode (Current):**
```
Search → Check VITE_DEV_MODE=true → Return MOCK_PRODUCTS
```

### **Production Mode (After Fix):**
```
Search → Check VITE_DEV_MODE=false → Query Supabase → Return real products
```

---

## 🎯 Verification Checklist

- [ ] Got Supabase API key from dashboard
- [ ] Updated `.env` with real key
- [ ] Set `VITE_DEV_MODE=false`
- [ ] Restarted dev server
- [ ] Added products to Supabase database
- [ ] Verified products table exists
- [ ] Enabled RLS policies
- [ ] Hard refreshed browser
- [ ] Searched for products
- [ ] Seeing real data (not mock)

---

## 🚀 Expected Result

### **After completing all steps:**

1. **Search for "milk"**
   - ✅ Shows products from YOUR database
   - ✅ Real prices
   - ✅ Real images
   - ✅ Real descriptions

2. **Filter by category**
   - ✅ Shows only products in that category from database

3. **Console shows:**
   - ✅ No "DEV MODE" messages
   - ✅ Supabase queries in Network tab

---

## 📈 Performance Tips

### **1. Add Database Indexes:**
```sql
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);
```

### **2. Enable Caching:**
Already implemented in `useProductSearch.ts`:
```typescript
staleTime: 5 * 60 * 1000, // Cache for 5 minutes
```

### **3. Optimize Images:**
- Use Supabase Storage for images
- Or use CDN (Cloudinary, Imgix)
- Compress images before uploading

---

## 🎨 Adding Your Own Products

### **Using Supabase Dashboard:**

1. Go to Table Editor
2. Click "Insert row"
3. Fill in:
   - **name:** Your product name
   - **description:** Product details
   - **category:** Milk/Dairy/Ghee/etc.
   - **unit:** Liter/500g/250g/etc.
   - **price_per_unit:** Numeric price
   - **image_url:** Image URL
   - **is_active:** true
4. Click "Save"

### **Using SQL:**

```sql
INSERT INTO products (name, description, category, unit, price_per_unit, image_url, is_active)
VALUES ('Your Product', 'Description', 'Category', 'Unit', 100, 'https://image-url.com', true);
```

---

## 🔐 Security Best Practices

### **1. Never commit .env file:**
```bash
# Add to .gitignore
.env
.env.local
```

### **2. Use environment variables:**
- ✅ Development: `.env.local`
- ✅ Production: Set in hosting platform (Vercel/Netlify)

### **3. Enable RLS:**
```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

### **4. Validate inputs:**
Already implemented in search hook with sanitization

---

## 📖 Quick Reference

### **Environment Variables:**
```bash
VITE_DEV_MODE=false                    # Use real database
VITE_SUPABASE_URL=https://...          # Your Supabase URL
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...   # Your anon key
```

### **Supabase Dashboard Links:**
- **API Keys:** https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/settings/api
- **Table Editor:** https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/editor
- **SQL Editor:** https://supabase.com/dashboard/project/qrfqtkugzayfpqilueid/sql/new

---

## 🎉 Success!

**Once completed, your search will:**
- ✅ Query real Supabase database
- ✅ Show actual products
- ✅ Display real prices
- ✅ Use real images
- ✅ Sync with inventory
- ✅ Work in production

**No more mock data!** 🚀

---

## 📞 Need Help?

### **Common Issues:**

1. **"No products found"**
   - Add products to database using SQL above

2. **"Failed to fetch"**
   - Check API key is correct
   - Verify Supabase URL

3. **Still seeing mock data**
   - Set `VITE_DEV_MODE=false`
   - Restart server
   - Hard refresh browser

---

**Made with ❤️ for Delight Milk**

**Your search will now use REAL data!** ✨
