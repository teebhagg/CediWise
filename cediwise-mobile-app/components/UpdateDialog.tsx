import { GlassView } from '@/components/GlassView';
import * as Haptics from 'expo-haptics';
import { Button, Dialog } from 'heroui-native';
import { Download } from 'lucide-react-native';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import type { UpdateInfo } from '@/hooks/useUpdateCheck';

type UpdateDialogProps = {
  visible: boolean;
  updateInfo: UpdateInfo;
  onClose: () => void;
};

export function UpdateDialog({
  visible,
  updateInfo,
  onClose,
}: UpdateDialogProps) {
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleClose = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      /* ignore */
    }
    onClose();
  };

  const handleDownload = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const supported = await Linking.canOpenURL(updateInfo.downloadUrl);
      if (supported) {
        await Linking.openURL(updateInfo.downloadUrl);
      }
    } catch (e) {
      /* fallback: try anyway */
      await Linking.openURL(updateInfo.downloadUrl);
    }
    onClose();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/60" />
        <GlassView
          intensity={7}
          tint="dark"
          className="absolute inset-0"
          onTouchEnd={handleClose}
        />
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
            <View style={styles.iconContainer}>
              <Download color="#22C55E" size={36} strokeWidth={2} />
            </View>
            <Dialog.Title className="text-[26px] font-bold text-slate-200 text-center mb-2.5">
              Update Available
            </Dialog.Title>
            <Dialog.Description className="text-[15px] text-slate-400 text-center mb-8 leading-[22px]">
              CediWise version {updateInfo.version} is available. Download and install to get the latest
              features and improvements.
            </Dialog.Description>

            <View style={styles.buttonContainer}>
              <Button
                variant="ghost"
                size="md"
                onPress={handleClose}
                className="flex-1 h-[52px] rounded-[22px] bg-slate-400/25 border border-slate-400/45"
              >
                <Button.Label className="text-slate-200 font-semibold">
                  Later
                </Button.Label>
              </Button>
              <Button
                variant="primary"
                size="md"
                onPress={handleDownload}
                className="flex-1 h-[52px] rounded-[22px] bg-emerald-500"
              >
                <Button.Label className="text-slate-900 font-semibold">
                  Download
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
  },
  iconContainer: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
});
