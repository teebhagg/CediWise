import { FieldError, Input, Label, TextField } from 'heroui-native';
import { useState } from 'react';
import { TextInputProps, View } from 'react-native';

const PLACEHOLDER_COLOR = 'rgba(148,163,184,0.6)';

export type AppTextFieldProps = Omit<TextInputProps, 'style'> & {
  /* Prefix icon */
  prefixIcon?: React.ReactNode;
  /* Suffix icon */
  suffixIcon?: React.ReactNode;
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
  prefixIcon,
  suffixIcon,
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
      {prefixIcon && <View className="absolute left-3 top-1/2 -translate-y-1/2">{prefixIcon}</View>}
      <Label>{label}</Label>
      {suffixIcon && <View className="absolute right-3 top-1/2 -translate-y-1/2">{suffixIcon}</View>}
      <Input
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        placeholderTextColor="rgba(148,163,184,0.6)"
        className={`rounded-[18px] focus:ring-0 focus:${borderClass}`}
      />
      <FieldError>{error}</FieldError>
    </TextField>
  );
}
