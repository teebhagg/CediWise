import { CheckCircle2, InfoIcon, XCircleIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { formatCurrency } from '../../../utils/formatCurrency';
import { Card } from '../../Card';

export interface SpendingInsight {
  categoryId: string;
  categoryName: string;
  spent: number;
  limit: number;
  status: 'under' | 'near' | 'over';
  suggestion?: string;
}

export type AdvisorRecommendation = {
  id: string;
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionLabel?: string;
  amount?: number;
  context?: string;
  /** Phase 3.2: for limit_adjustment - apply suggested limit */
  categoryId?: string;
  suggestedLimit?: number;
  currentLimit?: number;
  canAutoApply?: boolean;
};

interface BudgetSpendingInsightsCardProps {
  visible: boolean;
  loading: boolean;
  insights: SpendingInsight[] | null;
  advisorRecommendations?: AdvisorRecommendation[] | null;
  /** Phase 3.2: when user taps "Update limit" on a limit_adjustment rec */
  onApplyLimitAdjustment?: (rec: AdvisorRecommendation) => void;
  /** Max advisor recs to show (default 2). Omit or pass Infinity for all. */
  maxRecommendations?: number;
  /** Max insights to show (default 5). Omit or pass Infinity for all. */
  maxInsights?: number;
}

export function BudgetSpendingInsightsCard({
  visible,
  loading,
  insights,
  advisorRecommendations,
  onApplyLimitAdjustment,
  maxRecommendations = 2,
  maxInsights = 5,
}: BudgetSpendingInsightsCardProps) {
  if (!visible) return null;

  const recs = advisorRecommendations?.slice(0, maxRecommendations) ?? [];
  const insightList = insights?.slice(0, maxInsights) ?? [];

  return (
    <Card className="">
      <Text className="text-white text-base font-semibold mb-2">Spending insights</Text>
      {recs.length > 0 ? (
        <View className="gap-2.5 mb-3">
          {recs.map((rec) => (
            <View
              key={rec.id}
              className={`p-4 rounded-sm border ${rec.priority === 'high'
                ? 'bg-red-500/10 border-red-500/20'
                : rec.priority === 'medium'
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20'
                }`}
            >
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className={`${rec.priority === 'high' ? 'text-red-300' : rec.priority === 'medium' ? 'text-amber-300' : 'text-emerald-300'} font-medium text-sm`}>{rec.title}</Text>
                    <View>
                      {rec.priority === 'high' ? <XCircleIcon size={20} color="red" /> : rec.priority === 'medium' ? <InfoIcon size={20} color="amber" /> : <CheckCircle2 size={20} color="emerald" />}
                    </View>
                  </View>
                  <Text className="text-slate-400 text-xs mt-1">{rec.message}</Text>
                </View>
                {rec.actionLabel && rec.canAutoApply && onApplyLimitAdjustment ? (
                  <Pressable
                    onPress={() => onApplyLimitAdjustment(rec)}
                    className="px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 active:opacity-80"
                  >
                    <Text className="text-emerald-300 text-xs font-medium">{rec.actionLabel}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
      {loading ? (
        <Text className="text-slate-400 text-[13px]">Loading…</Text>
      ) : insightList.length > 0 ? (
        <View className="gap-2.5">
          {insightList.map((insight) => (
            <View
              key={insight.categoryId}
              className={`flex-row justify-between items-center py-3.5 px-3.5 rounded-[1.5rem] border ${insight.status === 'over'
                ? 'bg-red-500/10 border-red-500/20'
                : insight.status === 'near'
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-slate-400/5 border-slate-400/10'
                }`}
            >
              <View className="flex-1">
                <Text className="text-slate-200 font-medium text-sm">{insight.categoryName}</Text>
                {insight.suggestion ? (
                  <Text className="text-slate-400 text-xs mt-0.5">{insight.suggestion}</Text>
                ) : null}
              </View>
              <View className="items-end">
                <Text
                  className={`text-sm font-semibold ${insight.status === 'over'
                    ? 'text-red-300'
                    : insight.status === 'near'
                      ? 'text-amber-300'
                      : 'text-slate-400'
                    }`}
                >
                  ₵{formatCurrency(insight.spent)} / ₵{formatCurrency(insight.limit)}
                </Text>
                <View
                  className={`mt-1 px-1.5 py-0.5 rounded-md ${insight.status === 'over'
                    ? 'bg-red-500/20'
                    : insight.status === 'near'
                      ? 'bg-amber-500/20'
                      : 'bg-emerald-500/15'
                    }`}
                >
                  <Text
                    className={`text-[11px] font-medium capitalize ${insight.status === 'over'
                      ? 'text-red-300'
                      : insight.status === 'near'
                        ? 'text-amber-300'
                        : 'text-emerald-300'
                      }`}
                  >
                    {insight.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-slate-400 text-[13px]">
          Add transactions to see insights and trends.
        </Text>
      )}
    </Card>
  );
}
