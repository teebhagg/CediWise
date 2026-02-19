import { Text, View } from "react-native";
import { Card } from "../../Card";

export type BudgetHealthScoreProps = {
  visible: boolean;
  /** 0-100 composite score */
  score: number;
  /** Brief label e.g. "On track" | "Needs attention" | "At risk" */
  label: string;
  /** Short explanation */
  summary?: string;
};

function getScoreDisplay(score: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (score >= 75) return { label: "On track", color: "text-emerald-300", bgColor: "bg-emerald-500/20" };
  if (score >= 50) return { label: "Needs attention", color: "text-amber-300", bgColor: "bg-amber-500/20" };
  return { label: "At risk", color: "text-red-300", bgColor: "bg-red-500/20" };
}

export function BudgetHealthScoreCard({
  visible,
  score,
  label,
  summary,
}: BudgetHealthScoreProps) {
  if (!visible) return null;

  const display = getScoreDisplay(score);

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-slate-400 text-xs font-medium uppercase tracking-wide">
            Budget health
          </Text>
          <Text className={`text-lg font-bold mt-1 ${display.color}`}>
            {display.label}
          </Text>
          {summary ? (
            <Text className="text-slate-400 text-sm mt-1">{summary}</Text>
          ) : null}
        </View>
        <View
          className={`w-14 h-14 rounded-full items-center justify-center ${display.bgColor}`}
        >
          <Text className={`text-xl font-bold ${display.color}`}>
            {Math.round(score)}
          </Text>
          <Text className="text-slate-400 text-[10px]">/ 100</Text>
        </View>
      </View>
    </Card>
  );
}
