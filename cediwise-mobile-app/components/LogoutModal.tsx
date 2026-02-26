import { GlassView } from '@/components/GlassView';
import * as Haptics from 'expo-haptics';
import { Button, Dialog } from 'heroui-native';
import { Platform, StyleSheet, View } from 'react-native';

interface LogoutModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    tone?: 'warning' | 'success';
}

const toneStyles = {
    warning: {
        backgroundColor: '#F87171',
        textColor: '#0F172A',
    },
    success: {
        backgroundColor: '#22C55E',
        textColor: '#021B0F',
    },
} as const;

export function LogoutModal({ visible, onClose, onConfirm, tone = 'warning' }: LogoutModalProps) {
    const handleOpenChange = (open: boolean) => {
        if (!open) onClose();
    };

    const handleClose = async () => {
        try {
            await Haptics.selectionAsync();
        } catch {
            // ignore
        }
        onClose();
    };

    const handleConfirm = async () => {
        try {
            await Haptics.notificationAsync(
                tone === 'warning'
                    ? Haptics.NotificationFeedbackType.Warning
                    : Haptics.NotificationFeedbackType.Success
            );
        } catch {
            // ignore
        }
        onConfirm();
    };

    const { backgroundColor } = toneStyles[tone];

    return (
        <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="bg-black/60" />
                <GlassView intensity={7} tint="dark" className="absolute inset-0" onTouchEnd={handleClose} />
                <Dialog.Content
                    className="max-w-[360px] w-full rounded-xl overflow-hidden bg-slate-900/95 p-0"
                    style={styles.contentShadow}
                >
                    <Dialog.Close
                        variant="ghost"
                        className="absolute top-4 right-4 w-10 h-10 rounded-full z-10"
                        onPress={handleClose}
                    />
                    <View style={styles.content}>
                        <Dialog.Title className="text-[26px] font-bold text-slate-200 text-center mb-2.5">
                            Confirm Logout
                        </Dialog.Title>
                        <Dialog.Description className="text-[15px] text-slate-400 text-center mb-8 leading-[22px]">
                            You&apos;re about to sign out. You&apos;ll need to authenticate again to re-enter
                            CediWise.
                        </Dialog.Description>

                        <View style={styles.buttonContainer}>
                            <Button
                                variant="ghost"
                                size="md"
                                onPress={handleClose}
                                className="flex-1 h-[52px] rounded-[22px] bg-slate-400/25 border border-slate-400/45"
                            >
                                <Button.Label className="text-slate-200 font-semibold">Cancel</Button.Label>
                            </Button>
                            <Button
                                variant="danger"
                                size="md"
                                onPress={handleConfirm}
                                className="flex-1 h-[52px] rounded-[22px]"
                                style={{ backgroundColor }}
                            >
                                <Button.Label style={[styles.primaryLabel, { color: toneStyles[tone].textColor }]}>
                                    Logout
                                </Button.Label>
                            </Button>
                        </View>
                    </View>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog>
    );
}

const styles = StyleSheet.create({
    contentShadow: {
        ...Platform.select({
            ios: {
                shadowColor: '#020617',
                shadowOpacity: 0.35,
                shadowRadius: 28,
                shadowOffset: { width: 0, height: 12 },
            },
            android: { elevation: 18 },
        }),
    },
    content: {
        padding: 24,
        // paddingTop: 45,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    primaryLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
});
