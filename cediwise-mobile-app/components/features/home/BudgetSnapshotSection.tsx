import { useRouter } from 'expo-router';
import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { formatCurrency } from '../../../utils/formatCurrency';
import { Card } from '../../Card';
import { ProgressBar } from '../budget/ProgressBar';
import type { BudgetTotals } from './types';

export interface BudgetSnapshotSectionProps {
  budgetTotals: BudgetTotals;
  animatedStyle?: StyleProp<ViewStyle>;
}

const AnimatedView = Animated.createAnimatedComponent(View);

function BudgetSnapshotSectionInner({
  budgetTotals,
  animatedStyle,
}: BudgetSnapshotSectionProps) {
  const router = useRouter();

  const needsRatio =
    budgetTotals.needsLimit > 0 ? budgetTotals.spentByBucket.needs / budgetTotals.needsLimit : 0;
  const wantsRatio =
    budgetTotals.wantsLimit > 0 ? budgetTotals.spentByBucket.wants / budgetTotals.wantsLimit : 0;
  const savingsRatio =
    budgetTotals.savingsLimit > 0
      ? budgetTotals.spentByBucket.savings / budgetTotals.savingsLimit
      : 0;

  const spent =
    budgetTotals.spentByBucket.needs +
    budgetTotals.spentByBucket.wants +
    budgetTotals.spentByBucket.savings;
  const remaining = Math.max(0, budgetTotals.monthlyNetIncome - spent);

  return (
    <AnimatedView style={animatedStyle} className="mb-7 gap-3">
      <Card>
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text className="text-white text-lg font-semibold">Budget Snapshot</Text>
            <Text className="text-slate-400 text-xs mt-1">
              Net income: ₵{formatCurrency(budgetTotals.monthlyNetIncome)}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/budget')}
            className="px-3 py-2 rounded-full bg-emerald-600/10 border border-emerald-500/30"
          >
            <Text className="text-emerald-400 text-xs font-medium">Open</Text>
          </Pressable>
        </View>

        <View className="gap-3 mt-2.5">
          <View>
            <View className="flex-row justify-between">
              <Text className="text-slate-200 font-medium">Needs</Text>
              <Text className="text-slate-400 font-medium">
                ₵{formatCurrency(budgetTotals.spentByBucket.needs)} / ₵
                {formatCurrency(budgetTotals.needsLimit)}
              </Text>
            </View>
            <View className="mt-2">
              <ProgressBar value={needsRatio} />
            </View>
          </View>

          <View>
            <View className="flex-row justify-between">
              <Text className="text-slate-200 font-medium">Wants</Text>
              <Text className="text-slate-400 font-medium">
                ₵{formatCurrency(budgetTotals.spentByBucket.wants)} / ₵
                {formatCurrency(budgetTotals.wantsLimit)}
              </Text>
            </View>
            <View className="mt-2">
              <ProgressBar value={wantsRatio} />
            </View>
          </View>

          <View>
            <View className="flex-row justify-between">
              <Text className="text-slate-200 font-medium">Savings</Text>
              <Text className="text-slate-400 font-medium">
                ₵{formatCurrency(budgetTotals.spentByBucket.savings)} / ₵
                {formatCurrency(budgetTotals.savingsLimit)}
              </Text>
            </View>
            <View className="mt-2">
              <ProgressBar value={savingsRatio} />
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <View className="flex-row justify-between items-center gap-3">
          <View className="flex-1">
            <Text className="text-slate-200 font-medium text-sm">Remaining this month</Text>
            <Text className="text-slate-500 text-xs mt-1">
              After logged expenses across Needs, Wants, and Savings.
            </Text>
          </View>
          <Text className="text-emerald-500 font-bold text-lg">₵{formatCurrency(remaining)}</Text>
        </View>
      </Card>
    </AnimatedView>
  );
}

export const BudgetSnapshotSection = memo(BudgetSnapshotSectionInner);
