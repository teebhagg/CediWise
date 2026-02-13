import { Text, View } from 'react-native';
import { formatCurrency } from '../../../utils/formatCurrency';
import { Card } from '../../Card';
import { ProgressBar } from './ProgressBar';

interface BucketTotals {
  monthlyNetIncome: number;
  spentByBucket: { needs: number; wants: number; savings: number };
  needsLimit: number;
  wantsLimit: number;
  savingsLimit: number;
}

interface BudgetAllocationCardProps {
  visible: boolean;
  allocationTitle: string;
  totals: BucketTotals | null;
}

export function BudgetAllocationCard({
  visible,
  allocationTitle,
  totals,
}: BudgetAllocationCardProps) {
  if (!visible || !totals) return null;

  return (
    <Card className="">
      <Text className="text-white text-lg font-semibold">{allocationTitle}</Text>
      <Text className="text-muted-foreground text-sm mt-1">
        Monthly net income: ₵{formatCurrency(totals.monthlyNetIncome)}
      </Text>

      <View className="mt-3.5 gap-3.5">
        <View>
          <View className="flex-row justify-between">
            <Text className="text-slate-200 font-medium">Needs</Text>
            <Text className="text-slate-400 font-medium">
              ₵{formatCurrency(totals.spentByBucket.needs)} / ₵{formatCurrency(totals.needsLimit)}
            </Text>
          </View>
          <View className="mt-2">
            <ProgressBar
              value={totals.needsLimit > 0 ? totals.spentByBucket.needs / totals.needsLimit : 0}
            />
          </View>
        </View>

        <View>
          <View className="flex-row justify-between">
            <Text className="text-slate-200 font-medium">Wants</Text>
            <Text className="text-slate-400 font-medium">
              ₵{formatCurrency(totals.spentByBucket.wants)} / ₵{formatCurrency(totals.wantsLimit)}
            </Text>
          </View>
          <View className="mt-2">
            <ProgressBar
              value={totals.wantsLimit > 0 ? totals.spentByBucket.wants / totals.wantsLimit : 0}
            />
          </View>
        </View>

        <View>
          <View className="flex-row justify-between">
            <Text className="text-slate-200 font-medium">Savings</Text>
            <Text className="text-slate-400 font-medium">
              ₵{formatCurrency(totals.spentByBucket.savings)} / ₵
              {formatCurrency(totals.savingsLimit)}
            </Text>
          </View>
          <View className="mt-2">
            <ProgressBar
              value={
                totals.savingsLimit > 0 ? totals.spentByBucket.savings / totals.savingsLimit : 0
              }
            />
          </View>
        </View>
      </View>
    </Card>
  );
}
