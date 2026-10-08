import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  Heart,
  Menu,
  Milk,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useProducts, Product } from "@/hooks/useProducts";
import CartSheet from "@/components/dashboard/CartSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Default catalog fallback for instantaneous render or offline scenario
const FALLBACK_PRODUCTS: Array<Partial<Product> & { id: string; name: string; price_per_unit: number; unit: string; category: string; description: string; image_url: string }> = [
  {
    id: "kafa-buffalo-milk",
    name: "Pure Buffalo Milk",
    category: "Milk",
    unit: "1 Litre",
    price_per_unit: 85,
    description: "Rich, creamy, farm-fresh whole buffalo milk with natural fat and unmatched purity.",
    image_url: "/images/buffalo-milk.jpg",
    is_active: true,
  },
  {
    id: "kafa-cow-milk",
    name: "Farm Fresh Cow Milk",
    category: "Milk",
    unit: "1 Litre",
    price_per_unit: 75,
    description: "Light, nourishing, and easily digestible pure cow milk, bottled within hours of milking.",
    image_url: "/images/cow-milk.jpg",
    is_active: true,
  },
  {
    id: "kafa-pure-ghee",
    name: "Traditional Pure Ghee",
    category: "Ghee",
    unit: "500 ml",
    price_per_unit: 550,
    description: "Golden, aromatic, slow-cooked bilona ghee made from pure cultured butter.",
    image_url: "/images/ghee.jpg",
    is_active: true,
  },
  {
    id: "kafa-fresh-curd",
    name: "Artisanal Fresh Curd",
    category: "Dairy",
    unit: "500 gm",
    price_per_unit: 50,
    description: "Thick, probiotic-rich, naturally set curd with no added stabilizers or gelatin.",
    image_url: "/images/curd.jpg",
    is_active: true,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { itemCount, addItem } = useCart();
  const { data: dbProducts } = useProducts();

  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Mouse parallax motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const bottleRotateY = useTransform(smoothX, [-1, 1], [-6, 6]);
  const bottleRotateX = useTransform(smoothY, [-1, 1], [4, -4]);
  const bottleTranslateX = useTransform(smoothX, [-1, 1], [-12, 12]);
  const bottleTranslateY = useTransform(smoothY, [-1, 1], [-8, 8]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleMotionChange);
    return () => mediaQuery.removeEventListener("change", handleMotionChange);
  }, []);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const x = (event.clientX / window.innerWidth - 0.5) * 2;
    const y = (event.clientY / window.innerHeight - 0.5) * 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleEnterStore = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const handleAddToCart = (product: Partial<Product> & { id: string; name: string; price_per_unit: number; unit: string; category?: string; image_url?: string | null }) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price_per_unit,
      unit: product.unit,
      category: product.category,
      image_url: product.image_url || undefined,
      is_active: true,
    });
    toast.success(`Added ${product.name} to your cart`, {
      description: "Delivering fresh to your doorstep tomorrow morning.",
    });
  };

  // Combine products for display
  const activeProducts = dbProducts && dbProducts.length > 0
    ? dbProducts.filter((p) => p.is_active).slice(0, 4)
    : FALLBACK_PRODUCTS;

  return (
    <div className="kafa-page select-none" onMouseMove={handleMouseMove}>
      {/* ==========================================================
          NAVIGATION (Clean, Minimal, Semi-Transparent, Backdrop Blur)
          ========================================================== */}
      <header className="kafa-nav-header fixed top-0 left-0 right-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* LEFT: KAFA MILK Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-[#4F82EE] rounded-lg p-1"
            aria-label="KAFA MILK Home"
          >
            <div className="w-9 h-9 rounded-xl bg-[#4F82EE] flex items-center justify-center text-white shadow-sm transition-transform duration-300 group-hover:scale-105">
              <Milk className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xl font-bold tracking-tight text-[#20242D] leading-none">
                KAFA MILK
              </span>
              <span className="text-[9px] font-semibold tracking-widest text-[#696F7D] uppercase mt-1">
                PURE • FRESH • DAILY
              </span>
            </div>
          </Link>

          {/* CENTER: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#20242D]">
            <a
              href="#hero"
              className="hover:text-[#4F82EE] transition-colors duration-200 py-1"
            >
              Home
            </a>
            <a
              href="#why-kafa"
              className="hover:text-[#4F82EE] transition-colors duration-200 py-1"
            >
              Why Kafa
            </a>
            <a
              href="#products"
              className="hover:text-[#4F82EE] transition-colors duration-200 py-1"
            >
              Products
            </a>
            <a
              href="#philosophy"
              className="hover:text-[#4F82EE] transition-colors duration-200 py-1"
            >
              Our Story
            </a>
            <a
              href="#contact"
              className="hover:text-[#4F82EE] transition-colors duration-200 py-1"
            >
              Contact
            </a>
          </nav>

          {/* RIGHT: Cart + Order Now */}
          <div className="flex items-center gap-4">
            {/* Cart Trigger */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 rounded-full bg-white border border-[#E6E4DB] text-[#20242D] hover:text-[#4F82EE] hover:border-[#4F82EE] transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#4F82EE]"
              aria-label={`Open shopping cart with ${itemCount} items`}
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#4F82EE] text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                  {itemCount}
                </span>
              )}
            </button>

            {/* Order Now CTA */}
            <button
              onClick={handleEnterStore}
              className="hidden sm:inline-flex kafa-btn-primary px-6 py-2.5 text-sm"
            >
              <span>{user ? "Go to Dashboard" : "Order Now"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#20242D] hover:bg-[#F6F9FE] border border-[#E6E4DB] transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-[#FBFAF7] border-b border-[#E6E4DB] px-6 py-5 space-y-4 shadow-lg"
          >
            <nav className="flex flex-col space-y-3 text-base font-medium text-[#20242D]">
              <a
                href="#hero"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#4F82EE] py-1.5 transition-colors"
              >
                Home
              </a>
              <a
                href="#why-kafa"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#4F82EE] py-1.5 transition-colors"
              >
                Why Kafa
              </a>
              <a
                href="#products"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#4F82EE] py-1.5 transition-colors"
              >
                Products
              </a>
              <a
                href="#philosophy"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#4F82EE] py-1.5 transition-colors"
              >
                Our Story
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-[#4F82EE] py-1.5 transition-colors"
              >
                Contact
              </a>
            </nav>
            <div className="pt-2 border-t border-[#E6E4DB]">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleEnterStore();
                }}
                className="w-full kafa-btn-primary py-3 text-sm"
              >
                <span>{user ? "Go to Dashboard" : "Order Now"}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </motion.div>
        )}
      </header>

      {/* ==========================================================
          HERO SECTION (Commercial Product Photography Style)
          ========================================================== */}
      <section
        id="hero"
        className="relative min-h-screen pt-28 pb-16 lg:pt-32 lg:pb-24 flex items-center overflow-hidden"
      >
        {/* Soft Ambient Light Gradient in #F6F9FE & Cream */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#F6F9FE] blur-3xl opacity-80" />
          <div className="absolute -bottom-10 left-10 w-[420px] h-[420px] rounded-full bg-[#5DC069]/5 blur-3xl" />
          <div className="absolute top-16 right-10 w-[380px] h-[380px] rounded-full bg-[#4F82EE]/5 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* ----------------------------------------------------
                LEFT COLUMN: Text & Benefits (Staggered Animation)
                ---------------------------------------------------- */}
            <div className="lg:col-span-7 flex flex-col justify-center text-left order-2 lg:order-1">
              {/* 4–5 seconds in sequence: Eyebrow badge */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: reducedMotion ? 0 : 4.0,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E6E4DB] shadow-xs mb-5"
              >
                <span className="w-2 h-2 rounded-full bg-[#5DC069] animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider text-[#696F7D] uppercase">
                  FRESH FROM OUR FARMS
                </span>
              </motion.div>

              {/* 5–6 seconds: Main Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 1.0,
                  delay: reducedMotion ? 0 : 5.0,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="font-editorial text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-bold text-[#20242D] leading-[1.04] tracking-tight mb-6"
              >
                Pure milk.
                <br />
                Pure <span className="text-[#4F82EE] italic font-normal">goodness.</span>
              </motion.h1>

              {/* 6–7 seconds: Supporting text */}
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.9,
                  delay: reducedMotion ? 0 : 6.0,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="text-lg sm:text-xl text-[#696F7D] leading-relaxed max-w-xl mb-9"
              >
                Fresh, pure milk delivered to your door every day —
                naturally, honestly, and with care.
              </motion.p>

              {/* 6–7 seconds: Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: reducedMotion ? 0 : 6.3,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="flex flex-wrap items-center gap-4 mb-12"
              >
                <button
                  onClick={handleEnterStore}
                  className="kafa-btn-primary px-8 py-4 text-base tracking-wide rounded-full font-semibold group shadow-lg hover:shadow-xl transition-all"
                >
                  <span>ENTER KAFA MILK</span>
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </button>

                <a
                  href="#products"
                  className="kafa-btn-secondary px-8 py-4 text-base font-medium rounded-full hover:shadow-sm"
                >
                  Our Products
                </a>
              </motion.div>

              {/* HERO TRUST FEATURES (Section 6: Four Small Benefits) */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: reducedMotion ? 0 : 6.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="pt-6 border-t border-[#E6E4DB]/80 grid grid-cols-2 sm:grid-cols-4 gap-4"
              >
                {/* 1. 100% Pure Milk */}
                <div className="kafa-benefit-item">
                  <div className="w-8 h-8 rounded-lg bg-[#5DC069]/10 flex items-center justify-center text-[#5DC069] shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-[#20242D]">100%</span>
                    <span className="text-[11px] text-[#696F7D] leading-tight">Pure Milk</span>
                  </div>
                </div>

                {/* 2. Daily Home Delivery */}
                <div className="kafa-benefit-item">
                  <div className="w-8 h-8 rounded-lg bg-[#4F82EE]/10 flex items-center justify-center text-[#4F82EE] shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-[#20242D]">Daily</span>
                    <span className="text-[11px] text-[#696F7D] leading-tight">Home Delivery</span>
                  </div>
                </div>

                {/* 3. Trusted by Families */}
                <div className="kafa-benefit-item">
                  <div className="w-8 h-8 rounded-lg bg-[#4F82EE]/10 flex items-center justify-center text-[#4F82EE] shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-[#20242D]">Trusted</span>
                    <span className="text-[11px] text-[#696F7D] leading-tight">by Families</span>
                  </div>
                </div>

                {/* 4. No Preservatives */}
                <div className="kafa-benefit-item">
                  <div className="w-8 h-8 rounded-lg bg-[#5DC069]/10 flex items-center justify-center text-[#5DC069] shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-[#20242D]">No</span>
                    <span className="text-[11px] text-[#696F7D] leading-tight">Preservatives</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ----------------------------------------------------
                RIGHT COLUMN: Realistic Product Photography Hero
                ---------------------------------------------------- */}
            <div className="lg:col-span-5 flex items-center justify-center relative order-1 lg:order-2">
              <div className="relative w-full max-w-[480px] lg:max-w-[540px] aspect-square flex items-center justify-center">
                {/* 2-3s in sequence: Milk Splash Aura behind the bottle */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 1.2,
                    delay: reducedMotion ? 0 : 2.0,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="absolute inset-4 rounded-full bg-radial from-white via-[#F6F9FE] to-transparent blur-2xl opacity-90 animate-kafa-aura pointer-events-none"
                />

                {/* Ambient Soft Rings */}
                <div className="absolute inset-0 rounded-full border border-[#4F82EE]/10 scale-95 pointer-events-none" />
                <div className="absolute inset-8 rounded-full border border-[#5DC069]/10 scale-90 pointer-events-none" />

                {/* 3-4s: Floating micro droplets & natural elements */}
                {!reducedMotion && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 3.2, duration: 0.8 }}
                      className="absolute top-12 left-10 w-3.5 h-3.5 rounded-full bg-white/90 shadow-md border border-[#E6E4DB] animate-kafa-drop-1 pointer-events-none"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 3.6, duration: 0.8 }}
                      className="absolute bottom-20 right-8 w-4 h-4 rounded-full bg-white/95 shadow-md border border-[#E6E4DB] animate-kafa-drop-2 pointer-events-none"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 3.8, duration: 0.8 }}
                      className="absolute top-1/3 right-4 w-2.5 h-2.5 rounded-full bg-white shadow-sm pointer-events-none"
                    />
                  </>
                )}

                {/* 1-2s in sequence: Hero Milk Bottle (High-end realistic photography) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: 35 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{
                    duration: 1.2,
                    delay: reducedMotion ? 0 : 1.0,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    rotateY: reducedMotion ? 0 : bottleRotateY,
                    rotateX: reducedMotion ? 0 : bottleRotateX,
                    x: reducedMotion ? 0 : bottleTranslateX,
                    y: reducedMotion ? 0 : bottleTranslateY,
                  }}
                  className="relative z-20 w-full h-full flex items-center justify-center filter drop-shadow-[0_24px_48px_rgba(32,36,45,0.12)]"
                >
                  <picture className="w-full h-full flex items-center justify-center animate-kafa-float">
                    <source srcSet="/images/kafa-hero-bottle.webp" type="image/webp" />
                    <img
                      src="/images/kafa-hero-bottle.jpg"
                      alt="KAFA Milk premium fresh milk bottle"
                      className="w-full h-full object-contain max-h-[540px] select-none pointer-events-none rounded-3xl"
                      loading="eager"
                      fetchPriority="high"
                      onLoad={() => setImageLoaded(true)}
                    />
                  </picture>
                </motion.div>

                {/* Floating Freshness Tag */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 4.5, duration: 0.8 }}
                  className="absolute bottom-6 left-4 bg-white/95 backdrop-blur-md border border-[#E6E4DB] px-3.5 py-2 rounded-2xl shadow-md flex items-center gap-2.5 z-30"
                >
                  <div className="w-6 h-6 rounded-full bg-[#5DC069] flex items-center justify-center text-white text-[12px] font-bold">
                    ✓
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-bold text-[#20242D]">Guaranteed Pure</div>
                    <div className="text-[9px] text-[#696F7D]">From farm to doorstep</div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          SECTION 2: WHY KAFA MILK (Section 8)
          ========================================================== */}
      <section
        id="why-kafa"
        className="py-24 bg-white border-y border-[#E6E4DB] relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Eyebrow & Heading */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-[11px] font-bold tracking-widest text-[#5DC069] uppercase mb-3">
              WHY KAFA MILK
            </span>
            <h2 className="font-editorial text-4xl sm:text-5xl font-bold text-[#20242D] tracking-tight mb-4">
              More than just milk.
            </h2>
            <p className="text-base sm:text-lg text-[#696F7D] leading-relaxed">
              We bring farm-fresh, high-quality milk to your home, ensuring better nutrition for a healthier tomorrow.
            </p>
          </div>

          {/* Four Elegant Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Farm Fresh */}
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.25 }}
              className="kafa-card p-8 flex flex-col text-left group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#5DC069]/10 border border-[#5DC069]/20 flex items-center justify-center text-[#5DC069] mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#20242D] mb-2.5">
                Farm Fresh
              </h3>
              <p className="text-sm text-[#696F7D] leading-relaxed">
                Sourced directly from trusted farms.
              </p>
            </motion.div>

            {/* 2. Pure & Safe */}
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.25 }}
              className="kafa-card p-8 flex flex-col text-left group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#4F82EE]/10 border border-[#4F82EE]/20 flex items-center justify-center text-[#4F82EE] mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#20242D] mb-2.5">
                Pure & Safe
              </h3>
              <p className="text-sm text-[#696F7D] leading-relaxed">
                Hygienic processing and quality checks.
              </p>
            </motion.div>

            {/* 3. Rich in Nutrition */}
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.25 }}
              className="kafa-card p-8 flex flex-col text-left group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#5DC069]/10 border border-[#5DC069]/20 flex items-center justify-center text-[#5DC069] mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#20242D] mb-2.5">
                Rich in Nutrition
              </h3>
              <p className="text-sm text-[#696F7D] leading-relaxed">
                Packed with essential vitamins and minerals.
              </p>
            </motion.div>

            {/* 4. Daily Delivery */}
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ duration: 0.25 }}
              className="kafa-card p-8 flex flex-col text-left group"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#4F82EE]/10 border border-[#4F82EE]/20 flex items-center justify-center text-[#4F82EE] mb-6 group-hover:scale-110 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#20242D] mb-2.5">
                Daily Delivery
              </h3>
              <p className="text-sm text-[#696F7D] leading-relaxed">
                Fresh milk delivered to your doorstep.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          SECTION 3: OUR PRODUCTS (Catalog Highlights)
          ========================================================== */}
      <section id="products" className="py-24 bg-[#FBFAF7] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-[11px] font-bold tracking-widest text-[#4F82EE] uppercase block mb-2">
                DAILY FRESH PRODUCTS
              </span>
              <h2 className="font-editorial text-4xl sm:text-5xl font-bold text-[#20242D] tracking-tight">
                Pure dairy for your family.
              </h2>
            </div>
            <button
              onClick={() => navigate("/products?category=Milk")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#4F82EE] hover:text-[#3f72dc] transition-colors"
            >
              <span>View Full Catalog</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeProducts.map((product) => (
              <div
                key={product.id}
                className="kafa-card overflow-hidden flex flex-col h-full group"
              >
                {/* Product Image Container */}
                <div className="relative aspect-4/3 bg-[#F6F9FE] overflow-hidden">
                  <img
                    src={product.image_url || "/images/buffalo-milk.jpg"}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 text-[#20242D] shadow-xs">
                      {product.category || "Dairy"}
                    </span>
                  </div>
                </div>

                {/* Product Details */}
                <div className="p-6 flex-1 flex flex-col justify-between text-left">
                  <div>
                    <h3 className="font-bold text-lg text-[#20242D] mb-1 group-hover:text-[#4F82EE] transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-[#696F7D] line-clamp-2 mb-4 leading-relaxed">
                      {product.description || "Farm fresh dairy delivered directly to your doorstep."}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#E6E4DB] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#696F7D] block">Price</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-[#20242D]">
                          ₹{product.price_per_unit}
                        </span>
                        <span className="text-xs text-[#696F7D]">
                          / {product.unit}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleAddToCart({
                          id: product.id,
                          name: product.name,
                          price_per_unit: product.price_per_unit,
                          unit: product.unit,
                          category: product.category,
                          image_url: product.image_url,
                        })
                      }
                      className="p-2.5 rounded-full bg-[#4F82EE] text-white hover:bg-[#3f72dc] transition-all shadow-sm group-hover:shadow-md hover:scale-105"
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==========================================================
          SECTION 4: PHILOSOPHY / THE KAFA STANDARD (Section 9)
          ========================================================== */}
      <section
        id="philosophy"
        className="py-24 bg-white border-t border-[#E6E4DB] relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold tracking-widest text-[#5DC069] uppercase block mb-3">
              THE KAFA STANDARD
            </span>
            <h2 className="font-editorial text-4xl sm:text-5xl font-bold text-[#20242D] tracking-tight mb-4">
              Nothing ordinary about <em>fresh.</em>
            </h2>
            <p className="text-base sm:text-lg text-[#696F7D] leading-relaxed">
              We believe everyday essentials deserve extraordinary care. From the farm to your doorstep,
              every bottle follows one simple standard — pure, fresh, and honest.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="kafa-card p-8 text-left">
              <span className="text-xs font-bold text-[#4F82EE] tracking-wider uppercase block mb-4">
                01 / PURITY
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#4F82EE]/10 flex items-center justify-center text-[#4F82EE] mb-5">
                <Milk className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#20242D] mb-3">
                Pure by nature
              </h3>
              <p className="text-sm text-[#696F7D] leading-relaxed">
                Carefully sourced milk with nothing unnecessary added. No water, no chemicals, no milk powder.
              </p>
            </div>

            <div className="kafa-card p-8 text-left border-[#4F82EE]/30 bg-[#F6F9FE]/50">
              <span className="text-xs font-bold text-[#5DC069] tracking-wider uppercase block mb-4">
                02 / FRESHNESS
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#5DC069]/10 flex items-center justify-center text-[#5DC069] mb-5">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#20242D] mb-3">
                Fresh every morning
              </h3>
              <p className="text-sm text-[#696F7D] leading-relaxed">
                Chilled immediately upon collection, cold-chain protected, and delivered before the sun rises.
              </p>
            </div>

            <div className="kafa-card p-8 text-left">
              <span className="text-xs font-bold text-[#4F82EE] tracking-wider uppercase block mb-4">
                03 / CONVENIENCE
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#4F82EE]/10 flex items-center justify-center text-[#4F82EE] mb-5">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-editorial text-2xl font-bold text-[#20242D] mb-3">
                Made for your home
              </h3>
              <p className="text-sm text-[#696F7D] leading-relaxed">
                A seamless morning ritual with simple calendar subscriptions and hassle-free doorstep delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          SECTION 5: BOTTOM CTA SECTION (Section 10)
          ========================================================== */}
      <section
        id="contact"
        className="py-24 bg-[#F6F9FE] border-t border-[#E6E4DB] relative overflow-hidden"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-white border border-[#E6E4DB] text-xs font-bold tracking-widest text-[#4F82EE] uppercase mb-6 shadow-xs">
            START YOUR DAILY DELIVERY
          </span>

          <h2 className="font-editorial text-4xl sm:text-6xl font-bold text-[#20242D] tracking-tight leading-tight mb-6">
            Fresh milk.
            <br />
            Delivered with <span className="text-[#4F82EE] italic">care.</span>
          </h2>

          <p className="text-lg text-[#696F7D] max-w-xl mx-auto mb-10 leading-relaxed">
            Subscribe today and receive authentic, fresh, farm milk at your doorstep by 6:30 AM every morning.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={handleEnterStore}
              className="kafa-btn-primary px-10 py-4 text-base font-semibold rounded-full shadow-lg hover:shadow-xl transition-all"
            >
              <span>SHOP KAFA MILK</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <a
              href="tel:+911234567890"
              className="kafa-btn-secondary px-8 py-4 text-base rounded-full"
            >
              <Phone className="w-4 h-4 mr-2 text-[#4F82EE]" />
              <span>Talk to Us</span>
            </a>
          </div>
        </div>
      </section>

      {/* Cart Sheet Component */}
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
};

export default Index;