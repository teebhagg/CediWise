import { memo } from 'react';
import { Text, View } from 'react-native';

import type { BudgetTotals } from './types';

export interface BudgetHealthBarProps {
  budgetTotals: BudgetTotals;
  /** Optional height for the bar (default 10) */
  barHeight?: number;
}

function BudgetHealthBarInner({ budgetTotals, barHeight = 10 }: BudgetHealthBarProps) {
  const totalLimit =
    budgetTotals.needsLimit + budgetTotals.wantsLimit + budgetTotals.savingsLimit;
  const needsPct = totalLimit > 0 ? budgetTotals.needsLimit / totalLimit : 1 / 3;
  const wantsPct = totalLimit > 0 ? budgetTotals.wantsLimit / totalLimit : 1 / 3;
  const savingsPct = totalLimit > 0 ? budgetTotals.savingsLimit / totalLimit : 1 / 3;

  return (
    <View className="gap-2">
      <View
        className="flex-row rounded-full overflow-hidden border border-white/10"
        style={{ height: barHeight }}
      >
        <View
          className="bg-emerald-500/80"
          style={{ flex: needsPct }}
        />
        <View
          className="bg-amber-500/80"
          style={{ flex: wantsPct }}
        />
        <View
          className="bg-sky-500/80"
          style={{ flex: savingsPct }}
        />
      </View>
      <View className="flex-row justify-between">
        <Text className="text-slate-400 text-xs">Needs</Text>
        <Text className="text-slate-400 text-xs">Wants</Text>
        <Text className="text-slate-400 text-xs">Savings</Text>
      </View>
    </View>
  );
}

export const BudgetHealthBar = memo(BudgetHealthBarInner);
