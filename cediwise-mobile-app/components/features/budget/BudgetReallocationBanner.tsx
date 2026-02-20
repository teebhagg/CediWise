import { RotateCcw } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Card } from '../../Card';
import type { ReallocationSuggestion } from '../../../utils/reallocationEngine';
import { formatAllocation, formatReallocationDetails } from '../../../utils/reallocationEngine';

interface BudgetReallocationBannerProps {
  visible: boolean;
  suggestion: ReallocationSuggestion | null;
  onApply: () => Promise<void>;
}

export function BudgetReallocationBanner({
  visible,
  suggestion,
  onApply,
}: BudgetReallocationBannerProps) {
  if (!visible || !suggestion?.shouldReallocate || !suggestion.changes) return null;

  const allocationStr = formatAllocation(
    suggestion.changes.needsPct,
    suggestion.changes.wantsPct,
    suggestion.changes.savingsPct
  );
  const detailsStr = formatReallocationDetails(suggestion);

  return (
    <Card className="">
      <View className="flex-col items-start gap-3">
        <View className="flex-row items-center gap-2">
          <View className="mt-0.5 p-2 rounded-full bg-amber-500/20 border border-amber-500/30">
            <RotateCcw size={18} color="#F59E0B" />
          </View>
          <Text className="text-white text-base font-semibold">Reallocation suggested</Text>
        </View>
        <View className="flex-1">
          <Text className="text-slate-400 text-sm mt-1">{suggestion.reason}</Text>
          {detailsStr ? (
            <Text className="text-slate-500 text-xs mt-1">{detailsStr}</Text>
          ) : null}
          <View className="flex-row items-center gap-2 mt-3 flex-wrap">
            <Text className="text-amber-300 text-sm font-medium">
              Suggested: {allocationStr} (Needs/Wants/Savings)
            </Text>
            <Pressable
              onPress={onApply}
              className="px-3 py-1.5 rounded-xl bg-amber-500/25 border border-amber-500/40 active:bg-amber-500/35"
            >
              <Text className="text-amber-200 font-medium text-sm">Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Card>
  );
}
