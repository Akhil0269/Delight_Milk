import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user } = useAuth();
    const { data: profile } = useProfile();
    const navigate = useNavigate();

    const getInitials = (name?: string) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
    const email = user?.email || 'user@example.com';

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
                                            src={user?.user_metadata?.avatar_url}
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
                                    <Badge className="bg-green-500">Verified</Badge>
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
                                        <p className="font-medium">{profile?.phone || 'Not provided'}</p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Address</p>
                                        <p className="font-medium">{profile?.address || 'Not provided'}</p>
                                    </div>
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
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-primary">12</p>
                                        <p className="text-sm text-muted-foreground mt-1">Total Orders</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-green-600">2</p>
                                        <p className="text-sm text-muted-foreground mt-1">Active Subscriptions</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-purple-600">5</p>
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
