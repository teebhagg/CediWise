import * as Haptics from 'expo-haptics';
import { Button, Dialog, ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassView } from '@/components/GlassView';
import { ArrowUpRightIcon } from 'lucide-react-native';
import { AppTextField } from './AppTextField';

type Props = {
  visible: boolean;
  categoryName: string;
  currentLimit: number;
  /** Phase 1.3: Suggested limit from spending history (optional) */
  suggestedLimit?: number | null;
  onClose: () => void;
  onSave: (nextLimit: number) => void;
};

export function EditCategoryLimitModal({
  visible,
  categoryName,
  currentLimit,
  suggestedLimit,
  onClose,
  onSave,
}: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setError(undefined);
      setValue(String(Number.isFinite(currentLimit) ? currentLimit : 0));
    }
  }, [visible, currentLimit]);

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
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid amount');
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

  const insets = useSafeAreaInsets();

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/65" />
        {Platform.OS === 'ios' && <GlassView intensity={7} tint="dark" className="absolute inset-0" onTouchEnd={handleClose} />}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ 
            flex: 1, 
            justifyContent: isKeyboardVisible ? 'flex-end' : 'center', 
            alignItems: 'center',
            paddingTop: insets.top + 16,
            paddingBottom: isKeyboardVisible ? 12 : insets.bottom + 16,
            paddingHorizontal: 16
          }}
        >
          <Dialog.Content
            className="max-w-[400px] w-full rounded-2xl overflow-hidden bg-[rgba(18,22,33,0.98)] p-0"
            style={[styles.contentShadow, isKeyboardVisible && { maxHeight: '100%' }]}
          >
            <Dialog.Close
              variant="ghost"
              className="absolute top-4 right-4 w-10 h-10 rounded-full z-10 bg-slate-600/60 border border-slate-500/50"
              iconProps={{ size: 20, color: "#e2e8f0" }}
              onPress={handleClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
            />
            <ScrollShadow color="#121621" LinearGradientComponent={LinearGradient} className="flex-1">
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={[styles.content, isKeyboardVisible && { paddingVertical: 16 }]}>
                  <Dialog.Title className="text-[22px] font-bold text-slate-200 text-center mb-0.5">
                    Edit budget limit
                  </Dialog.Title>
                  <Dialog.Description className="text-[14px] text-slate-400 text-center mb-2.5 leading-5">
                    {categoryName}
                  </Dialog.Description>

                  <View style={styles.field}>
                    <AppTextField
                      label="Limit (GHS)"
                      value={value}
                      onChangeText={setValue}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      returnKeyType="done"
                      error={error ?? undefined}
                    />
                    {suggestedLimit != null &&
                      suggestedLimit > 0 &&
                      suggestedLimit !== currentLimit && (
                        <Pressable
                          onPress={() => {
                            setValue(String(suggestedLimit));
                            setError(undefined);
                          }}
                          className="flex-row items-center justify-between mt-2 py-3 px-4 rounded-[24px] bg-emerald-500/15 border border-emerald-500/30"
                        >
                          <Text className="text-emerald-400 w-auto flex-1 text-sm font-medium">
                            Use suggested: ₵{suggestedLimit.toLocaleString()} (from your spending)
                          </Text>
                          {/* <View className="w-10 h-10 flex items-center justify-center bg-emerald-500/15 rounded-full"> */}
                          <ArrowUpRightIcon size={24} color="#1B6B3A" />
                          {/* </View> */}
                        </Pressable>
                      )}
                  </View>

                  <Button variant="primary" onPress={handleSave} className="mt-1.5 h-12 rounded-full bg-emerald-500">
                    <Button.Label className="text-slate-900 font-semibold">Save limit</Button.Label>
                  </Button>
                </View>
              </ScrollView>
            </ScrollShadow>
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
