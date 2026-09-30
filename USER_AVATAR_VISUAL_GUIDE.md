# 👤 User Profile Avatar - Quick Visual Guide

## 🎯 What You'll See

### 1. **Avatar in Dashboard Header** (Top-Right Corner)

```
┌─────────────────────────────────────────────────────────┐
│  DailyDairy          🔔  ⚙️  [👤 John Doe ▼]          │
└─────────────────────────────────────────────────────────┘
                                    ↑
                            User Profile Avatar
```

**Features**:
- Circular avatar with user photo or initials
- User name displayed (hidden on mobile)
- Dropdown chevron icon
- Hover effect (background changes)

---

### 2. **Dropdown Menu** (When Clicked)

```
                                    ┌──────────────────────────────┐
                                    │  [👤] John Doe               │
                                    │      john@example.com        │
                                    ├──────────────────────────────┤
                                    │  PROFILE                     │
                                    │  👤 View Profile             │
                                    │     See your profile details │
                                    │  ✏️  Edit Profile             │
                                    │     Update your information  │
                                    ├──────────────────────────────┤
                                    │  ACTIVITY                    │
                                    │  📦 Order History      [12]  │
                                    │     View past orders         │
                                    │  📅 Subscriptions            │
                                    │     Manage subscriptions     │
                                    │  ❤️  Favorites                │
                                    │     Saved products           │
                                    ├──────────────────────────────┤
                                    │  ACCOUNT                     │
                                    │  💳 Wallet & Payments        │
                                    │     Manage payment methods   │
                                    │  ⚙️  Account Settings         │
                                    │     Password, privacy & more │
                                    │  🔔 Notifications            │
                                    │     Manage preferences       │
                                    │  🛡️  Privacy & Security       │
                                    │     Control your data        │
                                    ├──────────────────────────────┤
                                    │  🚪 Logout                   │
                                    │     Sign out of your account │
                                    └──────────────────────────────┘
```

---

### 3. **Avatar Variations**

#### **With Profile Picture**
```
┌─────────┐
│ [Photo] │  John Doe ▼
└─────────┘
```

#### **With Initials (No Photo)**
```
┌─────────┐
│   JD    │  John Doe ▼
└─────────┘
  (Purple
  Gradient)
```

#### **Mobile View (Icon Only)**
```
┌─────┐
│ JD  │
└─────┘
```

---

### 4. **Logout Confirmation Dialog**

```
┌────────────────────────────────────────────┐
│  Are you sure you want to logout?         │
│                                            │
│  You will be signed out of your account   │
│  and redirected to the login page.        │
│                                            │
│         [Cancel]  [Logout]                 │
└────────────────────────────────────────────┘
```

---

## 🎨 Color Scheme

### Avatar
- **Border**: Primary color with opacity
- **Initials Background**: Gradient (Primary → Purple)
- **Text**: White

### Dropdown
- **Background**: Card color
- **Border**: Border color
- **Shadow**: Large shadow (2xl)

### Menu Items
- **Icon Background**: Primary/10 (light)
- **Icon Color**: Primary
- **Hover**: Accent background
- **Slide Animation**: 4px to the right

### Logout
- **Icon Background**: Destructive/10 (light red)
- **Icon Color**: Destructive (red)
- **Text**: Destructive (red)

---

## 📐 Sizes

### Small (sm)
- **Avatar**: 32px × 32px
- **Text**: 12px
- **Use**: Compact headers, mobile

### Medium (md) - Default
- **Avatar**: 40px × 40px
- **Text**: 14px
- **Use**: Standard headers

### Large (lg)
- **Avatar**: 48px × 48px
- **Text**: 16px
- **Use**: Prominent displays

---

## 🎬 Animations

### Dropdown Open/Close
```
Duration: 200ms
Initial: opacity 0, y -10px, scale 0.95
Animate: opacity 1, y 0, scale 1
Exit: opacity 0, y -10px, scale 0.95
```

### Menu Item Hover
```
Slide right: 4px
Transition: smooth
```

### Chevron Rotation
```
Closed: 0°
Open: 180°
Transition: smooth
```

---

## 📱 Responsive Behavior

### Desktop (≥768px)
```
[👤 Photo] John Doe ▼
           john@example.com
```
- Full avatar with name
- Email shown in dropdown
- Wide dropdown (320px)

### Tablet (768px - 1024px)
```
[👤 Photo] John Doe ▼
```
- Avatar with name
- No email in button
- Full dropdown

### Mobile (<768px)
```
[👤]
```
- Avatar only
- No name in button
- Adapted dropdown width

---

## 🎯 Interactive States

