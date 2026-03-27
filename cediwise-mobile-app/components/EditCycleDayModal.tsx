import { AppDialog } from '@/components/AppDialog';
import { Calendar } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

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

  const handleSave = () => {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 31) {
      setError('Enter a day between 1 and 31');
      return;
    }
    onSave(parsed);
    onClose();
  };

  return (
    <AppDialog
      visible={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      icon={
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
          <Calendar size={22} color="#10b981" />
        </View>
      }
      title="Edit cycle day"
      description="Choose a payday day between 1 and 31."
      primaryLabel="Save"
      onPrimary={handleSave}
      secondaryLabel="Cancel"
      onSecondary={onClose}
    >
      <View style={{ gap: 6 }}>
        <AppTextField
          label="Payday day (1–31)"
          value={value}
          onChangeText={(v) => {
            setValue(v);
            if (error) setError(undefined);
          }}
          keyboardType="number-pad"
          placeholder="25"
          returnKeyType="done"
          error={error ?? undefined}
        />
      </View>
    </AppDialog>
  );
}
