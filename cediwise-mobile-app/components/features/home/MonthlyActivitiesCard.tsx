import * as Haptics from 'expo-haptics';
import { ChevronRight, Plus } from 'lucide-react-native';
import { memo, useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { BudgetState, BudgetTransaction } from '../../../types/budget';
import { formatCurrency } from '../../../utils/formatCurrency';
import { Card } from '../../Card';
import { PrimaryButton } from '../../PrimaryButton';
import { Button } from 'heroui-native';

export interface MonthlyActivitiesCardProps {
  recentExpenses: BudgetTransaction[];
  budgetState: BudgetState | null;
  hasActiveCycle: boolean;
  onRecordExpensePress: () => void;
  onSeeAllPress: () => void;
  animatedStyle?: StyleProp<ViewStyle>;
}

const AnimatedView = Animated.createAnimatedComponent(View);

function MonthlyActivitiesCardInner({
  recentExpenses,
  budgetState,
  hasActiveCycle,
  onRecordExpensePress,
  onSeeAllPress,
  animatedStyle,
}: MonthlyActivitiesCardProps) {
  const topRecent = recentExpenses.slice(0, 3);

  const handleRecordExpense = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    onRecordExpensePress();
  }, [onRecordExpensePress]);

  return (
    <AnimatedView style={animatedStyle} className="mb-16">
      <Card>
        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-white text-lg font-semibold">
              Monthly activities
            </Text>
            <Button
              onPress={onSeeAllPress}
              variant="ghost"
              className="flex-row items-center gap-0.5 py-2 px-1 min-h-[44px] justify-center"
              accessibilityRole="button"
              accessibilityLabel="See all expenses"
            >
              <Text className="text-slate-400 text-sm">See all</Text>
              <ChevronRight size={16} color="#94A3B8" />
            </Button>
          </View>

          <Button
            // variant='primary'
            onPress={handleRecordExpense}
            // className="min-h-[48px]"
            isDisabled={!hasActiveCycle}
          >
            <Plus size={20} color="#020617" />
            <Text className="text-slate-900 font-semibold text-base">
              Record expense
            </Text>
          </Button>

          {topRecent.length === 0 ? (
            <View className="py-4 rounded-xl bg-white/5 border border-white/5">
              <Text className="text-slate-500 text-sm text-center">
                No expenses this month yet. Tap above to record one.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {topRecent.map((t) => {
                const cat = budgetState?.categories.find((c) => c.id === t.categoryId);
                return (
                  <View
                    key={t.id}
                    className="flex-row justify-between items-center py-2 border-b border-white/5 last:border-b-0"
                  >
                    <Text className="text-slate-200 text-sm" numberOfLines={1}>
                      {cat?.name ?? 'Uncategorized'}
                    </Text>
                    <Text className="text-red-300 text-sm font-medium">
                      -₵{formatCurrency(t.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </Card>
    </AnimatedView>
  );
}

export const MonthlyActivitiesCard = memo(MonthlyActivitiesCardInner);
