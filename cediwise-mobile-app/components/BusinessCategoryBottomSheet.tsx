/**
 * Bottom sheet for selecting a business category with icons.
 * Used in SME business setup form.
 */

import { CustomBottomSheet } from "@/components/common/CustomBottomSheet";
import { BUSINESS_CATEGORIES_DATA } from "@/types/sme";
import type { BusinessCategoryValue } from "@/types/sme";
import * as Haptics from "expo-haptics";
import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

type BusinessCategoryBottomSheetProps = {
  visible: boolean;
  selected: BusinessCategoryValue | null;
  onSelect: (category: BusinessCategoryValue) => void;
  onClose: () => void;
};

export function BusinessCategoryBottomSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: BusinessCategoryBottomSheetProps) {
  const handleSelect = (name: BusinessCategoryValue) => {
    Haptics.selectionAsync();
    onSelect(name);
    onClose();
  };

  return (
    <CustomBottomSheet
      title="Business Category"
      description="What best describes your business?"
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <View style={styles.list}>
        {BUSINESS_CATEGORIES_DATA.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selected === cat.name;
          return (
            <Pressable
              key={cat.name}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
                isSelected && styles.rowSelected,
              ]}
              onPress={() => handleSelect(cat.name)}
              accessibilityRole="button"
              accessibilityLabel={cat.name}
              accessibilityState={{ selected: isSelected }}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: isSelected ? `${cat.color}20` : "rgba(255,255,255,0.05)" },
                ]}
              >
                <Icon
                  color={isSelected ? cat.color : "#9CA3AF"}
                  size={22}
                />
              </View>
              <Text
                style={[
                  styles.rowLabel,
                  isSelected && { color: cat.color },
                ]}
              >
                {cat.name}
              </Text>
              {isSelected && (
                <Check color={cat.color} size={20} style={styles.checkIcon} />
              )}
            </Pressable>
          );
        })}
      </View>
    </CustomBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowSelected: {
    backgroundColor: "rgba(16,185,129,0.06)",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: {
    flex: 1,
    color: "#D1D5DB",
    fontSize: 15,
    fontWeight: "500",
  },
  checkIcon: {
    marginLeft: "auto",
  },
});
