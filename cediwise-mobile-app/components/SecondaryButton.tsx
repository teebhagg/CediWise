import * as Haptics from 'expo-haptics';
import { Button } from 'heroui-native';
import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  className?: string;
  style?: object;
};

const baseClass =
  'min-h-[52px] rounded-full items-center justify-center flex-row gap-2 border bg-slate-400/10 border-slate-400/25';
const disabledClass = 'bg-slate-600/55 border-slate-400/25 opacity-80';

export function SecondaryButton({
  children,
  disabled,
  onPress,
  className,
  style,
}: Props) {
  const handlePress = async () => {
    if (disabled) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    onPress?.();
  };

  return (
    <Button
      variant="outline"
      isDisabled={disabled}
      onPress={handlePress}
      className={
        disabled ? `${baseClass} ${disabledClass} ${className ?? ''}` : `${baseClass} ${className ?? ''}`
      }
      style={style}
    >
      {typeof children === 'string' ? (
        <Button.Label className="text-slate-200 font-medium text-base">
          {children}
        </Button.Label>
      ) : (
        children
      )}
    </Button>
  );
}
