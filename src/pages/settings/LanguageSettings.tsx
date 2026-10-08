import { motion } from "framer-motion";
import { ArrowLeft, Globe, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";

interface LanguageOption {
    code: string;
    name: string;
    nativeName: string;
    isAvailable: boolean;
}

const LANGUAGES: LanguageOption[] = [
    { code: "en", name: "English", nativeName: "English", isAvailable: true },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी", isAvailable: false },
    { code: "te", name: "Telugu", nativeName: "తెలుగు", isAvailable: false },
];

const LanguageSettings = () => {
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
                            <h1 className="text-2xl font-bold">Language Preferences</h1>
                            <p className="text-sm text-muted-foreground">
                                View and manage your display language
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-2xl">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Globe className="w-6 h-6" />
                                </div>
                                <div>
                                    <CardTitle>Display Language</CardTitle>
                                    <CardDescription>
                                        Delight Milk currently operates in English. Regional language support is in development.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {LANGUAGES.map((lang) => (
                                <div
                                    key={lang.code}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                                        lang.isAvailable
                                            ? "bg-primary/5 border-primary/40 shadow-sm"
                                            : "bg-muted/40 border-muted opacity-80"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-foreground">
                                                    {lang.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-medium">
                                                    ({lang.nativeName})
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {lang.isAvailable
                                                    ? "Active system language across all orders & deliveries"
                                                    : "Translation bundle in preparation for future release"}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        {lang.isAvailable ? (
                                            <Badge variant="default" className="flex items-center gap-1.5 bg-green-600 hover:bg-green-600">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="flex items-center gap-1.5 text-muted-foreground border-dashed">
                                                <Clock className="w-3 h-3" />
                                                Upcoming
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}

                            <div className="mt-6 p-4 rounded-lg bg-muted text-xs text-muted-foreground text-center">
                                Regional localization is scheduled for a future update. No unsupported fake persistence is created.
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
};

export default LanguageSettings;
