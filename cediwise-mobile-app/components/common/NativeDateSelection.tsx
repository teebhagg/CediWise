import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface NativeDateSelectionProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

/**
 * Standardized Date Selection component that provides a native feel on iOS
 * and a consistent platform-appropriate experience on Android.
 * 
 * iOS: Uses native spinner (wheel) picker.
 * Android: Uses standard native picker (system default).
 */
export const NativeDateSelection: React.FC<NativeDateSelectionProps> = ({
  value,
  onChange,
  minimumDate,
  maximumDate,
}) => {
  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    // On Android, the picker closes itself after selection.
    // On iOS, it remains visible as an inline component.
    if (date) {
      onChange(date);
    }
  };

  return (
    <View style={styles.container}>
      <DateTimePicker
        value={value}
        mode="date"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={handleDateChange}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        textColor="#E2E8F0" // Match slate-200 (E2E8F0)
        themeVariant="dark"
        // accentColor="#10B981" // Optional: Match emerald-500
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
});
