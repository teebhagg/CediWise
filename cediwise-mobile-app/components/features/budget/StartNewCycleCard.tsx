import { Card } from "@/components/Card";
import { formatCurrency } from "@/utils/formatCurrency";
import { CalendarClock, Repeat } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

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

const AMBER_ICON = "#FCD34D";

interface StartNewCycleCardProps {
  visible: boolean;
  startDate: string;
  endDate: string;
  onStartNewCycle: () => void;
  /** Sum of active recurring monthly equivalents (next cycle). */
  recurringMonthlyTotal?: number;
  recurringCount?: number;
}

export function StartNewCycleCard({
  visible,
  startDate,
  endDate,
  onStartNewCycle,
  recurringMonthlyTotal = 0,
  recurringCount = 0,
}: StartNewCycleCardProps) {
  if (!visible) return null;

  const showRecurring =
    recurringCount > 0 && recurringMonthlyTotal > 0;

  return (
    <Card
      className="p-4! gap-3.5 border border-amber-500/25 bg-amber-500/10"
      blurred
    >
      <View className="flex-row items-start gap-3">
        <View className="rounded-2xl bg-amber-500/15 border border-amber-400/25 p-2.5">
          <CalendarClock size={20} color={AMBER_ICON} strokeWidth={2.25} />
        </View>
        <View className="flex-1 min-w-0 pt-0.5">
          <Text className="text-white text-base font-semibold leading-snug">
            Your budget cycle has ended
          </Text>
          <Text className="text-slate-400 text-xs mt-1.5 leading-[18px]">
            {startDate && endDate ? formatCycleRange(startDate, endDate) : null}
          </Text>
        </View>
      </View>

      {showRecurring ? (
        <View className="flex-row items-start gap-2.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5">
          <Repeat size={16} color="#22D3EE" style={{ marginTop: 2 }} />
          <View className="flex-1 min-w-0">
            <Text className="text-cyan-200/90 text-xs font-semibold uppercase tracking-wide">
              Recurring in next cycle
            </Text>
            <Text className="text-slate-200 text-sm mt-1 leading-5">
              {recurringCount} active bill{recurringCount === 1 ? "" : "s"} · ₵
              {formatCurrency(recurringMonthlyTotal)}
              <Text className="text-slate-500"> / month total</Text>
            </Text>
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={onStartNewCycle}
        accessibilityRole="button"
        accessibilityLabel="Start new budget cycle"
        className="min-h-[44px] px-4 rounded-full flex-row items-center justify-center border border-emerald-400/45 bg-emerald-500/20 active:bg-emerald-500/30 self-stretch"
      >
        <Text className="text-emerald-100 font-semibold text-sm">
          Start new cycle
        </Text>
      </Pressable>
    </Card>
  );
}
