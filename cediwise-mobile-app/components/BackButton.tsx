import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

const PRIMARY_COLOR = '#10b981'; // emerald-500
const CHEVRON_SIZE = 22;

type BackButtonProps = {
  /** Label next to the chevron. Default: "Back" */
  label?: string;
  /** Custom onPress; default is router.back() */
  onPress?: () => void;
  /** Optional container className */
  className?: string;
};

export function BackButton({ label = 'Back', onPress, className }: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className={
        className ??
        'flex flex-row items-center gap-2 rounded-full'
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 })}
    >
      <ChevronLeft size={CHEVRON_SIZE} color={PRIMARY_COLOR} />
      <Text className="text-emerald-500 text-base font-medium">{label}</Text>
    </Pressable>
  );
}