### Default
```
┌─────────┐
│   JD    │  Normal state
└─────────┘
```

### Hover
```
┌─────────┐
│   JD    │  Background: Accent
└─────────┘  Ring: Brighter
```

### Active (Dropdown Open)
```
┌─────────┐
│   JD    │  Background: Accent
└─────────┘  Chevron: Rotated
     ▲
```

---

## 🗺️ Page Previews

### Profile Page (`/profile`)
```
┌────────────────────────────────────────┐
│  My Profile              [Edit Profile]│
├────────────────────────────────────────┤
│                                        │
│           ┌─────────┐                  │
│           │  [JD]   │                  │
│           └─────────┘                  │
│                                        │
│           John Doe                     │
│        john@example.com                │
│     [Active Member] [Verified]         │
│                                        │
├────────────────────────────────────────┤
│  Personal Information                  │
│                                        │
│  👤 Full Name: John Doe                │
│  📧 Email: john@example.com            │
│  📱 Phone: +1 234 567 8900             │
│  📍 Address: 123 Main St               │
│  📅 Member Since: Jan 1, 2026          │
│                                        │
├────────────────────────────────────────┤
│  [12 Orders] [2 Subscriptions] [5 ❤️]  │
└────────────────────────────────────────┘
```

### Settings Page (`/settings`)
```
┌────────────────────────────────────────┐
│  Account Settings                      │
├────────────────────────────────────────┤
│  🔒 Security                            │
│     Password, 2FA                      │
│                                        │
│  🔔 Notifications                       │
│     Email    [ON]                      │
│     Push     [OFF]                     │
│     SMS      [ON]                      │
│                                        │
│  🛡️ Privacy & Security                 │
│     Profile Visible    [ON]            │
│     Activity Tracking  [OFF]           │
│                                        │
│  🌍 Appearance                          │
│     Theme: [Light] [Dark] [Auto]       │
│     Language: [English ▼]              │
└────────────────────────────────────────┘
```

### Favorites Page (`/favorites`)
```
┌────────────────────────────────────────┐
│  ❤️ My Favorites                        │
│  3 saved products                      │
├────────────────────────────────────────┤
│                                        │
│  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │[Img] │  │[Img] │  │[Img] │         │
│  │Milk  │  │Paneer│  │Ghee  │         │
│  │₹90   │  │₹320  │  │₹999  │         │
│  │[❤️][🛒]│  │[❤️][🛒]│  │[❤️][🛒]│         │
│  └──────┘  └──────┘  └──────┘         │
│                                        │
└────────────────────────────────────────┘
```

---

## ✅ Quick Test Checklist

### Visual Check
- [ ] Avatar appears in top-right corner
- [ ] Initials or photo displays correctly
- [ ] User name shows (desktop only)
- [ ] Hover effect works

### Dropdown Check
- [ ] Clicking opens dropdown
- [ ] All menu items visible
- [ ] Icons display correctly
- [ ] Sections are organized
- [ ] Clicking outside closes

### Navigation Check
- [ ] View Profile → Profile page
- [ ] Account Settings → Settings page
- [ ] Favorites → Favorites page
- [ ] All other links work

### Logout Check
- [ ] Logout shows confirmation
- [ ] Confirm logs out
- [ ] Cancel keeps logged in
- [ ] Redirects to login

---

## 🎨 Customization Examples

### Change Avatar Gradient
```tsx
// From purple gradient
className="bg-gradient-to-br from-primary to-purple-600"

// To blue gradient
className="bg-gradient-to-br from-blue-500 to-cyan-500"

// To green gradient
className="bg-gradient-to-br from-green-500 to-emerald-600"
```

### Add Custom Menu Item
```tsx
{
    icon: Star,
    label: 'Rewards',
    description: 'View your points',
    badge: '250',
    onClick: () => navigate('/rewards'),
}
```

### Change Dropdown Position
```tsx
// Right-aligned (default)
className="absolute right-0 mt-2 ..."

// Left-aligned
className="absolute left-0 mt-2 ..."
```

---

## 🚀 Where to See It

### Live on Dashboard
1. Navigate to: http://localhost:8080/dashboard
2. Look at top-right corner
3. Click the avatar
4. Explore the menu!

### Test Pages
- Profile: http://localhost:8080/profile
- Settings: http://localhost:8080/settings
- Favorites: http://localhost:8080/favorites

---

## 🎉 You're All Set!

The User Profile Avatar is **fully implemented** and ready to use!

**Just refresh your browser and click the avatar in the top-right corner!** 👤✨

---

**Created**: January 31, 2026  
**Status**: ✅ Production Ready  
**Server**: http://localhost:8080
