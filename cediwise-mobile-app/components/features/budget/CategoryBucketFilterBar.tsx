import type { BudgetBucket } from "@/types/budget";
import { DEFAULT_BOTTOM_HEIGHT } from "@/components/CediWiseHeader";
import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import { LayoutGrid, PiggyBank, Shield, Sparkles } from "lucide-react-native";
import { memo, useCallback } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

export type CategoryFilterKey = "all" | BudgetBucket;

type FilterDef = {
  key: CategoryFilterKey;
  label: string;
  icon: LucideIcon;
  activeBg: string;
  activeBorder: string;
  activeText: string;
  badgeBg: string;
  badgeText: string;
};

const FILTER_DEFS: FilterDef[] = [
  {
    key: "all",
    label: "All",
    icon: LayoutGrid,
    activeBg: "rgba(255,255,255,0.14)",
    activeBorder: "rgba(255,255,255,0.28)",
    activeText: "#F8FAFC",
    badgeBg: "rgba(255,255,255,0.16)",
    badgeText: "#E2E8F0",
  },
  {
    key: "needs",
    label: "Needs",
    icon: Shield,
    activeBg: "rgba(59,130,246,0.2)",
    activeBorder: "rgba(96,165,250,0.55)",
    activeText: "#93C5FD",
    badgeBg: "rgba(59,130,246,0.28)",
    badgeText: "#BFDBFE",
  },
  {
    key: "wants",
    label: "Wants",
    icon: Sparkles,
    activeBg: "rgba(168,85,247,0.18)",
    activeBorder: "rgba(192,132,252,0.5)",
    activeText: "#D8B4FE",
    badgeBg: "rgba(168,85,247,0.28)",
    badgeText: "#E9D5FF",
  },
  {
    key: "savings",
    label: "Savings",
    icon: PiggyBank,
    activeBg: "rgba(16,185,129,0.18)",
    activeBorder: "rgba(52,211,153,0.5)",
    activeText: "#6EE7B7",
    badgeBg: "rgba(16,185,129,0.28)",
    badgeText: "#A7F3D0",
  },
];

export const CATEGORY_FILTER_BAR_HEIGHT = DEFAULT_BOTTOM_HEIGHT;

type Props = {
  active: CategoryFilterKey;
  counts: Record<CategoryFilterKey, number>;
  onChange: (key: CategoryFilterKey) => void;
};

type FilterPillProps = {
  item: FilterDef;
  selected: boolean;
  count: number;
  onPress: (key: CategoryFilterKey) => void;
};

const FilterPill = memo(function FilterPill({
  item,
  selected,
  count,
  onPress,
}: FilterPillProps) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={() => onPress(item.key)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${item.label}, ${count} categories`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: selected ? item.activeBg : "rgba(51,65,85,0.35)",
        borderColor: selected ? item.activeBorder : "rgba(148,163,184,0.22)",
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Icon
        size={16}
        color={selected ? item.activeText : "#94A3B8"}
        strokeWidth={2.2}
      />
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: selected ? item.activeText : "#CBD5E1",
        }}
      >
        {item.label}
      </Text>
      <View
        style={{
          minWidth: 22,
          height: 22,
          paddingHorizontal: 6,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: selected ? item.badgeBg : "rgba(15,23,42,0.45)",
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: selected ? item.badgeText : "#94A3B8",
          }}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
});

function CategoryBucketFilterBarInner({ active, counts, onChange }: Props) {
  const handlePress = useCallback(
    (key: CategoryFilterKey) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      if (active === key && key !== "all") {
        onChange("all");
        return;
      }
      onChange(key);
    },
    [active, onChange],
  );

  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <FlatList
        horizontal
        data={FILTER_DEFS}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        extraData={active}
        contentContainerStyle={{
          paddingHorizontal: 8,
          gap: 10,
          alignItems: "center",
        }}
        renderItem={({ item }) => (
          <FilterPill
            item={item}
            selected={active === item.key}
            count={counts[item.key]}
            onPress={handlePress}
          />
        )}
      />
    </View>
  );
}

export const CategoryBucketFilterBar = memo(CategoryBucketFilterBarInner);

export function bucketFilterLabel(bucket: BudgetBucket): string {
  return bucket === "needs" ? "Needs" : bucket === "wants" ? "Wants" : "Savings";
}

export function bucketFilterIcon(bucket: BudgetBucket): LucideIcon {
  if (bucket === "needs") return Shield;
  if (bucket === "wants") return Sparkles;
  return PiggyBank;
}
