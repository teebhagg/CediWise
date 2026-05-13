import { analytics } from "@/utils/analytics";
import { Pressable, ScrollView, Text, View } from "react-native";

export interface QuickPromptsProps {
  healthScore?: { score: number } | null;
  onPick: (t: string) => void;
  disabled?: boolean;
  mode?: "budget" | "debt";
  debtToIncomeRatio?: number;
}

/** Stable React keys and analytics targets — labels may repeat across modes but ids do not. */
export interface QuickPromptChip {
  id: string;
  label: string;
}

export function budgetQuickPromptLabels(
  healthScore?: { score: number } | null,
): QuickPromptChip[] {
  const chips: QuickPromptChip[] = [];
  if (healthScore != null && healthScore.score < 60) {
    chips.push({
      id: "budget-improve-health",
      label: "How do I improve my budget health?",
    });
  }
  chips.push(
    { id: "budget-spend-breakdown", label: "Where is most of my money going?" },
    { id: "budget-savings-track", label: "Am I on track with savings?" },
    { id: "budget-trim-first", label: "What should I trim first?" },
  );
  return chips;
}

export function debtQuickPromptLabels(debtToIncomeRatio?: number): QuickPromptChip[] {
  const chips: QuickPromptChip[] = [];
  if (debtToIncomeRatio != null && debtToIncomeRatio > 0.36) {
    chips.push({
      id: "debt-ratio-high",
      label: "My debt ratio is high — what should I do?",
    });
  }
  chips.push(
    { id: "debt-snowball-avalanche", label: "Snowball vs Avalanche: which is better for me?" },
    { id: "debt-pay-first", label: "Which debt should I pay off first?" },
    {
      id: "debt-extra-payment-interest",
      label: "How much interest will I save with ₵200 extra/month?",
    },
  );
  return chips;
}

interface ChipListProps {
  chips: string[];
  onPick: (s: string) => void;
  disabled?: boolean;
  analyticsEvent: (label: string) => void;
  variant?: "default" | "suggestion";
}

function ChipList({
  chips,
  onPick,
  disabled,
  analyticsEvent,
  variant = "default",
}: ChipListProps) {
  if (!chips || chips.length === 0) return null;

  const outerClass = variant === "suggestion" ? "py-2" : "pb-2";
  const chipClass =
    variant === "suggestion"
      ? "px-4 py-2.5 rounded-full bg-emerald-950/40 border border-emerald-400/30 active:bg-emerald-900/50"
      : "px-3 py-2 rounded-full bg-emerald-950/35 border border-emerald-500/30 active:bg-emerald-900/45";
  const textClass =
    variant === "suggestion"
      ? "text-emerald-50 text-xs font-semibold"
      : "text-emerald-50/95 text-xs font-medium";

  return (
    <View className={outerClass}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {chips.map((c, i) => (
          <Pressable
            key={`${c}-${i}`}
            accessibilityRole="button"
            accessibilityLabel={c}
            disabled={disabled}
            onPress={() => {
              analyticsEvent(c.slice(0, 80));
              onPick(c);
            }}
            className={chipClass}>
            <Text className={textClass}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function QuickPrompts({
  healthScore,
  onPick,
  disabled,
  mode = "budget",
  debtToIncomeRatio,
}: QuickPromptsProps) {
  const chipObjs =
    mode === "debt" ? debtQuickPromptLabels(debtToIncomeRatio) : budgetQuickPromptLabels(healthScore);
  const chips = chipObjs.map((ch) => ch.label);

  return (
    <ChipList
      chips={chips}
      onPick={onPick}
      disabled={disabled}
      analyticsEvent={(label) => analytics.aiQuickPromptTapped({ label })}
      variant="default"
    />
  );
}

export interface SuggestionChipsProps {
  chips: string[];
  onPick: (t: string) => void;
  disabled?: boolean;
}

export function SuggestionChips({ chips, onPick, disabled }: SuggestionChipsProps) {
  return (
    <ChipList
      chips={chips}
      onPick={onPick}
      disabled={disabled}
      analyticsEvent={(label) => analytics.aiSuggestionChipTapped({ label })}
      variant="suggestion"
    />
  );
}
