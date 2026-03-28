import { FeatureLockSheet } from '@/components/FeatureLockSheet';
import { useTierContext } from '@/contexts/TierContext';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { LayoutGrid, Lightbulb, Lock, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

export interface BudgetQuickActionsProps {
  visible: boolean;
  onLogExpense: () => void;
  disabledLogExpense?: boolean;
}

export function BudgetQuickActions({
  visible,
  onLogExpense,
  disabledLogExpense,
}: BudgetQuickActionsProps) {
  const router = useRouter();
  const { canAccessBudget } = useTierContext();
  const [showInsightsLock, setShowInsightsLock] = useState(false);

  if (!visible) return null;

  const handlePress = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    action();
  };

  const handleInsightsPress = () => {
    if (!canAccessBudget) {
      setShowInsightsLock(true);
      return;
    }
    router.push('/budget/insights');
  };

  return (
    <>
      <View className="gap-3">
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => handlePress(() => router.push('/budget/categories'))}
            accessibilityRole="button"
            accessibilityLabel="View categories"
            className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-slate-500/15 border border-slate-400/25 active:bg-slate-500/25"
          >
            <LayoutGrid size={16} color="#94A3B8" />
            <Text className="text-slate-200 font-medium text-sm">Categories</Text>
          </Pressable>
          <Pressable
            onPress={() => handlePress(() => router.push('/budget/income'))}
            accessibilityRole="button"
            accessibilityLabel="Manage income"
            className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl bg-slate-500/15 border border-slate-400/25 active:bg-slate-500/25"
          >
            <Wallet size={16} color="#94A3B8" />
            <Text className="text-slate-200 font-medium text-sm">Income</Text>
          </Pressable>
          <Pressable
            onPress={() => handlePress(handleInsightsPress)}
            accessibilityRole="button"
            accessibilityLabel="View insights"
            className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border active:opacity-70 ${
              !canAccessBudget
                ? 'bg-slate-500/10 border-slate-400/15 opacity-50'
                : 'bg-slate-500/15 border-slate-400/25'
            }`}
          >
            {!canAccessBudget && <Lock color="#6B7280" size={12} />}
            <Lightbulb size={16} color={!canAccessBudget ? '#4B5563' : '#94A3B8'} />
            <Text className={`font-medium text-sm ${!canAccessBudget ? 'text-slate-500' : 'text-slate-200'}`}>
              Insights
            </Text>
          </Pressable>
        </View>
      </View>

      <FeatureLockSheet
        isOpen={showInsightsLock}
        onOpenChange={setShowInsightsLock}
        featureName="Insights & Charts"
        featureDescription="See spending trends, category breakdowns, and interactive charts to understand where your money goes."
        tierRequired="budget"
        highlights={[
          'Bar charts for category spending',
          'Trend analysis over time',
          'Smart insights on spending habits',
        ]}
      />
    </>
  );
}
