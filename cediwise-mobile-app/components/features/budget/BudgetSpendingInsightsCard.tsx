import { Text, View } from 'react-native';
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

interface BudgetSpendingInsightsCardProps {
  visible: boolean;
  loading: boolean;
  insights: SpendingInsight[] | null;
}

export function BudgetSpendingInsightsCard({
  visible,
  loading,
  insights,
}: BudgetSpendingInsightsCardProps) {
  if (!visible) return null;

  return (
    <Card className="">
      <Text className="text-white text-base font-semibold mb-2">Spending insights</Text>
      {loading ? (
        <Text className="text-slate-400 text-[13px]">Loading…</Text>
      ) : insights && insights.length > 0 ? (
        <View className="gap-2.5">
          {insights.slice(0, 5).map((insight) => (
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
