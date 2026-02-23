import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Calculator, ChevronRight } from 'lucide-react-native';
import { memo, useCallback, useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { formatCurrency } from '../../../utils/formatCurrency';
import { Card } from '../../Card';
import { BudgetHealthBar } from './BudgetHealthBar';
import type { BudgetTotals, IncomeTaxSummary } from './types';

export interface VitalHeroCardProps {
  incomeTaxSummary: IncomeTaxSummary;
  budgetTotals: BudgetTotals | null;
  animatedStyle?: StyleProp<ViewStyle>;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const EMERALD = '#22C55E';

function VitalHeroCardInner({
  incomeTaxSummary,
  budgetTotals,
  animatedStyle,
}: VitalHeroCardProps) {
  const router = useRouter();

  const { remaining, spent, taxes } = useMemo(() => {
    const taxesAmount = incomeTaxSummary.deductions ?? 0;
    if (!budgetTotals) {
      return {
        remaining: 0,
        spent: 0,
        taxes: taxesAmount,
      };
    }
    const { monthlyNetIncome, spentByBucket } = budgetTotals;
    const totalSpent =
      spentByBucket.needs + spentByBucket.wants + spentByBucket.savings;
    const remaining = Math.max(0, monthlyNetIncome - totalSpent);
    return {
      remaining,
      spent: totalSpent,
      taxes: taxesAmount,
    };
  }, [budgetTotals, incomeTaxSummary.deductions]);

  const handleCalculatorPress = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    router.push('/salary-calculator');
  }, [router]);

  return (
    <AnimatedView style={animatedStyle} className="mb-6">
      <Card>
        <View className="gap-5">
          <View className="gap-3">
            <View>
              <Text className="text-slate-400 text-xs uppercase tracking-wide">
                Monthly gross
              </Text>
              <Text className="text-white text-xl font-semibold mt-0.5">
                ₵{formatCurrency(incomeTaxSummary.gross)}
              </Text>
            </View>
            <View>
              <Text className="text-slate-400 text-xs uppercase tracking-wide">
                Monthly net income
              </Text>
              <Text className="text-white text-2xl font-bold mt-0.5">
                ₵{formatCurrency(incomeTaxSummary.net)}
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-white/10">
            <View>
              <Text className="text-slate-500 text-[11px] uppercase tracking-wide">
                Remaining
              </Text>
              <Text className="text-emerald-400 font-semibold text-xs mt-0.5">
                ₵{formatCurrency(remaining)}
              </Text>
            </View>
            <View>
              <Text className="text-slate-500 text-[11px] uppercase tracking-wide">
                Spent
              </Text>
              <Text className="text-red-300 font-semibold text-xs mt-0.5">
                ₵{formatCurrency(spent)}
              </Text>
            </View>
            <View>
              <Text className="text-slate-500 text-[11px] uppercase tracking-wide">
                Taxes
              </Text>
              <Text className="text-orange-400 font-semibold text-xs mt-0.5">
                ₵{formatCurrency(taxes)}
              </Text>
            </View>
          </View>

          {budgetTotals && (
            <View className="gap-1.5 pt-1 border-t border-white/10">
              <Text className="text-slate-400 text-xs">Budget health</Text>
              <BudgetHealthBar budgetTotals={budgetTotals} barHeight={10} />
            </View>
          )}

          <Pressable
            onPress={handleCalculatorPress}
            className="flex-row items-center justify-between gap-2.5 py-3 border-t border-white/10 min-h-[44px]"
            style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Open tax and salary calculator"
          >
            <View className="flex-row items-center gap-2.5">
              <Calculator size={20} color={EMERALD} />
              <Text className="text-slate-200 font-medium text-sm">
                Tax & salary calculator
              </Text>
            </View>
            <ChevronRight size={20} color={EMERALD} />
          </Pressable>
        </View>
      </Card>
    </AnimatedView>
  );
}

export const VitalHeroCard = memo(VitalHeroCardInner);
