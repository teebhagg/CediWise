import { Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
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
  spentTotal: number;
  unspentThisMonth: number;
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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function getStrategyLabel(n: number, w: number, s: number): string {
  const np = Math.round(n * 100);
  const wp = Math.round(w * 100);
  const sp = Math.round(s * 100);
  
  if (np === 50 && wp === 30 && sp === 20) return 'Balanced';
  if (np === 90 && wp === 10 && sp === 0) return 'Survival';
  if (np === 40 && wp === 20 && sp === 40) return 'Aggressive';
  
  return 'Custom';
}

export interface BudgetOverviewCardProps {
  visible: boolean;
  cycle: BudgetCycle | null;
  totals: BucketTotals | null;
  healthScore?: number | null;
  healthLabel?: string;
  healthSummary?: string | null;
  canAccessBudget?: boolean;
}

export function BudgetOverviewCard({
  visible,
  cycle,
  totals,
  healthScore,
  healthLabel,
  healthSummary,
  canAccessBudget = true,
}: BudgetOverviewCardProps) {
  if (!visible || !totals) return null;

  const daysLeft = cycle ? daysUntilEnd(cycle.endDate) : 0;
  const healthDisplay = healthScore != null ? getHealthDisplay(healthScore) : null;

  const strategyLabel = cycle ? getStrategyLabel(cycle.needsPct, cycle.wantsPct, cycle.savingsPct) : '';
  const strategyPercents = cycle ? `${Math.round(cycle.needsPct * 100)}/${Math.round(cycle.wantsPct * 100)}/${Math.round(cycle.savingsPct * 100)}` : '';

  // ─── Free user: limited view ──────────────────────────
  if (!canAccessBudget) {
    const totalSpentPct = totals.monthlyNetIncome > 0
      ? totals.spentTotal / totals.monthlyNetIncome
      : 0;

    return (
      <Card className="border border-emerald-500/20">
        <View className="flex-row items-center justify-between gap-3 mb-3">
          <View className="flex-1">
            <Text className="text-white text-lg font-semibold">Budget Overview</Text>
            {cycle ? (
              <Text className="text-muted-foreground text-[13px] mt-0.5">
                {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                {daysLeft > 0 ? ` • ${daysLeft} days left` : ' • Cycle ended'}
              </Text>
            ) : (
              <Text className="text-muted-foreground text-sm mt-0.5">
                Net income: ₵{formatCurrency(totals.monthlyNetIncome)}
              </Text>
            )}
          </View>
        </View>

        {/* Single spent bar */}
        <View>
          <View className="flex-row justify-between">
            <Text className="text-slate-200 font-medium text-sm">Total Spent</Text>
            <Text className="text-slate-400 font-medium text-sm">
              ₵{formatCurrency(totals.spentTotal)} / ₵{formatCurrency(totals.monthlyNetIncome)}
            </Text>
          </View>
          <View className="mt-1.5">
            <ProgressBar value={totalSpentPct} />
          </View>
        </View>

        {/* Upgrade nudge */}
        <View className="mt-3 pt-3 border-t border-slate-400/20 flex-row items-center gap-2">
          <Lock color="#6B7280" size={14} />
          <Text className="text-slate-500 text-[12px] flex-1">
            Upgrade to Smart Budget for Needs/Wants/Savings breakdown, health score, and insights.
          </Text>
        </View>
      </Card>
    );
  }

  // ─── Paid user: full view ──────────────────────────
  return (
    <Card className="border border-emerald-500/20">
      <View className="flex-row items-center justify-between gap-3 mb-3">
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold">Budget Overview</Text>
          {cycle ? (
            <View>
              <Text className="text-muted-foreground text-[13px] mt-0.5">
                {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                {daysLeft > 0 ? ` • ${daysLeft} days left` : ' • Cycle ended'}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-1">
                <View className="bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  <Text className="text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                    {strategyLabel} {strategyPercents}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <Text className="text-muted-foreground text-sm mt-0.5">
              Net income: ₵{formatCurrency(totals.monthlyNetIncome)}
            </Text>
          )}
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
        <View>
          <Text className="text-slate-400 text-sm font-medium">Unspent this month</Text>
          <Text className="text-slate-500 text-[11px] mt-0.5">Auto-rolls to Savings at cycle end</Text>
        </View>
        <Text className="text-emerald-400 font-bold text-base">
          ₵{formatCurrency(totals.unspentThisMonth)}
        </Text>
      </View>
    </Card>
  );
}
