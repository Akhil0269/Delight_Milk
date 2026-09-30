import { motion } from "framer-motion";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";

const SubscriptionSettings = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-muted/30">
            <DashboardNavbar />

            {/* Header */}
            <div className="bg-card border-b sticky top-16 md:top-20 z-30">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">Subscription Settings</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage your active subscriptions
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <Calendar className="w-8 h-8" />
                    </div>
                </div>
                <h2 className="text-xl font-semibold mb-2">Coming Soon</h2>
                <p>Subscription management features are being implemented.</p>
            </div>
        </div>
    );
};

export default SubscriptionSettings;
