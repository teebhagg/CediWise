import { Pencil } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Card } from '../../Card';

interface BudgetCycle {
  paydayDay: number;
  startDate: string;
  endDate: string;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
}

interface BudgetCurrentCycleCardProps {
  cycle: BudgetCycle | null;
  cycleIsSet: boolean;
  onEditCycle: () => void;
}

export function BudgetCurrentCycleCard({
  cycle,
  cycleIsSet,
  onEditCycle,
}: BudgetCurrentCycleCardProps) {
  if (!cycleIsSet && !cycle) {
    return (
      <Card className="mb-4">
        <Text className="text-white text-base font-semibold">Budget cycle required</Text>
        <Text className="text-muted-foreground text-xs mt-1">
          Set up your payday cycle above to unlock income sources and the ledger.
        </Text>
      </Card>
    );
  }

  if (!cycle) return null;

  return (
    <Card className="">
      <View className="flex-row justify-between items-center">
        <Text className="text-white text-lg font-semibold">Current cycle</Text>
        <Pressable
          onPress={onEditCycle}
          accessibilityRole="button"
          accessibilityLabel="Edit cycle day"
          className="w-9 h-9 rounded-full justify-center items-center bg-slate-400/20 border border-slate-400/25 active:bg-slate-400/30"
        >
          <Pencil size={16} color="#CBD5F5" />
        </Pressable>
      </View>
      <Text className="text-muted-foreground text-sm mt-1">
        Day {cycle.paydayDay} • {cycle.startDate} → {cycle.endDate}
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2.5">
        <View className="px-2.5 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30">
          <Text className="text-slate-200 font-medium text-xs">
            Needs {(cycle.needsPct * 100).toFixed(0)}%
          </Text>
        </View>
        <View className="px-2.5 py-2 rounded-full bg-slate-400/20 border border-slate-400/25">
          <Text className="text-slate-200 font-medium text-xs">
            Wants {(cycle.wantsPct * 100).toFixed(0)}%
          </Text>
        </View>
        <View className="px-2.5 py-2 rounded-full bg-blue-500/20 border border-blue-500/30">
          <Text className="text-slate-200 font-medium text-xs">
            Savings {(cycle.savingsPct * 100).toFixed(0)}%
          </Text>
        </View>
      </View>
    </Card>
  );
}
