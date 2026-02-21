import { Text, View } from 'react-native';
import { formatCurrency } from '../../../utils/formatCurrency';
import { Card } from '../../Card';
import { ProgressBar } from './ProgressBar';

interface BudgetCycle {
  paydayDay: number;
  startDate: string;
  endDate: string;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
}

interface BucketTotals {
  monthlyNetIncome: number;
  spentByBucket: { needs: number; wants: number; savings: number };
  needsLimit: number;
  wantsLimit: number;
  savingsLimit: number;
}

function getHealthDisplay(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 75) return { label: 'On track', color: 'text-emerald-300', bgColor: 'bg-emerald-500/20' };
  if (score >= 50) return { label: 'Needs attention', color: 'text-amber-300', bgColor: 'bg-amber-500/20' };
  return { label: 'At risk', color: 'text-red-300', bgColor: 'bg-red-500/20' };
}

function daysUntilEnd(endDate: string): number {
  const end = new Date(endDate + 'T23:59:59');
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export interface BudgetOverviewCardProps {
  visible: boolean;
  cycle: BudgetCycle | null;
  totals: BucketTotals | null;
  healthScore?: number | null;
  healthLabel?: string;
  healthSummary?: string | null;
}

export function BudgetOverviewCard({
  visible,
  cycle,
  totals,
  healthScore,
  healthLabel,
  healthSummary,
}: BudgetOverviewCardProps) {
  if (!visible || !totals) return null;

  const spent =
    totals.spentByBucket.needs + totals.spentByBucket.wants + totals.spentByBucket.savings;
  const remaining = Math.max(0, totals.monthlyNetIncome - spent);
  const daysLeft = cycle ? daysUntilEnd(cycle.endDate) : 0;
  const healthDisplay = healthScore != null ? getHealthDisplay(healthScore) : null;

  return (
    <Card className="border border-emerald-500/20">
      <View className="flex-row items-center justify-between gap-3 mb-3">
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold">Budget Overview</Text>
          <Text className="text-muted-foreground text-sm mt-0.5">
            {cycle
              ? `${cycle.startDate} → ${cycle.endDate}${daysLeft > 0 ? ` • ${daysLeft} days left` : ''}`
              : `Net income: ₵${formatCurrency(totals.monthlyNetIncome)}`}
          </Text>
        </View>
        {healthDisplay != null && (
          <View
            className={`px-3 py-2 rounded-full ${healthDisplay.bgColor} border border-slate-400/20`}
          >
            <Text className={`${healthDisplay.color} font-bold text-base`}>
              {Math.round(healthScore ?? 0)}
            </Text>
            <Text className="text-slate-400 text-[10px]">/ 100</Text>
            <Text className={`${healthDisplay.color} text-[10px] font-medium mt-0.5`}>
              {healthLabel ?? healthDisplay.label}
            </Text>
          </View>
        )}
      </View>

      {healthSummary ? (
        <Text className="text-slate-400 text-xs mb-3" numberOfLines={2}>
          {healthSummary}
        </Text>
      ) : null}

      <View className="gap-3">
        <View>
          <View className="flex-row justify-between">
            <Text className="text-slate-200 font-medium text-sm">Needs</Text>
            <Text className="text-slate-400 font-medium text-sm">
              ₵{formatCurrency(totals.spentByBucket.needs)} / ₵{formatCurrency(totals.needsLimit)}
            </Text>
          </View>
          <View className="mt-1.5">
            <ProgressBar
              value={
                totals.needsLimit > 0 ? totals.spentByBucket.needs / totals.needsLimit : 0
              }
            />
          </View>
        </View>

        <View>
          <View className="flex-row justify-between">
            <Text className="text-slate-200 font-medium text-sm">Wants</Text>
            <Text className="text-slate-400 font-medium text-sm">
              ₵{formatCurrency(totals.spentByBucket.wants)} / ₵{formatCurrency(totals.wantsLimit)}
            </Text>
          </View>
          <View className="mt-1.5">
            <ProgressBar
              value={
                totals.wantsLimit > 0 ? totals.spentByBucket.wants / totals.wantsLimit : 0
              }
            />
          </View>
        </View>

        <View>
          <View className="flex-row justify-between">
            <Text className="text-slate-200 font-medium text-sm">Savings</Text>
            <Text className="text-slate-400 font-medium text-sm">
              ₵{formatCurrency(totals.spentByBucket.savings)} / ₵
              {formatCurrency(totals.savingsLimit)}
            </Text>
          </View>
          <View className="mt-1.5">
            <ProgressBar
              value={
                totals.savingsLimit > 0
                  ? totals.spentByBucket.savings / totals.savingsLimit
                  : 0
              }
            />
          </View>
        </View>
      </View>

      <View className="mt-3 pt-3 border-t border-slate-400/20 flex-row justify-between items-center">
        <Text className="text-slate-400 text-sm font-medium">Remaining this cycle</Text>
        <Text className="text-emerald-400 font-bold text-base">
          ₵{formatCurrency(remaining)}
        </Text>
      </View>
    </Card>
  );
}
