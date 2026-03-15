import { GlassView } from '@/components/GlassView';
import * as Haptics from 'expo-haptics';
import { Button, Dialog } from 'heroui-native';
import { AlertTriangle, Check, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Step = 'warning' | 'confirm' | 'deleting';

export type DeleteAllBudgetDataModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (removeProfile: boolean) => Promise<void>;
  onComplete?: () => void;
};

export function DeleteAllBudgetDataModal({
  visible,
  onClose,
  onConfirm,
  onComplete,
}: DeleteAllBudgetDataModalProps) {
  const [step, setStep] = useState<Step>('warning');
  const [removeProfile, setRemoveProfile] = useState(false);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && step !== 'deleting') {
        setStep('warning');
        setRemoveProfile(false);
        onClose();
      }
    },
    [onClose, step]
  );

  const handleClose = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    if (step === 'confirm') {
      setStep('warning');
      return;
    }
    setStep('warning');
    setRemoveProfile(false);
    onClose();
  }, [onClose, step]);

  const handleContinue = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    setStep('confirm');
  }, []);

  const handleFinalConfirm = useCallback(async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
    setStep('deleting');
    try {
      await onConfirm(removeProfile);
      onComplete?.();
    } catch {
      setStep('confirm');
      throw undefined;
    }
  }, [onConfirm, onComplete, removeProfile]);

  const toggleRemoveProfile = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    setRemoveProfile((p) => !p);
  }, []);

  if (!visible) return null;

  const isDeleting = step === 'deleting';

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/65" style={{ opacity: 0 }} />
        {Platform.OS === 'ios' && <GlassView
          intensity={7}
          tint="dark"
          className="absolute inset-0"
          onTouchEnd={isDeleting ? undefined : handleClose}
        />}
        <Dialog.Content
          className="max-w-[360px] w-full rounded-xl bg-[rgba(18,22,33,0.98)] p-0"
          style={styles.contentShadow}
        >
          {!isDeleting && (
            <Dialog.Close
              variant="ghost"
              className="absolute top-4 right-4 w-10 h-10 rounded-full z-10 bg-slate-600/60 border border-slate-500/50"
              iconProps={{ size: 20, color: '#e2e8f0' }}
              onPress={handleClose}
            />
          )}

          {step === 'warning' && (
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
                  <AlertTriangle size={22} color="#f97316" />
                </View>
                <Text numberOfLines={2} style={styles.title}>
                  Delete all budget data?
                </Text>
              </View>
              <Text style={styles.description}>
                This will permanently delete all your budget data from this device and the server:
                cycles, categories, transactions, income sources, and related data. This action
                cannot be undone.
              </Text>

              <Pressable
                onPress={toggleRemoveProfile}
                style={styles.checkboxRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: removeProfile }}
                accessibilityLabel="Also remove my profile data (payday, interests)"
              >
                <View
                  style={[
                    styles.checkbox,
                    removeProfile && styles.checkboxChecked,
                  ]}
                >
                  {removeProfile && (
                    <Check size={14} color="#0f172a" strokeWidth={3} />
                  )}
                </View>
                <Text className="text-slate-300 text-[15px] flex-1">
                  Also remove my profile data (payday, interests)
                </Text>
              </Pressable>

              <View className="gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onPress={handleContinue}
                  className="w-full h-12 rounded-xl bg-orange-500"
                >
                  <Button.Label className="text-slate-900 font-semibold">
                    Continue
                  </Button.Label>
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onPress={handleClose}
                  className="w-full h-12 rounded-xl bg-slate-600/80 border-0"
                >
                  <Button.Label className="text-white font-semibold">
                    Cancel
                  </Button.Label>
                </Button>
              </View>
            </View>
          )}

          {step === 'confirm' && (
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Trash2 size={22} color="#ef4444" />
                </View>
                <Text numberOfLines={2} style={styles.title}>
                  Are you sure?
                </Text>
              </View>
              <Text style={styles.description}>
                This cannot be undone. All budget data will be permanently deleted.
              </Text>

              <View className="gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onPress={handleFinalConfirm}
                  className="w-full h-12 rounded-xl bg-red-600"
                >
                  <Button.Label className="text-white font-semibold">
                    Yes, delete everything
                  </Button.Label>
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onPress={handleClose}
                  className="w-full h-12 rounded-xl bg-slate-600/80 border-0"
                >
                  <Button.Label className="text-white font-semibold">
                    Cancel
                  </Button.Label>
                </Button>
              </View>
            </View>
          )}

          {step === 'deleting' && (
            <View style={[styles.content, styles.deletingContent]}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text className="text-slate-300 text-[17px] mt-4">
                Deleting all budget data...
              </Text>
            </View>
          )}
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
    paddingTop: 28,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    flex: 1,
    textAlign: 'left',
  },
  description: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 22,
    marginBottom: 12,
    textAlign: 'left',
  },
  deletingContent: {
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
});
