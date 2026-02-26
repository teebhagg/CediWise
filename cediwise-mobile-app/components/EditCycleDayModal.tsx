import * as Haptics from 'expo-haptics';
import { Button, Dialog } from 'heroui-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { GlassView } from '@/components/GlassView';
import { AppTextField } from './AppTextField';

type Props = {
  visible: boolean;
  currentDay: number;
  onClose: () => void;
  onSave: (nextDay: number) => void;
};

export function EditCycleDayModal({ visible, currentDay, onClose, onSave }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setError(undefined);
      setValue(String(currentDay || 1));
    }
  }, [visible, currentDay]);

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

  const handleSave = async () => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 31) {
      setError('Enter a day between 1 and 31');
      return;
    }
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
    onSave(parsed);
    onClose();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/60" />
        <GlassView intensity={7} tint="dark" className="absolute inset-0" onTouchEnd={handleClose} />
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1, justifyContent: 'center' }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
        >
          <Dialog.Content
            className=" w-full rounded-xl bg-slate-900/95 p-0"
            style={styles.contentShadow}
          >
            <Dialog.Close
              variant="ghost"
              className="absolute top-4 right-4 w-10 h-10 rounded-full z-10"
              onPress={handleClose}
            />
            <View style={styles.content}>
              <Dialog.Title className="text-[22px] font-bold text-slate-200 text-center mb-0.5">
                Edit cycle day
              </Dialog.Title>
              <Dialog.Description className="text-[14px] text-slate-400 text-center mb-2.5 leading-5">
                Choose a payday day between 1 and 31.
              </Dialog.Description>

              <View style={styles.field}>
                <AppTextField
                  label="Payday day (1–31)"
                  value={value}
                  onChangeText={setValue}
                  keyboardType="number-pad"
                  placeholder="25"
                  returnKeyType="done"
                  error={error ?? undefined}
                />
              </View>

              <Button variant="primary" onPress={handleSave} className="mt-1.5 h-12 rounded-full bg-emerald-500">
                <Button.Label className="text-slate-900 font-semibold">Save</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </KeyboardAvoidingView>
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
    // paddingTop: 52,
    gap: 12,
  },
  field: {
    gap: 6,
  },
});
