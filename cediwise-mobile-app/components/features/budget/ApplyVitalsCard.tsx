import { Text, View } from 'react-native';
import { PrimaryButton } from '../../PrimaryButton';

interface ApplyVitalsCardProps {
  visible: boolean;
  onApply: () => Promise<void>;
}

export function ApplyVitalsCard({ visible, onApply }: ApplyVitalsCardProps) {
  if (!visible) return null;

  return (
    <View className="rounded-xl border-l-4 border-l-emerald-500 bg-emerald-500/10 px-4 py-3 mb-4">
      <Text className="text-white text-base font-semibold">Apply your personalization to Budget</Text>
      <Text className="text-muted-foreground text-xs mt-1">
        We&apos;ll use your saved details to set your cycle, allocation, wants categories, and
        income sources.
      </Text>

      <View className="mt-3.5">
        <PrimaryButton onPress={onApply}>Apply now</PrimaryButton>
      </View>
    </View>
  );
}
