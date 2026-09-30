import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    MessageCircle,
    Phone,
    Mail,
    HelpCircle,
    ChevronRight,
    Send,
    Clock,
    CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Ticket {
    id: string;
    subject: string;
    status: "open" | "in_progress" | "resolved";
    date: string;
    category: string;
}

const CustomerSupport = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"faq" | "contact" | "tickets">("faq");
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        subject: "",
        message: "",
    });

    const [tickets] = useState<Ticket[]>([
        {
            id: "TKT001",
            subject: "Delivery not received",
            status: "resolved",
            date: "2024-01-10",
            category: "Delivery",
        },
        {
            id: "TKT002",
            subject: "Payment issue",
            status: "in_progress",
            date: "2024-01-12",
            category: "Payment",
        },
    ]);

    const faqs = [
        {
            category: "Orders & Delivery",
            questions: [
                {
                    q: "What are your delivery timings?",
                    a: "We deliver fresh milk every morning between 5:00 AM to 8:00 AM. You can also schedule afternoon deliveries between 4:00 PM to 7:00 PM.",
                },
                {
                    q: "Can I pause my subscription?",
                    a: "Yes! You can pause your subscription anytime from the dashboard. Just select the dates you want to skip, and we'll resume delivery automatically after that.",
                },
                {
                    q: "How do I track my order?",
                    a: "You can track your order in real-time from the Dashboard. Click on 'Track Delivery' to see the current status and estimated delivery time.",
                },
                {
                    q: "What if I'm not home during delivery?",
                    a: "Our delivery partners will leave the milk at your doorstep in a secure manner. You can also add specific delivery instructions in your address settings.",
                },
            ],
        },
        {
            category: "Payments & Wallet",
            questions: [
                {
                    q: "What payment methods do you accept?",
                    a: "We accept UPI, Credit/Debit Cards, Net Banking, and Wallet payments through PhonePe integration. You can also maintain a wallet balance for seamless transactions.",
                },
                {
                    q: "How do I add money to my wallet?",
                    a: "Go to your Dashboard and click on 'Add Money' in the Wallet section. Choose your amount and complete the payment through PhonePe.",
                },
                {
                    q: "Are my payments secure?",
                    a: "Absolutely! All payments are processed through PhonePe's secure payment gateway with bank-level encryption. We never store your card details.",
                },
                {
                    q: "Can I get a refund?",
                    a: "Yes, refunds are processed within 5-7 business days to your original payment method or wallet balance, depending on your preference.",
                },
            ],
        },
        {
            category: "Products & Quality",
            questions: [
                {
                    q: "Is your milk pasteurized?",
                    a: "Yes, all our milk products are pasteurized and undergo strict quality checks to ensure freshness and safety.",
                },
                {
                    q: "Do you offer organic products?",
                    a: "Yes! We have a range of organic milk, curd, and ghee products. Look for the 'Organic' tag in our product catalog.",
                },
                {
                    q: "What is your return policy?",
                    a: "If you're not satisfied with the product quality, contact us within 24 hours of delivery for a replacement or refund.",
                },
            ],
        },
        {
            category: "Account & Subscription",
            questions: [
                {
                    q: "How do I change my subscription plan?",
                    a: "Go to the Subscription Card on your dashboard and click 'Manage Subscription'. You can upgrade, downgrade, or modify your plan anytime.",
                },
                {
                    q: "Can I have multiple delivery addresses?",
                    a: "Yes! You can add and manage multiple delivery addresses from the Address Management section.",
                },
                {
                    q: "How do I cancel my subscription?",
                    a: "You can cancel your subscription anytime from the dashboard. There are no cancellation fees, and you'll receive a prorated refund if applicable.",
                },
            ],
        },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.subject || !formData.message) {
            toast.error("Please fill all fields");
            return;
        }
        toast.success("Your message has been sent! We'll get back to you within 24 hours.");
        setFormData({ name: "", email: "", subject: "", message: "" });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "resolved":
                return "bg-green-500/10 text-green-500 border-green-500/20";
            case "in_progress":
                return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case "open":
                return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            default:
                return "bg-gray-500/10 text-gray-500 border-gray-500/20";
        }
    };

    return (
        <div className="min-h-screen bg-muted/30">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/dashboard")}
                            className="text-white hover:bg-white/20"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Customer Support</h1>
                            <p className="text-white/80 text-sm">We're here to help you 24/7</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Quick Contact Options */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid md:grid-cols-3 gap-4 mb-8"
                >
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                                <Phone className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="font-semibold mb-1">Call Us</h3>
                            <p className="text-sm text-muted-foreground mb-2">Mon-Sat, 9 AM - 6 PM</p>
                            <a href="tel:1800-123-4567" className="text-primary font-medium">
                                1800-123-4567
                            </a>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                                <Mail className="w-6 h-6 text-blue-500" />
                            </div>
                            <h3 className="font-semibold mb-1">Email Us</h3>
                            <p className="text-sm text-muted-foreground mb-2">Response within 24 hours</p>
                            <a href="mailto:support@dailydrop.com" className="text-primary font-medium">
                                support@dailydrop.com
                            </a>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                                <MessageCircle className="w-6 h-6 text-purple-500" />
                            </div>
                            <h3 className="font-semibold mb-1">Live Chat</h3>
                            <p className="text-sm text-muted-foreground mb-2">Available 24/7</p>
                            <Button variant="link" className="text-primary font-medium p-0 h-auto">
                                Start Chat
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card>
                        <CardHeader>
                            <div className="flex gap-2 border-b">
                                <Button
                                    variant={activeTab === "faq" ? "default" : "ghost"}
                                    onClick={() => setActiveTab("faq")}
                                    className="rounded-b-none"
                                >
                                    <HelpCircle className="w-4 h-4 mr-2" />
                                    FAQs
                                </Button>
                                <Button
                                    variant={activeTab === "contact" ? "default" : "ghost"}
                                    onClick={() => setActiveTab("contact")}
                                    className="rounded-b-none"
                                >
                                    <Send className="w-4 h-4 mr-2" />
                                    Contact Us
                                </Button>
                                <Button
                                    variant={activeTab === "tickets" ? "default" : "ghost"}
                                    onClick={() => setActiveTab("tickets")}
                                    className="rounded-b-none"
                                >
                                    <Clock className="w-4 h-4 mr-2" />
                                    My Tickets
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6">
                            {/* FAQ Tab */}
                            {activeTab === "faq" && (
                                <div className="space-y-6">
                                    {faqs.map((category, idx) => (
                                        <div key={idx}>
                                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                                <ChevronRight className="w-5 h-5 text-primary" />
                                                {category.category}
                                            </h3>
                                            <Accordion type="single" collapsible className="space-y-2">
                                                {category.questions.map((faq, qIdx) => (
                                                    <AccordionItem key={qIdx} value={`${idx}-${qIdx}`} className="border rounded-lg px-4">
                                                        <AccordionTrigger className="hover:no-underline">
                                                            {faq.q}
                                                        </AccordionTrigger>
                                                        <AccordionContent className="text-muted-foreground">
                                                            {faq.a}
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ))}
                                            </Accordion>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Contact Form Tab */}
                            {activeTab === "contact" && (
                                <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="name">Your Name *</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="John Doe"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="email">Email Address *</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="subject">Subject *</Label>
                                        <Input
                                            id="subject"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            placeholder="How can we help you?"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="message">Message *</Label>
                                        <Textarea
                                            id="message"
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            placeholder="Please describe your issue or question in detail..."
                                            rows={6}
                                        />
                                    </div>

                                    <Button type="submit" size="lg" className="w-full md:w-auto">
                                        <Send className="w-4 h-4 mr-2" />
                                        Send Message
                                    </Button>
                                </form>
                            )}

                            {/* Tickets Tab */}
                            {activeTab === "tickets" && (
                                <div className="space-y-4">
                                    {tickets.length === 0 ? (
                                        <div className="text-center py-12">
                                            <CheckCircle2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                                            <h3 className="text-xl font-semibold mb-2">No Support Tickets</h3>
                                            <p className="text-muted-foreground">You haven't raised any support tickets yet</p>
                                        </div>
                                    ) : (
                                        tickets.map((ticket, index) => (
                                            <motion.div
                                                key={ticket.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <Card className="hover:shadow-md transition-shadow">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <Badge variant="outline">{ticket.id}</Badge>
                                                                    <Badge className={getStatusColor(ticket.status)}>
                                                                        {ticket.status.replace("_", " ").toUpperCase()}
                                                                    </Badge>
                                                                </div>
                                                                <h4 className="font-semibold mb-1">{ticket.subject}</h4>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Category: {ticket.category} • Created: {ticket.date}
                                                                </p>
                                                            </div>
                                                            <Button variant="ghost" size="sm">
                                                                View Details
                                                                <ChevronRight className="w-4 h-4 ml-1" />
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </motion.div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </main>
        </div>
    );
};

export default CustomerSupport;
