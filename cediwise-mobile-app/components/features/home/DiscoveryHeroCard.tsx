import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Calculator } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card } from '../../Card';
import { PrimaryButton } from '../../PrimaryButton';

export const DiscoveryHeroCard = memo(function DiscoveryHeroCard() {
  const router = useRouter();

  const handleVitalsPress = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    router.push('/vitals?mode=edit');
  }, [router]);

  const handleCalculatorPress = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    router.push('/salary-calculator');
  }, [router]);

  return (
    <Card className="mb-16">
      <View className="gap-4">
        <Text className="text-white text-lg font-semibold">
          Set up your financial profile
        </Text>
        <Text className="text-slate-400 text-sm">
          Add your income and budget preferences so we can show your net income and spending at a glance.
        </Text>
        <PrimaryButton
          onPress={handleVitalsPress}
          className="min-h-[48px]"
        >
          <Text className="text-slate-900 font-semibold">Set up profile</Text>
        </PrimaryButton>
        <Pressable
          onPress={handleCalculatorPress}
          className="flex-row items-center gap-2 py-2 min-h-[44px]"
          accessibilityRole="button"
          accessibilityLabel="Open tax and salary calculator"
        >
          <Calculator size={18} color="#94A3B8" />
          <Text className="text-slate-400 text-sm">Tax & salary calculator</Text>
        </Pressable>
      </View>
    </Card>
  );
});
