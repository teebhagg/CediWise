import type { AIBudgetAnalysis } from "@/types/ai";
import { formatCurrency } from "@/utils/formatCurrency";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ActivityIndicator,
  Text,
  UIManager,
  View,
} from "react-native";

const FAB_AVATAR = require("@/assets/images/my-notion-face-transparent.png");

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AIInsightsCollapsibleProps {
  analysis: AIBudgetAnalysis | null;
  isLoading: boolean;
  onAskAI?: (message: string) => void;
}

function riskLabel(r: string): string {
  if (r === "low") return "Low";
  if (r === "high") return "High";
  return "Medium";
}

export function AIInsightsCollapsible({
  analysis,
  isLoading,
  onAskAI,
}: AIInsightsCollapsibleProps) {
  const [open, setOpen] = useState(false);

  const summaryLine = useMemo(() => {
    if (!analysis) return "";
    const n = analysis.insights.length;
    const tips = analysis.recommendations.length;
    return `${n} insights · Forecast · ${tips} tips`;
  }, [analysis]);

  if (isLoading && !analysis) {
    return (
      <View className="mt-6 rounded-md border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 flex-row items-center gap-3">
        <Image source={FAB_AVATAR} style={{ width: 40, height: 40 }} contentFit="contain" />
        <ActivityIndicator color="#34D399" size="small" />
        <Text className="text-emerald-200/80 text-sm flex-1">Loading AI insights…</Text>
      </View>
    );
  }

  if (!analysis) return null;

  return (
    <View className="mt-6 rounded-md border border-emerald-500/30 bg-emerald-950/25 overflow-hidden">
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen(!open);
        }}
        className="flex-row items-center justify-between px-4 py-3 active:opacity-90">
        <View className="flex-row items-center gap-2 flex-1">
          <Image source={FAB_AVATAR} style={{ width: 40, height: 40 }} contentFit="contain" />
          <View className="flex-1">
            <Text className="text-white font-semibold text-sm">AI Insights</Text>
            <Text className="text-white/50 text-xs mt-0.5">{summaryLine}</Text>
          </View>
        </View>
        {open ? (
          <ChevronUp size={20} color="#94A3B8" />
        ) : (
          <ChevronDown size={20} color="#94A3B8" />
        )}
      </Pressable>

      {open ? (
        <View className="border-t border-white/10 px-4 py-3 gap-4">
          <View className="gap-2">
            {analysis.insights.map((ins) => (
              <View key={ins.id} className="gap-0.5">
                <Text className="text-white text-sm font-semibold">{ins.title}</Text>
                <Text className="text-white/70 text-xs leading-5">{ins.description}</Text>
                <View className="flex-row items-center justify-between gap-2 mt-0.5">
                  <Text className="text-emerald-300 text-[11px]">
                    ~₵{formatCurrency(ins.impactGhs)} impact
                    {ins.category ? ` · ${ins.category}` : ""}
                  </Text>
                  {onAskAI && (
                    <Pressable
                      onPress={() => onAskAI(`Regarding the insight "${ins.title}": ${ins.description} What's driving this and how can I get back on track?`)}
                    >
                      <Text className="text-emerald-400 text-[11px] font-medium">Discuss →</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View className="rounded-md bg-white/5 border border-white/10 p-4 gap-1">
            <Text className="text-white/60 text-xs uppercase tracking-wide">Forecast</Text>
            <Text className="text-white text-sm">
              End balance ≈ ₵{formatCurrency(analysis.forecast.projectedEndBalance)} · Savings
              ≈ ₵{formatCurrency(analysis.forecast.projectedSavings)}
            </Text>
            <Text className="text-white/70 text-xs mt-1">
              Risk: {riskLabel(analysis.forecast.riskLevel)}
            </Text>
          </View>

          <View className="gap-2">
            <Text className="text-white/60 text-xs uppercase tracking-wide">
              Recommendations
            </Text>
            {analysis.recommendations.map((r) => (
              <View key={r.id} className="flex-row items-start gap-2">
                <Text className="text-white text-sm leading-5 flex-1">
                  • {r.action} — save ~₵{formatCurrency(r.expectedSavingsGhs)} ({r.difficulty})
                </Text>
                {onAskAI && (
                  <Pressable
                    onPress={() => onAskAI(`I want to ${r.action.toLowerCase()}. What's a realistic plan I can start this week?`)}
                    className="mt-0.5"
                  >
                    <Text className="text-emerald-400 text-[11px] font-medium">How? →</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          {analysis.healthNarrative ? (
            <Text className="text-white/60 text-xs leading-5 border-t border-white/10 pt-3">
              {analysis.healthNarrative}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
