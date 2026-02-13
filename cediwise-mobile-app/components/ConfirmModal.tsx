import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Button, Dialog } from 'heroui-native';
import { Platform, StyleSheet, View } from 'react-native';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function ConfirmModal({
  visible,
  title,
  description,
  confirmLabel = 'Confirm',
  onClose,
  onConfirm,
}: ConfirmModalProps) {
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
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
    onConfirm();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/60" />
        <BlurView intensity={7} tint="dark" className="absolute inset-0" onTouchEnd={handleClose} />
        <Dialog.Content
          className="max-w-[360px] w-full rounded-xl bg-[rgba(18,22,33,0.98)] p-0"
          style={styles.contentShadow}
        >
          <Dialog.Close
              variant="ghost"
              className="absolute top-4 right-4 w-10 h-10 rounded-full z-10"
              onPress={handleClose}
            />
          <View style={styles.content}>
            <Dialog.Title className="text-[26px] font-bold text-slate-200 text-center mb-1.5">
              {title}
            </Dialog.Title>
            <Dialog.Description className="text-[15px] text-slate-400 text-center mb-3 leading-[22px]">
              {description}
            </Dialog.Description>

            <View style={styles.buttonContainer}>
              <Button variant="ghost" size="md" onPress={handleClose} className="flex-1 h-[52px] rounded-[22px] bg-slate-400/25 border border-slate-400/45">
                <Button.Label className="text-slate-200 font-semibold">Cancel</Button.Label>
              </Button>
              <Button variant="primary" size="md" onPress={handleConfirm} className="flex-1 h-[52px] rounded-[22px] bg-emerald-500">
                <Button.Label className="text-slate-900 font-semibold">{confirmLabel}</Button.Label>
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
      android: {
        elevation: 18,
      },
    }),
  },
  content: {
    padding: 24,
    // paddingTop: 45,
    gap: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
});
