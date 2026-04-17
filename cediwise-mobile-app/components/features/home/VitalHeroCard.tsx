import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Calculator, ChevronDown, ChevronRight } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

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
const CYAN_ICON = 'rgba(34, 211, 238, 0.9)';

/** Room for helper copy (two lines at ~11px); avoids layout measurement. */
const RECURRING_DETAILS_HEIGHT = 60;
const RECURRING_ANIM_MS = 260;
const RECURRING_EASING = Easing.bezier(0.22, 1, 0.36, 1);

const ExpandableRecurringSection = memo(function ExpandableRecurringSection({
  recurringMonthly,
}: {
  recurringMonthly: number;
}) {
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const progress = useSharedValue(0);

  const toggle = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    setExpanded((prev) => {
      const next = !prev;
      const duration = reducedMotion ? 0 : RECURRING_ANIM_MS;
      progress.value = withTiming(next ? 1 : 0, {
        duration,
        easing: RECURRING_EASING,
      });
      return next;
    });
  }, [progress, reducedMotion]);

  const detailsStyle = useAnimatedStyle(() => ({
    height: interpolate(
      progress.value,
      [0, 1],
      [0, RECURRING_DETAILS_HEIGHT],
    ),
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 0.85, 1]),
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(progress.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  return (
    <View className="rounded-sm border border-cyan-500/20 bg-cyan-500/5 overflow-hidden">
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Estimated recurring bills, ${formatCurrency(recurringMonthly)} cedis per month`}
        accessibilityHint={
          expanded
            ? 'Collapses explanation'
            : 'Shows how recurring bills affect your flexible budget'
        }
        className="flex-row items-center gap-3 px-3 py-3 min-h-[48px]"
        style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
      >
        <View className="flex-1 min-w-0">
          <Text className="text-cyan-200/90 text-[11px] uppercase tracking-wide font-semibold">
            Recurring (est.)
          </Text>
          <Text className="text-slate-200 text-sm font-semibold mt-0.5">
            ₵{formatCurrency(recurringMonthly)}
            <Text className="text-slate-500 font-medium text-xs">
              {' '}
              / month
            </Text>
          </Text>
        </View>
        <Animated.View style={chevronStyle} accessible={false}>
          <ChevronDown size={22} color={CYAN_ICON} strokeWidth={2.25} />
        </Animated.View>
      </Pressable>

      <Animated.View style={[detailsStyle, { overflow: 'hidden' }]}>
        <View className="px-3 pb-3 pt-0">
          <Text
            className="text-slate-500 text-[11px] leading-[16px]"
            numberOfLines={3}
          >
            {"Fixed bills — flexible budget uses what's left after this."}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
});

function VitalHeroCardInner({
  incomeTaxSummary,
  budgetTotals,
  animatedStyle,
}: VitalHeroCardProps) {
  const router = useRouter();

  const { flexibleLeft, spent, taxes, recurringMonthly } = useMemo(() => {
    const taxesAmount = incomeTaxSummary.deductions ?? 0;
    if (!budgetTotals) {
      return {
        flexibleLeft: 0,
        spent: 0,
        taxes: taxesAmount,
        recurringMonthly: 0,
      };
    }
    return {
      flexibleLeft: budgetTotals.unspentThisMonth,
      spent: budgetTotals.spentTotal,
      taxes: taxesAmount,
      recurringMonthly: budgetTotals.totalRecurringMonthly,
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
    <AnimatedView style={animatedStyle}>
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
            {recurringMonthly > 0 ? (
              <ExpandableRecurringSection recurringMonthly={recurringMonthly} />
            ) : null}
          </View>

          <View className="flex-row flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-white/10">
            <View>
              <Text className="text-slate-500 text-[11px] uppercase tracking-wide">
                Flexible left
              </Text>
              <Text
                className="text-emerald-400 font-semibold text-xs mt-0.5"
                accessibilityLabel={`Flexible budget remaining ${formatCurrency(flexibleLeft)} Ghana cedis after recurring bills and logged spending`}
              >
                ₵{formatCurrency(flexibleLeft)}
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
