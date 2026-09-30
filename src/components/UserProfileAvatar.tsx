import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Settings,
    Package,
    Heart,
    CreditCard,
    LogOut,
    ChevronDown,
    Edit,
    Bell,
    Shield,
    Calendar,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserProfileAvatarProps {
    showName?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const UserProfileAvatar = ({ showName = false, size = 'md', className = '' }: UserProfileAvatarProps) => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get user initials
    const getInitials = (name?: string) => {
        if (!name) return 'U';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    // Get user display name
    const getUserName = () => {
        if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
        if (user?.email) return user.email.split('@')[0];
        return 'User';
    };

    // Get user email
    const getUserEmail = () => {
        return user?.email || 'user@example.com';
    };

    // Avatar size classes
    const sizeClasses = {
        sm: 'h-8 w-8 text-xs',
        md: 'h-10 w-10 text-sm',
        lg: 'h-12 w-12 text-base',
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Handle logout
    const handleLogout = async () => {
        try {
            await signOut();
            toast.success('Logged out successfully');
            navigate('/auth');
        } catch (error) {
            toast.error('Failed to logout');
            console.error('Logout error:', error);
        }
    };

    // Menu items
    const menuItems = [
        {
            section: 'Profile',
            items: [
                {
                    icon: User,
                    label: 'View Profile',
                    description: 'See your profile details',
                    onClick: () => {
                        navigate('/profile');
                        setIsOpen(false);
                    },
                },
                {
                    icon: Edit,
                    label: 'Edit Profile',
                    description: 'Update your information',
                    onClick: () => {
                        navigate('/profile/edit');
                        setIsOpen(false);
                    },
                },
            ],
        },
        {
            section: 'Activity',
            items: [
                {
                    icon: Package,
                    label: 'Order History',
                    description: 'View past orders',
                    badge: '12',
                    onClick: () => {
                        navigate('/orders');
                        setIsOpen(false);
                    },
                },
                {
                    icon: Calendar,
                    label: 'Subscriptions',
                    description: 'Manage your subscriptions',
                    onClick: () => {
                        navigate('/dashboard');
                        setIsOpen(false);
                    },
                },
                {
                    icon: Heart,
                    label: 'Favorites',
                    description: 'Saved products',
                    onClick: () => {
                        navigate('/favorites');
                        setIsOpen(false);
                    },
                },
            ],
        },
        {
            section: 'Account',
            items: [
                {
                    icon: CreditCard,
                    label: 'Wallet & Payments',
                    description: 'Manage payment methods',
                    onClick: () => {
                        navigate('/dashboard');
                        setIsOpen(false);
                    },
                },
                {
                    icon: Settings,
                    label: 'Account Settings',
                    description: 'Password, privacy & more',
                    onClick: () => {
                        navigate('/settings');
                        setIsOpen(false);
                    },
                },
                {
                    icon: Bell,
                    label: 'Notifications',
                    description: 'Manage preferences',
                    onClick: () => {
                        navigate('/settings/notifications');
                        setIsOpen(false);
                    },
                },
                {
                    icon: Shield,
                    label: 'Privacy & Security',
                    description: 'Control your data',
                    onClick: () => {
                        navigate('/settings/privacy');
                        setIsOpen(false);
                    },
                },
            ],
        },
    ];

    if (!user) {
        return null;
    }

    return (
        <>
            <div className={`relative ${className}`} ref={dropdownRef}>
                {/* Avatar Button */}
                <Button
                    variant="ghost"
                    className={`flex items-center gap-2 rounded-full hover:bg-accent transition-colors ${isOpen ? 'bg-accent' : ''
                        }`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Avatar className={`${sizeClasses[size]} ring-2 ring-primary/10 hover:ring-primary/30 transition-all`}>
                        <AvatarImage
                            src={user?.user_metadata?.avatar_url}
                            alt={getUserName()}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-semibold">
                            {getInitials(getUserName())}
                        </AvatarFallback>
                    </Avatar>

                    {showName && (
                        <>
                            <div className="hidden md:flex flex-col items-start">
                                <span className="text-sm font-medium">{getUserName()}</span>
                                <span className="text-xs text-muted-foreground">
                                    {getUserEmail()}
                                </span>
                            </div>
                            <ChevronDown
                                className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''
                                    }`}
                            />
                        </>
                    )}
                </Button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                        >
                            {/* User Info Header */}
                            <div className="p-4 bg-gradient-to-br from-primary/10 to-purple-600/10 border-b">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                                        <AvatarImage
                                            src={user?.user_metadata?.avatar_url}
                                            alt={getUserName()}
                                        />
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-semibold">
                                            {getInitials(getUserName())}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm truncate">
                                            {getUserName()}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {getUserEmail()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="max-h-[60vh] overflow-y-auto">
                                {menuItems.map((section, sectionIndex) => (
                                    <div key={section.section}>
                                        {sectionIndex > 0 && <Separator />}
                                        <div className="p-2">
                                            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                {section.section}
                                            </p>
                                            {section.items.map((item) => (
                                                <motion.button
                                                    key={item.label}
                                                    whileHover={{ x: 4 }}
                                                    onClick={item.onClick}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent transition-colors text-left group"
                                                >
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                                        <item.icon className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-medium">
                                                                {item.label}
                                                            </p>
                                                            {item.badge && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="h-5 px-1.5 text-xs"
                                                                >
                                                                    {item.badge}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {item.description}
                                                        </p>
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {/* Logout Button */}
                                <Separator />
                                <div className="p-2">
                                    <motion.button
                                        whileHover={{ x: 4 }}
                                        onClick={() => {
                                            setIsOpen(false);
                                            setShowLogoutDialog(true);
                                        }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 transition-colors text-left group"
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                                            <LogOut className="w-4 h-4 text-destructive" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-destructive">
                                                Logout
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Sign out of your account
                                            </p>
                                        </div>
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Logout Confirmation Dialog */}
            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will be signed out of your account and redirected to the login page.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLogout}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Logout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default UserProfileAvatar;
