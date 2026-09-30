import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { regenerateCalendar } from '@/utils/updateCalendarPrices';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const RefreshCalendarPrices = () => {
    const { user } = useAuth();

    const handleRefresh = () => {
        if (!user?.id) {
            toast.error('Please login first');
            return;
        }

        try {
            regenerateCalendar(user.id);
            toast.success('Calendar refreshed with new prices!');
        } catch (error) {
            toast.error('Failed to refresh calendar');
            console.error(error);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Prices
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Refresh Calendar Prices?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will regenerate your delivery calendar with the latest prices from the pricing system.
                        <br /><br />
                        <strong>Note:</strong> This is only needed during testing. In production, prices update automatically for new deliveries.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRefresh}>
                        Refresh Now
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default RefreshCalendarPrices;
