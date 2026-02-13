import { useState } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { FieldError, Input, Label, TextField } from 'heroui-native';

const PLACEHOLDER_COLOR = 'rgba(148,163,184,0.6)';

export type AppTextFieldProps = Omit<TextInputProps, 'style'> & {
  /** Label shown above the input (e.g. "Name", "Amount (GHS)") */
  label?: string;
  /** Error message shown below the input; when set, input border shows error state */
  error?: string;
  /** Optional class name for the wrapper View */
  containerClassName?: string;
  /** Optional class name for the TextInput */
  inputClassName?: string;
};

export function AppTextField({
  label,
  error,
  containerClassName,
  inputClassName,
  placeholderTextColor = PLACEHOLDER_COLOR,
  onFocus,
  onBlur,
  ...rest
}: AppTextFieldProps) {
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? 'border-red-500/45'
    : focused
      ? 'border-emerald-500/60'
      : 'border-slate-400/40';

  return (
    <TextField>
      <Label>{label}</Label>
      <Input
        value={rest.value}
        onChangeText={rest.onChangeText}
        placeholder={rest.placeholder}
        returnKeyType="done"
        placeholderTextColor="rgba(148,163,184,0.6)"
        className={`rounded-[18px] focus:ring-0 focus:${borderClass}`}
      />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
