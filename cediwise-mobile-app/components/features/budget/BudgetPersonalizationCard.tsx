import { useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { formatCurrency } from '../../../utils/formatCurrency';
import { Card } from '../../Card';
import { PrimaryButton } from '../../PrimaryButton';
import { SecondaryButton } from '../../SecondaryButton';

interface VitalsSummary {
  v: { strategy?: string | null; interests?: string[] };
  netIncome: number;
  fixedCosts: number;
  ratio: number | null;
}

interface BudgetPersonalizationCardProps {
  showCta: boolean;
  showSummary: boolean;
  vitalsSummary: VitalsSummary | null;
}

export function BudgetPersonalizationCard({
  showCta,
  showSummary,
  vitalsSummary,
}: BudgetPersonalizationCardProps) {
  const router = useRouter();

  if (showCta) {
    return (
      <Card className="">
        <View className="flex-row justify-between gap-3 items-center">
          <View className="flex-1">
            <Text className="text-white text-base font-semibold">Personalize your budget</Text>
            <Text className="text-muted-foreground text-xs mt-1">
              Get a personalized budget in 2 minutes (or skip anytime).
            </Text>
          </View>
          <PrimaryButton onPress={() => router.push('/vitals')} className="h-11 px-4">
            <Text className="text-slate-900 font-medium">Start</Text>
          </PrimaryButton>
        </View>
      </Card>
    );
  }

  if (showSummary && vitalsSummary) {
    const { v, netIncome, fixedCosts, ratio } = vitalsSummary;
    return (
      <Card className="">
        <View className="flex-row justify-between items-center gap-3">
          <View className="flex-1">
            <Text className="text-white text-lg font-semibold">Personalization</Text>
            <Text className="text-muted-foreground text-sm mt-1">
              Strategy: {v.strategy ?? '—'}
            </Text>
          </View>
          <SecondaryButton
            onPress={() => router.push('/vitals?mode=edit')}
            className="flex-row gap-2 py-1 items-center border border-blue-500/30 rounded-full px-4 active:opacity-70"
          >
            <Pencil size={16} color="#E2E8F0" />
            <Text className="text-slate-200 font-medium">Edit</Text>
          </SecondaryButton>
        </View>

        <View className="mt-3.5 gap-2.5">
          <View className="flex-row justify-between">
            <Text className="text-slate-200 font-medium">Net income</Text>
            <Text className="text-slate-400 font-medium">₵{formatCurrency(netIncome)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-200 font-medium">Fixed costs</Text>
            <Text className="text-slate-400 font-medium">₵{formatCurrency(fixedCosts)}</Text>
          </View>
          {ratio !== null ? (
            <Text className="text-slate-500 text-xs">
              Fixed costs are {(ratio * 100).toFixed(0)}% of net income. Your budget uses weighted allocation for smarter category limits.
            </Text>
          ) : (
            <Text className="text-slate-500 text-xs">
              Net income is 0 — can&apos;t compute fixed cost ratio.
            </Text>
          )}

          {v.interests?.length ? (
            <View className="flex-row flex-wrap gap-2 mt-1">
              {v.interests.slice(0, 8).map((it) => (
                <View
                  key={it}
                  className="px-2.5 py-1.5 rounded-full bg-slate-400/20 border border-slate-400/25"
                >
                  <Text className="text-slate-300 font-medium text-xs">{it}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Card>
    );
  }

  return null;
}
