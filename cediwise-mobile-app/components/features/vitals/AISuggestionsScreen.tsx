import { PrimaryButton } from "@/components/PrimaryButton";
import type { AIProfileSuggestions } from "@/types/ai";
import { ChevronLeft, Info, Wand2, X } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { expenseMatchesPriority } from "./expenseMatching";
import { SuggestionCard } from "./SuggestionCard";
import {
  isWantsOthersCategory,
  WANTS_OTHERS_CATEGORY_ID,
} from "./wantsOthersCategory";
import type { AppliedAISelections, BudgetTemplateKey, RecurringExpense } from "./types";
import { simulateVitalsBudgetPlan } from "@/utils/simulateVitalsBudgetPlan";

const CONFIDENCE_PRESELECT = 0.7;

function buildInitialSelection<T>(
  items: T[],
  getKey: (item: T) => string,
  getConfidence?: (item: T) => number | undefined,
  matchesPriority?: (item: T) => boolean,
  priorityExpenses: string[] = [],
): Set<string> {
  const selected = new Set<string>();
  if (priorityExpenses.length > 0 && matchesPriority) {
    for (const item of items) {
      if (matchesPriority(item)) selected.add(getKey(item));
    }
    if (selected.size > 0) {
      selected.add(WANTS_OTHERS_CATEGORY_ID);
      return selected;
    }
  }
  for (const item of items) {
    const confidence = getConfidence?.(item) ?? 1;
    if (confidence >= CONFIDENCE_PRESELECT) {
      selected.add(getKey(item));
    }
  }
  selected.add(WANTS_OTHERS_CATEGORY_ID);
  return selected;
}
// Actually, let's just inline formatGHS since I see it was local to Steps.tsx earlier:
function formatCurrency(amount: number): string {
  return `₵${Math.round(Math.max(0, amount)).toLocaleString("en-GB")}`;
}

interface AISuggestionsScreenProps {
  suggestions: AIProfileSuggestions;
  monthlyIncome: number;
  priorityExpenses?: string[];
  onApply: (selections: AppliedAISelections) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function AISuggestionsScreen({
  suggestions,
  monthlyIncome,
  priorityExpenses = [],
  onApply,
  onSkip,
  onBack
}: AISuggestionsScreenProps) {
  const insets = useSafeAreaInsets();

  // Selection state (using IDs or types as keys); pre-select high-confidence items
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() =>
    buildInitialSelection(
      suggestions.categories,
      (c) => c.id,
      (c) => c.confidence,
      (c) => expenseMatchesPriority(c.name, priorityExpenses),
      priorityExpenses,
    ),
  );
  const [selectedRecurring, setSelectedRecurring] = useState<Set<string>>(() =>
    buildInitialSelection(
      suggestions.recurringExpenses.filter((r) => r.bucket !== "savings"),
      (r) => r.id,
      (r) => r.confidence,
      (r) => expenseMatchesPriority(r.name, priorityExpenses),
      priorityExpenses,
    ),
  );
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(() =>
    buildInitialSelection(
      suggestions.goals,
      (g) => g.type,
      (g) => g.confidence,
    ),
  );

  const [showProTip, setShowProTip] = useState(true);

  // Editable overrides (mapping id -> amount)
  const [amountOverrides, setAmountOverrides] = useState<Record<string, number>>({});

  const toggleCategory = (id: string) => {
    const next = new Set(selectedCategories);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedCategories(next);
  };

  const toggleRecurring = (id: string) => {
    const next = new Set(selectedRecurring);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedRecurring(next);
  };

  const toggleGoal = (type: string) => {
    const next = new Set(selectedGoals);
    if (next.has(type)) next.delete(type); else next.add(type);
    setSelectedGoals(next);
  };

  const setOverride = (id: string, amount: number) => {
    setAmountOverrides(prev => ({ ...prev, [id]: amount }));
  };

  // Monthly allocations — simulate final minimal-seed budget (not selected lines only)
  const simulatedPlan = useMemo(() => {
    const split = suggestions.budgetSplit;
    const needsPct = split?.needsPct ?? 0.5;
    const wantsPct = split?.wantsPct ?? 0.3;
    const savingsPct = split?.savingsPct ?? 0.2;

    const categoryRows = suggestions.categories
      .filter((c) =>
        isWantsOthersCategory(c.name, c.bucket) || selectedCategories.has(c.id),
      )
      .map((c) => ({
        name: c.name,
        bucket: c.bucket,
        limit: amountOverrides[c.id] ?? c.suggestedLimit,
      }));

    const savingsRecurringAsCategories = suggestions.recurringExpenses
      .filter((r) => selectedRecurring.has(r.id) && r.bucket === "savings")
      .map((r) => ({
        name: r.name,
        bucket: "savings" as const,
        limit: amountOverrides[r.id] ?? r.amount,
      }));

    return simulateVitalsBudgetPlan({
      takeHome: monthlyIncome,
      needsPct,
      wantsPct,
      savingsPct,
      categories: [...categoryRows, ...savingsRecurringAsCategories],
    });
  }, [
    amountOverrides,
    monthlyIncome,
    selectedCategories,
    selectedRecurring,
    suggestions.budgetSplit,
    suggestions.categories,
    suggestions.recurringExpenses,
  ]);

