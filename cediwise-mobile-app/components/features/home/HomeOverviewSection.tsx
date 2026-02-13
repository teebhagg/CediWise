import { TrendingUp, TrendingDown } from 'lucide-react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { formatCurrency } from '../../../utils/formatCurrency';
import { OverviewCard } from '../../OverviewCard';
import type { IncomeTaxSummary } from './types';

export interface HomeOverviewSectionProps {
  incomeTaxSummary: IncomeTaxSummary;
  animatedStyle?: StyleProp<ViewStyle>;
}

const OVERVIEW_HELPER =
  'Snapshot your take-home vs deductions so you know what stays in your pocket.';

export function HomeOverviewSection({
  incomeTaxSummary,
  animatedStyle,
}: HomeOverviewSectionProps) {
  const badgeNet =
    incomeTaxSummary.gross > 0
      ? {
        text:
          incomeTaxSummary.mode === 'sources'
            ? '✓ From income sources'
            : incomeTaxSummary.mode === 'vitals'
              ? '✓ From vitals'
              : '✓ Calculated',
        tone: 'success' as const,
      }
      : undefined;

  const badgeDeductions =
    incomeTaxSummary.gross > 0 && incomeTaxSummary.deductions > 0
      ? {
        text: `${((incomeTaxSummary.deductions / incomeTaxSummary.gross) * 100).toFixed(1)}% of gross`,
        tone: 'danger' as const,
      }
      : undefined;

  return (
    <>
      <Animated.View style={animatedStyle} className="mb-6 gap-3">
        <OverviewCard
          label="Monthly Net Income"
          amount={formatCurrency(incomeTaxSummary.net)}
          badge={badgeNet}
          icon={<TrendingUp color="#22C55E" size={24} />}
        />
        <OverviewCard
          label="Estimated Deductions"
          amount={formatCurrency(incomeTaxSummary.deductions)}
          badge={badgeDeductions}
          icon={<TrendingDown color="#FCA5A5" size={24} />}
        />
      </Animated.View>
      <Text className="text-slate-400 text-xs text-center mb-4">{OVERVIEW_HELPER}</Text>
    </>
  );
}
