import { AppDialog } from '@/components/AppDialog';
import { LogOut } from 'lucide-react-native';

interface LogoutModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    tone?: 'warning' | 'success';
}

export function LogoutModal({ visible, onClose, onConfirm, tone = 'warning' }: LogoutModalProps) {
    const iconColor = tone === 'warning' ? '#F87171' : '#22C55E';

    return (
        <AppDialog
            visible={visible}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            icon={<LogOut size={22} color={iconColor} />}
            title="Confirm Logout"
            description="You're about to sign out. You'll need to authenticate again to re-enter CediWise."
            primaryLabel="Logout"
            onPrimary={onConfirm}
            secondaryLabel="Cancel"
            onSecondary={onClose}
        />
    );
}