  const totalSelected = simulatedPlan.totalPlanned;
  const isOverBudget = !simulatedPlan.valid;
  const remaining = Math.max(0, monthlyIncome - totalSelected);
  const totalSelectedCount = selectedCategories.size + selectedRecurring.size + selectedGoals.size;

  const handleApply = () => {
    if (totalSelectedCount === 0 || isOverBudget) return;

    const categoryRows = suggestions.categories
      .filter((c) =>
        isWantsOthersCategory(c.name, c.bucket) || selectedCategories.has(c.id),
      )
      .map((c) => ({
        name: c.name,
        bucket: c.bucket,
        limit: amountOverrides[c.id] ?? c.suggestedLimit,
      }));

    const savingsRecurringAsCategories = suggestions.recurringExpenses
      .filter((r) => selectedRecurring.has(r.id) && r.bucket === "savings")
      .map((r) => ({
        name: r.name,
        bucket: "savings" as const,
        limit: amountOverrides[r.id] ?? r.amount,
      }));

    const recurringExpenses: RecurringExpense[] = suggestions.recurringExpenses
      .filter((r) => selectedRecurring.has(r.id) && r.bucket !== "savings")
      .map((r) => ({
        id: r.id,
        name: r.name,
        bucket: r.bucket === "needs" ? "needs" : "wants",
        amount: String(amountOverrides[r.id] ?? r.amount),
      }));

    const appliedSelections: AppliedAISelections = {
      categories: [...categoryRows, ...savingsRecurringAsCategories],
      recurringExpenses,
      goals: suggestions.goals
        .filter((g) => selectedGoals.has(g.type))
        .map((g) => ({
          type: g.type,
          goalAmount: String(amountOverrides[g.type] ?? g.amount),
          goalTimeline: String(g.timelineMonths),
        })),
      templateKey: suggestions.templateKey as BudgetTemplateKey,
      budgetSplit: suggestions.budgetSplit
        ? {
            needsPct: suggestions.budgetSplit.needsPct,
            wantsPct: suggestions.budgetSplit.wantsPct,
            savingsPct: suggestions.budgetSplit.savingsPct,
          }
        : undefined,
    };

    onApply(appliedSelections);
  };

