import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { CheckCircle2, ChevronRight, Info } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import { StandardHeader } from "@/components/CediWiseHeader";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/hooks/useAuth";
import type { BudgetTemplate, LifeStage } from "@/types/budget";
import { log } from "@/utils/logger";
import { formatAllocation } from "@/utils/reallocationEngine";
import { supabase } from "@/utils/supabase";

const LIFE_STAGE_FILTERS: { value: LifeStage | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "student", label: "Student" },
  { value: "young_professional", label: "Young Professional" },
  { value: "family", label: "Family" },
  { value: "retiree", label: "Retiree" },
];

export default function BudgetTemplatesScreen() {
  useAuth();
  const { showSuccess, showError, showInfo } = useAppToast();
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLifeStage, setSelectedLifeStage] = useState<LifeStage | "all">("all");

  const loadTemplates = useCallback(async () => {
    if (!supabase) {
      showError('Error', 'Failed to load budget templates');
      return;
    };
    try {
      const { data, error } = await supabase
        .from("budget_templates")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const loadedTemplates: BudgetTemplate[] = (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        targetAudience: row.target_audience,
        lifeStage: row.life_stage as LifeStage | null,
        needsPct: Number(row.needs_pct),
        wantsPct: Number(row.wants_pct),
        savingsPct: Number(row.savings_pct),
        recommendedCategories: row.recommended_categories,
        isDefault: row.is_default,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
      }));

      setTemplates(loadedTemplates);
    } catch (error) {
      log.error("Failed to load templates:", error);
      showError("Error", "Failed to load budget templates");
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTemplates();
    setRefreshing(false);
  }, [loadTemplates]);

  const handleApplyTemplate = useCallback(
    (template: BudgetTemplate) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      Alert.alert(
        "Apply Template",
        `Apply "${template.name}" template?\n\nThis will update your budget allocation to ${formatAllocation(template.needsPct, template.wantsPct, template.savingsPct)}.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Apply",
            onPress: async () => {
              // TODO: Implement template application
              // This should:
              // 1. Update current cycle percentages
              // 2. Optionally seed new categories based on template
              // 3. Log the adjustment
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showSuccess("Success", "Template applied successfully!");
              router.back();
            },
          },
        ]
      );
    },
    [showSuccess]
  );

  const handlePreview = useCallback((template: BudgetTemplate) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Show detailed preview modal
    showInfo("Preview", "Preview modal coming soon");
  }, [showInfo]);

  // Filter templates
  const filteredTemplates = templates.filter(
    (t) => selectedLifeStage === "all" || t.lifeStage === selectedLifeStage
  );

  const lifeStageBottom = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{flexDirection: "row", gap: 10, alignItems: "center",}}
    >
      {LIFE_STAGE_FILTERS.map(({ value, label }) => (
        <FilterChip
          key={value}
          label={label}
          selected={selectedLifeStage === value}
          onPress={() => setSelectedLifeStage(value)}
        />
      ))}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }} className="flex-1 bg-[#0A0A0A]">
      <StandardHeader
        title="Budget Templates"
        leading={<BackButton />}
        centered
        bottom={lifeStageBottom}
      />

      <FlashList
        data={filteredTemplates}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TemplateCard
            template={item}
            onApply={handleApplyTemplate}
            onPreview={handlePreview}
            delay={0}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32, gap: 16, marginTop: 164}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <Card className="items-center py-10">
                <Text className="text-slate-500 text-center text-sm" style={{ fontFamily: "Figtree-Regular" }}>
                  No templates found for this filter.
                </Text>
              </Card>
            </Animated.View>
          ) : null
        }
      />
    </View>
  );
}

// Filter Chip Component
const FilterChip = React.memo(function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className={
        selected
          ? "rounded-full border border-emerald-500 bg-emerald-500 px-4 py-2.5 active:opacity-70"
          : "rounded-full border border-slate-500/30 bg-slate-500/10 px-4 py-2.5 active:opacity-70"
      }
    >
      <Text
        className={selected ? "text-white" : "text-slate-400"}
        style={{ fontFamily: "Figtree-Medium", fontSize: 14 }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

// Template Card Component
const TemplateCard = React.memo(function TemplateCard({
  template,
  onApply,
  onPreview,
  delay,
}: {
  template: BudgetTemplate;
  onApply: (template: BudgetTemplate) => void;
  onPreview: (template: BudgetTemplate) => void;
  delay: number;
}) {
  const allocation = formatAllocation(template.needsPct, template.wantsPct, template.savingsPct);

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(delay)} className={'py-2'}>
      <Card className="gap-4 p-5">
        {/* Header */}
        <View className="flex-row justify-between items-start">
          <View className="flex-1 mr-3">
            <Text className="text-white text-lg mb-1.5" style={{ fontFamily: "Figtree-Bold", letterSpacing: -0.3 }}>
              {template.name}
            </Text>
            {template.isDefault && (
              <View className="flex-row items-center gap-1 py-1 px-2 rounded-xl bg-emerald-500/10 self-start">
                <CheckCircle2 size={14} color="#10b981" />
                <Text className="text-emerald-500 text-[11px]" style={{ fontFamily: "Figtree-Medium" }}>
                  Recommended
                </Text>
              </View>
            )}
          </View>
          <Pressable
            onPress={() => onPreview(template)}
            className="min-w-[40px] min-h-[40px] items-center justify-center rounded-full bg-slate-500/5 active:opacity-60"
          >
            <Info size={20} color="#64748B" />
          </Pressable>
        </View>

        {/* Description */}
        <Text className="text-slate-400 text-sm leading-5" style={{ fontFamily: "Figtree-Regular" }} numberOfLines={2}>
          {template.description}
        </Text>

        {/* Allocation Display */}
        <View className="flex-row justify-between items-center py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Text className="text-slate-400 text-[13px]" style={{ fontFamily: "Figtree-Medium" }}>
            Allocation
          </Text>
          <Text className="text-emerald-500 text-xl" style={{ fontFamily: "Figtree-Bold", letterSpacing: -0.5 }}>
            {allocation}
          </Text>
        </View>

        {/* Breakdown */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-red-500" />
            <Text className="text-slate-200 text-[13px]" style={{ fontFamily: "Figtree-Regular" }}>
              Needs: {Math.round(template.needsPct * 100)}%
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-amber-500" />
            <Text className="text-slate-200 text-[13px]" style={{ fontFamily: "Figtree-Regular" }}>
              Wants: {Math.round(template.wantsPct * 100)}%
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-emerald-500" />
            <Text className="text-slate-200 text-[13px]" style={{ fontFamily: "Figtree-Regular" }}>
              Savings: {Math.round(template.savingsPct * 100)}%
            </Text>
          </View>
        </View>

        {/* Apply Button */}
        <Pressable
          onPress={() => onApply(template)}
          className="flex-row items-center justify-center gap-2 py-3.5 px-5 rounded-xl bg-emerald-500 active:opacity-60"
        >
          <Text className="text-white text-[15px]" style={{ fontFamily: "Figtree-SemiBold" }}>
            Apply Template
          </Text>
          <ChevronRight size={20} color="#FFFFFF" />
        </Pressable>
      </Card>
    </Animated.View>
  );
});

