import { CalendarClock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { Card } from "../../Card";

function formatCycleRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const startStr =
    startYear === endYear
      ? `${start.getDate()} ${months[start.getMonth()]}`
      : `${start.getDate()} ${months[start.getMonth()]} ${startYear}`;
  const endStr = `${end.getDate()} ${months[end.getMonth()]} ${endYear}`;
  return `Last cycle: ${startStr} - ${endStr}`;
}

interface StartNewCycleCardProps {
  visible: boolean;
  startDate: string;
  endDate: string;
  onStartNewCycle: () => void;
}

export function StartNewCycleCard({
  visible,
  startDate,
  endDate,
  onStartNewCycle,
}: StartNewCycleCardProps) {
  if (!visible) return null;

  return (
    <Card className="">
      <View className="flex-row items-start gap-3">
        <View className="mt-0.5 p-2 rounded-full bg-amber-500/20 border border-amber-500/30">
          <CalendarClock size={18} color="#F59E0B" />
        </View>
        <View className="flex-1">
          <Text className="text-white text-base font-semibold">
            Your budget cycle has ended
          </Text>
          <Text className="text-slate-400 text-sm mt-1">
            {startDate && endDate ? formatCycleRange(startDate, endDate) : null}
          </Text>
          <Pressable
            onPress={onStartNewCycle}
            className="mt-3 self-start px-4 py-2.5 rounded-xl bg-emerald-500 active:bg-emerald-600"
          >
            <Text className="text-slate-900 font-semibold text-sm">
              Start new cycle
            </Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}
