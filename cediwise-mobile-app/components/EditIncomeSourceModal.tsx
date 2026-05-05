import * as Haptics from 'expo-haptics';
import { Banknote } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppDialog } from '@/components/AppDialog';
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

  const handleSave = async () => {
    const parsed = parseFloat(amount.replace(/,/g, ''));
    if (!name.trim()) {
      setError('Enter a name');
      return;
    }
    if (isNaN(parsed) || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }

    onSave({
      name: name.trim(),
      type,
      amount: parsed,
      applyDeductions: type === 'primary' ? applyDeductions : false,
    });
    onClose();
  };

  return (
    <AppDialog
      visible={visible}
      onOpenChange={handleOpenChange}
      icon={
        <View style={styles.iconCircle}>
          <Banknote size={22} color="#10b981" />
        </View>
      }
      title="Edit income source"
      description="Update salary or side hustle details."
      primaryLabel="Save changes"
      onPrimary={handleSave}
      secondaryLabel="Cancel"
      onSecondary={onClose}
      onClose={onClose}
    >
      <View style={styles.content}>
        <View style={styles.field}>
          <AppTextField
            label="Name"
            value={name}
            onChangeText={(v) => {
              setName(v);
              if (error) setError(undefined);
            }}
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
            onChangeText={(v) => {
              setAmount(v);
              if (error) setError(undefined);
            }}
            keyboardType="decimal-pad"
            placeholder="0.00"
            returnKeyType="done"
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    </AppDialog>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  content: {
    gap: 16,
    marginTop: 4,
  },
  field: {
    gap: 8,
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
    fontWeight: '500',
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