  // Progress bar animation
  const progressPercent = monthlyIncome > 0 ? Math.min(1, totalSelected / monthlyIncome) : 0;
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressPercent * 100}%`,
    backgroundColor: withTiming(isOverBudget ? "#EF4444" : "#34D399")
  }), [progressPercent, isOverBudget]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.backButton}>
            <ChevronLeft size={24} color="#F8FAFC" />
          </Pressable>
          <Text style={styles.headerTitle}>AI Suggestions</Text>
          <Pressable onPress={onSkip} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
        <View style={styles.subtitleRow}>
          <Wand2 size={16} color="#A7F3D0" />
          <Text style={styles.subtitleText}>{suggestions.templateReason}</Text>
        </View>
      </View>

      {/* Income Budget Bar (Sticky) */}
      <View style={styles.budgetBarContainer}>
        <View style={styles.budgetBarHeader}>
          <Text style={styles.budgetBarTitle}>Monthly budget income</Text>
          <Text style={styles.budgetBarAmount}>{formatCurrency(monthlyIncome)}</Text>
        </View>

        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, progressStyle]} />
        </View>

        <View style={styles.budgetBarFooter}>
          <Text style={styles.budgetBarSubtext}>
            Selected: <Text style={{ color: isOverBudget ? "#FCA5A5" : "#E2E8F0" }}>{formatCurrency(totalSelected)}</Text>
          </Text>
          <Text style={styles.budgetBarSubtext}>
            Remaining: <Text style={{ color: isOverBudget ? "#FCA5A5" : "#A7F3D0" }}>{formatCurrency(remaining)}</Text>
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {showProTip && (
          <Animated.View entering={FadeIn} style={styles.proTipBanner}>
            <View style={{ flexDirection: "row", gap: 10, flex: 1 }}>
              <Info size={18} color="#94A3B8" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.proTipTitle}>Pro-Tip</Text>
                <Text style={styles.proTipText}>
                  Tap any amount to customize your budget limit. Check the boxes to include them.
                </Text>
              </View>
            </View>
            <Pressable onPress={() => setShowProTip(false)} hitSlop={10} style={styles.proTipClose}>
              <X size={16} color="#64748B" />
            </Pressable>
          </Animated.View>
        )}

        {suggestions.categories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Suggested Categories</Text>
              <View style={styles.sectionLine} />
            </View>
            {suggestions.categories.map((c) => {
              const isOthers = isWantsOthersCategory(c.name, c.bucket);
              const accepted = isOthers || selectedCategories.has(c.id);
              const val = amountOverrides[c.id] ?? c.suggestedLimit;
              return (
                <SuggestionCard
                  key={c.id}
                  title={c.name}
                  bucket={c.bucket}
                  amount={formatCurrency(val)}
                  reason={c.reason}
                  accepted={accepted}
                  editable={!isOthers}
                  allowZeroAmount={isOthers}
                  selectionIcon={isOthers ? "plus" : "checkbox"}
                  toggleDisabled={isOthers}
                  onAmountChange={(num) => setOverride(c.id, num)}
                  onToggle={() => toggleCategory(c.id)}
                />
              );
            })}
          </View>
        )}

        {suggestions.recurringExpenses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Monthly Expenses</Text>
              <View style={styles.sectionLine} />
            </View>
            {suggestions.recurringExpenses.map(r => {
              const accepted = selectedRecurring.has(r.id);
              const val = amountOverrides[r.id] ?? r.amount;
              return (
                <SuggestionCard
                  key={r.id}
                  title={r.name}
                  bucket={r.bucket}
                  amount={formatCurrency(val)}
                  reason={r.reason}
                  accepted={accepted}
                  editable={true}
                  onAmountChange={(num) => setOverride(r.id, num)}
                  onToggle={() => toggleRecurring(r.id)}
                />
              );
            })}
          </View>
        )}

        {suggestions.goals.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Financial Goals</Text>
              <View style={styles.sectionLine} />
            </View>
            {suggestions.goals.map(g => {
              const accepted = selectedGoals.has(g.type);
              const val = amountOverrides[g.type] ?? g.amount;
              return (
                <SuggestionCard
                  key={g.type}
                  title={g.type.replaceAll('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  bucket="savings"
                  amount={formatCurrency(val)}
                  subtitle={`${g.timelineMonths} months timeline`}
                  reason={g.reason}
                  accepted={accepted}
                  editable={true}
                  onAmountChange={(num) => setOverride(g.type, num)}
                  onToggle={() => toggleGoal(g.type)}
                />
              );
            })}
          </View>
        )}

      </ScrollView>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {isOverBudget && (
          <View style={styles.errorBanner}>
            <Info size={16} color="#FCA5A5" />
            <Text style={styles.errorBannerText}>
              Selections exceed monthly income by {formatCurrency(totalSelected - monthlyIncome)}
            </Text>
          </View>
        )}

        <PrimaryButton
          onPress={handleApply}
          disabled={totalSelectedCount === 0 || isOverBudget}
        >
          {isOverBudget
            ? "Over Budget"
            : totalSelectedCount > 0
              ? `Apply ${totalSelectedCount} Selection${totalSelectedCount > 1 ? 's' : ''}`
              : "Select items to apply"}
        </PrimaryButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    alignItems: "flex-start",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontFamily: "Figtree-Bold",
    fontSize: 18,
  },
  skipText: {
    color: "#94A3B8",
    fontFamily: "Figtree-Medium",
    fontSize: 15,
  },
  subtitleRow: {
    flexDirection: "row",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  subtitleText: {
    flex: 1,
    color: "#A7F3D0",
    fontFamily: "Figtree-Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  budgetBarContainer: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.1)",
  },
  budgetBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  budgetBarTitle: {
    color: "#94A3B8",
    fontFamily: "Figtree-Medium",
    fontSize: 13,
  },
  budgetBarAmount: {
    color: "#F8FAFC",
    fontFamily: "Figtree-Bold",
    fontSize: 16,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  budgetBarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetBarSubtext: {
    color: "#94A3B8",
    fontFamily: "Figtree-Medium",
    fontSize: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#94A3B8",
    fontFamily: "Figtree-SemiBold",
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
  },
  bottomBar: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.1)",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(127, 29, 29, 0.3)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: {
    color: "#FCA5A5",
    fontFamily: "Figtree-Medium",
    fontSize: 13,
  },
  proTipBanner: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    marginBottom: 20,
    alignItems: "flex-start",
  },
  proTipTitle: {
    color: "#E2E8F0",
    fontFamily: "Figtree-SemiBold",
    fontSize: 14,
    marginBottom: 4,
  },
  proTipText: {
    color: "#94A3B8",
    fontFamily: "Figtree-Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  proTipClose: {
    padding: 4,
    marginLeft: 8,
  }
});
