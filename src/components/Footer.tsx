import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Milk, Mail, Phone, MapPin, Facebook, Instagram, Twitter,
  Linkedin, Youtube, Download, Shield, Award, Heart,
  TrendingUp, Users, Globe, FileText, HelpCircle, MessageCircle
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const companyLinks = [
    { label: "About Delight Milk", href: "/about" },
    { label: "Our Story", href: "/story" },
    { label: "Team", href: "/team" },
    { label: "Careers", href: "/careers" },
    { label: "Press & Media", href: "/press" },
    { label: "Partners", href: "/partners" },
  ];

  const supportLinks = [
    { label: "Help Center", href: "/help" },
    { label: "Contact Us", href: "/support" },
    { label: "FAQs", href: "/faq" },
    { label: "Track Order", href: "/orders" },
    { label: "Report Issue", href: "/support" },
    { label: "Live Chat", href: "/support" },
  ];

  const legalLinks = [
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Cancellation Policy", href: "/cancellation-policy" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Data Protection", href: "/data-protection" },
  ];

  const quickLinks = [
    { label: "Subscription Plans", href: "/plans" },
    { label: "Loyalty Program", href: "/rewards" },
    { label: "Refer & Earn", href: "/referral" },
    { label: "Corporate Accounts", href: "/corporate" },
    { label: "Quality Certificates", href: "/quality" },
    { label: "Sustainability", href: "/sustainability" },
  ];

  const popularProducts = [
    { label: "Buffalo Milk", href: "/products?category=Milk" },
    { label: "Cow Milk", href: "/products?category=Milk" },
    { label: "Fresh Curd", href: "/products?category=Dairy" },
    { label: "Pure Ghee", href: "/products?category=Ghee" },
    { label: "Paneer", href: "/products?category=Dairy" },
    { label: "Buttermilk", href: "/products?category=Dairy" },
  ];

  const cities = [
    "Palakollu",
    "Medapadu",
    "Kattukalava",
    "Ullamparru",
    "Adavipalem",
    "Kontheru",
    "Sangatrev",
    "Poolapalli",
    "Nagarajupeta",
    "Chintalagaaruvu",
    "Neerullipalem",
    "Kombotlapalem"
  ];

  const socialLinks = [
    { icon: Facebook, href: "https://facebook.com/delightmilk", label: "Facebook" },
    { icon: Instagram, href: "https://instagram.com/delightmilk", label: "Instagram" },
    { icon: Twitter, href: "https://twitter.com/delightmilk", label: "Twitter" },
    { icon: Linkedin, href: "https://linkedin.com/company/delightmilk", label: "LinkedIn" },
    { icon: Youtube, href: "https://youtube.com/delightmilk", label: "YouTube" },
  ];

  return (
    <footer className="bg-[#FBFAF7] border-t border-[#E6E4DB] mt-auto text-[#20242D]">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#4F82EE] flex items-center justify-center shadow-sm">
                <Milk className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-[#20242D]">
                KAFA <span className="text-[#4F82EE]">MILK</span>
              </span>
            </Link>
            <p className="text-sm text-[#696F7D] mb-4 max-w-xs leading-relaxed">
              Fresh, pure, and delivered daily. Your trusted partner for farm-fresh dairy products.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-sm text-[#696F7D]">
                <Mail className="w-4 h-4 text-[#4F82EE]" />
                <a href="mailto:support@kafamilk.com" className="hover:text-[#4F82EE] transition-colors">
                  support@kafamilk.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#696F7D]">
                <Phone className="w-4 h-4 text-[#4F82EE]" />
                <a href="tel:+911234567890" className="hover:text-[#4F82EE] transition-colors">
                  +91 123 456 7890
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Mumbai, India</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Company
            </h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              Support
            </h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Quick Links
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Products */}
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              Popular Products
            </h3>
            <ul className="space-y-2">
              {popularProducts.map((product) => (
                <li key={product.label}>
                  <Link
                    to={product.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {product.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Service Areas */}
        <div className="mb-8">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            We Deliver In
          </h3>
          <div className="flex flex-wrap gap-2">
            {cities.map((city) => (
              <span
                key={city}
                className="px-3 py-1 rounded-full bg-muted text-sm text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
              >
                {city}
              </span>
            ))}
          </div>
        </div>

        <Separator className="my-8" />

        {/* App Download Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Download Our App
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get the best experience with our mobile app. Order on the go!
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Google Play
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                App Store
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Trust & Safety
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">ISO Certified</p>
                  <p className="text-xs text-muted-foreground">Quality Assured</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">100% Safe</p>
                  <p className="text-xs text-muted-foreground">Secure Payments</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Legal Links */}
        <div className="mb-8">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Legal
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[#696F7D] text-center md:text-left">
              © {currentYear} KAFA MILK. All rights reserved. Made with{" "}
              <Heart className="w-3 h-3 inline text-red-500 fill-red-500" /> in India
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/sitemap" className="hover:text-primary transition-colors">
                Sitemap
              </Link>
              <span>•</span>
              <Link to="/accessibility" className="hover:text-primary transition-colors">
                Accessibility
              </Link>
              <span>•</span>
              <a
                href="#"
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                <MessageCircle className="w-3 h-3" />
                Feedback
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
