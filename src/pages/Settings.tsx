import { motion } from 'framer-motion';
import { Lock, Bell, Shield, Globe, Moon, Sun } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

const Settings = () => {
    const [notifications, setNotifications] = useState({
        email: true,
        push: false,
        sms: true,
        orderUpdates: true,
        promotions: false,
    });

    const [privacy, setPrivacy] = useState({
        profileVisible: true,
        activityTracking: false,
        dataSharing: false,
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
            {/* Header */}
            <div className="bg-card border-b">
                <div className="container mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold">Account Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your account preferences and security
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Security Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Lock className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Security</CardTitle>
                                        <CardDescription>Password and authentication settings</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 border rounded-lg">
                                    <p className="font-medium mb-1">Password</p>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Last changed 30 days ago
                                    </p>
                                    <button className="text-sm text-primary hover:underline">
                                        Change Password
                                    </button>
                                </div>

                                <div className="p-4 border rounded-lg">
                                    <p className="font-medium mb-1">Two-Factor Authentication</p>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Add an extra layer of security
                                    </p>
                                    <button className="text-sm text-primary hover:underline">
                                        Enable 2FA
                                    </button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Notification Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Notifications</CardTitle>
                                        <CardDescription>Manage how you receive updates</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <Label htmlFor="email-notif">Email Notifications</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive updates via email
                                        </p>
                                    </div>
                                    <Switch
                                        id="email-notif"
                                        checked={notifications.email}
                                        onCheckedChange={(checked) =>
                                            setNotifications({ ...notifications, email: checked })
                                        }
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <Label htmlFor="push-notif">Push Notifications</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive push notifications on your device
                                        </p>
                                    </div>
                                    <Switch
                                        id="push-notif"
                                        checked={notifications.push}
                                        onCheckedChange={(checked) =>
                                            setNotifications({ ...notifications, push: checked })
                                        }
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <Label htmlFor="sms-notif">SMS Notifications</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive text messages for important updates
                                        </p>
                                    </div>
                                    <Switch
                                        id="sms-notif"
                                        checked={notifications.sms}
                                        onCheckedChange={(checked) =>
                                            setNotifications({ ...notifications, sms: checked })
                                        }
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <Label htmlFor="order-notif">Order Updates</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Get notified about order status changes
                                        </p>
                                    </div>
                                    <Switch
                                        id="order-notif"
                                        checked={notifications.orderUpdates}
                                        onCheckedChange={(checked) =>
                                            setNotifications({ ...notifications, orderUpdates: checked })
                                        }
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <Label htmlFor="promo-notif">Promotions & Offers</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Receive special offers and discounts
                                        </p>
                                    </div>
                                    <Switch
                                        id="promo-notif"
                                        checked={notifications.promotions}
                                        onCheckedChange={(checked) =>
                                            setNotifications({ ...notifications, promotions: checked })
                                        }
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Privacy Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Privacy & Security</CardTitle>
                                        <CardDescription>Control your data and privacy</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <Label htmlFor="profile-visible">Profile Visibility</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Make your profile visible to others
                                        </p>
                                    </div>
                                    <Switch
                                        id="profile-visible"
                                        checked={privacy.profileVisible}
                                        onCheckedChange={(checked) =>
                                            setPrivacy({ ...privacy, profileVisible: checked })
                                        }
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <Label htmlFor="activity-tracking">Activity Tracking</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Allow us to track your activity for better recommendations
                                        </p>
                                    </div>
                                    <Switch
                                        id="activity-tracking"
                                        checked={privacy.activityTracking}
                                        onCheckedChange={(checked) =>
                                            setPrivacy({ ...privacy, activityTracking: checked })
                                        }
                                    />
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <Label htmlFor="data-sharing">Data Sharing</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Share anonymized data with partners
                                        </p>
                                    </div>
                                    <Switch
                                        id="data-sharing"
                                        checked={privacy.dataSharing}
                                        onCheckedChange={(checked) =>
                                            setPrivacy({ ...privacy, dataSharing: checked })
                                        }
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Appearance */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Globe className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle>Appearance</CardTitle>
                                        <CardDescription>Customize your experience</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-4 border rounded-lg">
                                    <p className="font-medium mb-1">Theme</p>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Choose your preferred theme
                                    </p>
                                    <div className="flex gap-2">
                                        <button className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
                                            <Sun className="w-4 h-4" />
                                            Light
                                        </button>
                                        <button className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
                                            <Moon className="w-4 h-4" />
                                            Dark
                                        </button>
                                        <button className="px-4 py-2 border rounded-lg hover:bg-accent transition-colors">
                                            Auto
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 border rounded-lg">
                                    <p className="font-medium mb-1">Language</p>
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Select your preferred language
                                    </p>
                                    <select className="w-full px-3 py-2 border rounded-lg bg-background">
                                        <option>English</option>
                                        <option>Hindi</option>
                                        <option>Spanish</option>
                                    </select>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
