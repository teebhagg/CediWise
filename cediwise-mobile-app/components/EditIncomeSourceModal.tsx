import * as Haptics from 'expo-haptics';
import { Button, Dialog, ScrollShadow } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassView } from '@/components/GlassView';
import type { IncomeSourceType } from '../types/budget';
import { AppTextField } from './AppTextField';

type Props = {
  visible: boolean;
  initial: {
    name: string;
    type: IncomeSourceType;
    amount: number;
    applyDeductions: boolean;
  };
  onClose: () => void;
  onSave: (next: { name: string; type: IncomeSourceType; amount: number; applyDeductions: boolean }) => void;
};

export function EditIncomeSourceModal({ visible, initial, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState<IncomeSourceType>('primary');
  const [amount, setAmount] = useState('');
  const [applyDeductions, setApplyDeductions] = useState(true);
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
      setName(initial.name);
      setType(initial.type);
      setAmount(String(initial.amount ?? 0));
      setApplyDeductions(initial.applyDeductions);
    }
  }, [visible, initial]);

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
    const parsed = Number(amount);
    if (!name.trim()) {
      setError('Enter a name');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
    onSave({
      name: name.trim(),
      type,
      amount: parsed,
      applyDeductions: type === 'primary' ? applyDeductions : false,
    });
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <Dialog.Content
            className="max-w-[380px] w-full rounded-2xl overflow-hidden bg-[rgba(18,22,33,0.98)] p-0"
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
                  <Dialog.Title className="text-[22px] font-bold text-slate-200 text-center mb-2">
                    Edit income source
                  </Dialog.Title>

                  <View style={styles.field}>
                    <AppTextField
                      label="Name"
                      value={name}
                      onChangeText={setName}
                      placeholder="Primary Salary"
                      returnKeyType="done"
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Type</Text>
                    <View style={styles.typeRow}>
                      {(['primary', 'side'] as const).map((opt) => (
                        <Pressable
                          key={opt}
                          onPress={async () => {
                            try {
                              await Haptics.selectionAsync();
                            } catch {
                              // ignore
                            }
                            setType(opt);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={opt === 'primary' ? 'Primary income' : 'Side income'}
                          style={[
                            styles.typeButton,
                            opt === type ? styles.typeButtonActive : styles.typeButtonInactive,
                          ]}
                        >
                          <Text style={styles.typeButtonText}>
                            {opt === 'primary' ? 'Primary' : 'Side'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {type === 'primary' ? (
                    <Pressable
                      onPress={async () => {
                        try {
                          await Haptics.selectionAsync();
                        } catch {
                          // ignore
                        }
                        setApplyDeductions((v) => !v);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Apply SSNIT and PAYE deductions: ${applyDeductions ? 'On' : 'Off'}. Tap to toggle.`}
                      style={[
                        styles.deductionsToggle,
                        applyDeductions ? styles.deductionsOn : styles.deductionsOff,
                      ]}
                    >
                      <Text style={styles.deductionsText}>
                        Apply SSNIT/PAYE deductions: {applyDeductions ? 'On' : 'Off'}
                      </Text>
                    </Pressable>
                  ) : null}

                  <View style={styles.field}>
                    <AppTextField
                      label="Monthly amount (GHS)"
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      returnKeyType="done"
                    />
                  </View>

                  {error ? <Text style={styles.errorText}>{error}</Text> : null}

                  <Button variant="primary" onPress={handleSave} className="mt-1.5 h-12 rounded-full bg-emerald-500">
                    <Button.Label className="text-slate-900 font-semibold">Save changes</Button.Label>
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  typeButtonInactive: {
    backgroundColor: 'rgba(148,163,184,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  typeButtonText: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  deductionsToggle: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  deductionsOn: {
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderColor: 'rgba(34,197,94,0.35)',
  },
  deductionsOff: {
    backgroundColor: 'rgba(148,163,184,0.10)',
    borderColor: 'rgba(148,163,184,0.25)',
  },
  deductionsText: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
