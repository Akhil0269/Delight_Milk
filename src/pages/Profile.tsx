import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Edit, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useOrders } from '@/hooks/useOrders';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useFavorites } from '@/hooks/useFavorites';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user } = useAuth();
    const { data: profile, isLoading, isError, error, refetch } = useProfile();
    const { data: orders, isLoading: ordersLoading } = useOrders();
    const { data: subscriptions, isLoading: subsLoading } = useSubscriptions();
    const navigate = useNavigate();
    const { count: favoriteCount } = useFavorites();

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                    <h2 className="text-xl font-semibold">Loading Profile</h2>
                    <p className="text-sm text-muted-foreground">Fetching your profile details from the database...</p>
                </Card>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-4 border-destructive/50">
                    <AlertCircle className="w-10 h-10 text-destructive mx-auto" />
                    <h2 className="text-xl font-semibold">Unable to Load Profile</h2>
                    <p className="text-sm text-muted-foreground">{error?.message || "A database error occurred while fetching your profile."}</p>
                    <div className="flex gap-3 justify-center pt-2">
                        <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
                        <Button onClick={() => refetch()}>Retry</Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-4">
                    <User className="w-10 h-10 text-muted-foreground mx-auto" />
                    <h2 className="text-xl font-semibold">Profile Not Found</h2>
                    <p className="text-sm text-muted-foreground">Your profile record could not be found in the database.</p>
                    <div className="flex gap-3 justify-center pt-2">
                        <Button variant="outline" onClick={() => navigate("/dashboard")}>Dashboard</Button>
                        <Button onClick={() => navigate("/profile/edit")}>Create Profile</Button>
                    </div>
                </Card>
            </div>
        );
    }

    const displayName = profile.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const email = profile.email || user?.email || 'user@example.com';
    const activeSubsCount = subscriptions?.filter(s => s.is_active)?.length ?? 0;
    const totalOrdersCount = orders?.length ?? 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
            {/* Header */}
            <div className="bg-card border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">My Profile</h1>
                            <p className="text-muted-foreground mt-1">
                                View and manage your profile information
                            </p>
                        </div>
                        <Button onClick={() => navigate('/profile/edit')}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Profile
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Profile Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card>
                            <CardHeader className="text-center">
                                <div className="flex justify-center mb-4">
                                    <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                                        <AvatarImage
                                            src={profile.avatar_url || user?.user_metadata?.avatar_url}
                                            alt={displayName}
                                        />
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-2xl font-semibold">
                                            {getInitials(displayName)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <CardTitle className="text-2xl">{displayName}</CardTitle>
                                <CardDescription className="text-base">{email}</CardDescription>
                                <div className="flex justify-center gap-2 mt-4">
                                    <Badge variant="secondary">Active Member</Badge>
                                    {profile.is_blocked ? (
                                        <Badge variant="destructive">Account Suspended</Badge>
                                    ) : (
                                        <Badge className="bg-green-500">Verified</Badge>
                                    )}
                                </div>
                            </CardHeader>
                        </Card>
                    </motion.div>

                    {/* Personal Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card>
                            <CardHeader>
                                <CardTitle>Personal Information</CardTitle>
                                <CardDescription>Your account details and contact information</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Full Name</p>
                                        <p className="font-medium">{displayName}</p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Email Address</p>
                                        <p className="font-medium">{email}</p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Phone className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Phone Number</p>
                                        <p className="font-medium">{profile.phone || 'Not provided'}</p>
                                    </div>
                                </div>

                                <Separator />

                                <div
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                                    onClick={() => navigate('/settings/address')}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Delivery Address</p>
                                            <p className="font-medium">{profile.address || 'Not provided'}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-primary font-medium hover:underline">
                                        {profile.address ? 'Manage' : 'Add'}
                                    </span>
                                </div>

                                <Separator />

                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Member Since</p>
                                        <p className="font-medium">
                                            {user?.created_at
                                                ? new Date(user.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })
                                                : 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Account Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="grid md:grid-cols-3 gap-4">
                            <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate('/orders')}>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary">
                                            {ordersLoading ? (
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                            ) : (
                                                totalOrdersCount
                                            )}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">Total Orders</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="cursor-pointer hover:border-green-500/50 transition-colors" onClick={() => navigate('/dashboard')}>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-green-600">
                                            {subsLoading ? (
                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-green-600" />
                                            ) : (
                                                activeSubsCount
                                            )}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">Active Subscriptions</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="cursor-pointer hover:border-purple-500/50 transition-colors" onClick={() => navigate('/favorites')}>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-purple-600">
                                            {favoriteCount}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">Favorite Products</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
