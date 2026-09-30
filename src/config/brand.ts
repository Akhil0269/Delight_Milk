/**
 * Centralized Brand Configuration
 * 
 *
 * This file contains all branding-related constants for Delight Milk.
 * Update this file to change branding across the entire application.
 */

export const BRAND = {
    // Brand Name
    name: "Delight Milk",
    shortName: "Delight",
    fullName: "Delight Milk - Fresh Dairy Delivered Daily",

    // Taglines & Slogans
    tagline: "Fresh, Pure, Delivered Daily",
    slogan: "Your Trusted Partner for Quality Dairy Products",
    description: "Premium dairy products delivered fresh to your doorstep every morning",

    // Contact Information
    contact: {
        email: "support@delightmilk.com",
        phone: "+91 123 456 7890",
        whatsapp: "+91 123 456 7890",
        address: "Mumbai, India",
    },

    // Social Media
    social: {
        facebook: "https://facebook.com/delightmilk",
        instagram: "https://instagram.com/delightmilk",
        twitter: "https://twitter.com/delightmilk",
        linkedin: "https://linkedin.com/company/delightmilk",
        youtube: "https://youtube.com/delightmilk",
    },

    // App Information
    app: {
        version: "2.0.0",
        buildNumber: "2024.02.01",
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.delightmilk",
        appStoreUrl: "https://apps.apple.com/app/delightmilk/id123456789",
    },

    // SEO & Meta
    seo: {
        title: "Delight Milk - Fresh Dairy Delivered Daily",
        description: "Order fresh milk, curd, ghee, and dairy products online. Premium quality, delivered to your doorstep every morning.",
        keywords: "milk delivery, fresh dairy, online milk, curd, ghee, paneer, home delivery",
        author: "Delight Milk Team",
        ogImage: "/og-image.png",
    },

    // Legal
    legal: {
        companyName: "Delight Milk Private Limited",
        registrationNumber: "CIN: U12345MH2024PTC123456",
        gstNumber: "27XXXXX1234X1ZX",
        fssaiNumber: "12345678901234",
        copyright: `© ${new Date().getFullYear()} Delight Milk. All rights reserved.`,
        madeIn: "Made with ❤️ in India",
    },

    // Theme Colors (matching your design system)
    colors: {
        primary: "#3B82F6", // Blue
        secondary: "#8B5CF6", // Purple
        accent: "#10B981", // Green
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
    },

    // Features
    features: {
        hasSubscription: true,
        hasWallet: true,
        hasReferral: true,
        hasLoyalty: true,
        hasChat: true,
        hasTracking: true,
    },
} as const;

// Type-safe brand config
export type BrandConfig = typeof BRAND;

// Helper functions
export const getBrandName = () => BRAND.name;
export const getBrandTagline = () => BRAND.tagline;
export const getBrandContact = () => BRAND.contact;
export const getBrandSocial = () => BRAND.social;
export const getCopyright = () => BRAND.legal.copyright;

// Default export
export default BRAND;
