import * as Haptics from 'expo-haptics';
import { Button } from 'heroui-native';
import { ReactNode } from 'react';
import { ActivityIndicator, Text } from 'react-native';

type Props = {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  className?: string;
  style?: object;
};

const primaryClass =
  'h-[52px] rounded-full items-center justify-center flex-row gap-2 min-h-[44px] bg-emerald-500 focus:bg-emerald-600';
const disabledClass = 'bg-slate-600/80 opacity-80';

export function PrimaryButton({
  children,
  loading,
  disabled,
  onPress,
  className,
  style,
}: Props) {
  const handlePress = async () => {
    if (disabled || loading) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore haptics failure
    }
    onPress?.();
  };

  return (
    <Button
      isDisabled={disabled || loading}
      onPress={handlePress}
      className={
        disabled || loading
          ? `${primaryClass} ${disabledClass} ${className ?? ''}`
          : `${primaryClass} ${className ?? ''}`
      }
      style={style}
    >
      {loading ? (
        <ActivityIndicator color="#020617" />
      ) : typeof children === 'string' ? (
        <Button.Label className="text-slate-900 font-semibold text-base">
          {children}
        </Button.Label>
      ) : (
        <Text>
          {children}
        </Text>
      )}
    </Button>
  );
}
