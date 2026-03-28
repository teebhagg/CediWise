/**
 * SME Ledger - Business Setup
 * First-time setup wizard for creating an SME profile.
 */

import { AppTextField } from "@/components/AppTextField";
import { BusinessCategoryBottomSheet } from "@/components/BusinessCategoryBottomSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StandardHeader, DEFAULT_STANDARD_HEIGHT } from "@/components/CediWiseHeader";
import { BackButton } from "@/components/BackButton";
import { useSmeLedger } from "@/hooks/useSmeLedger";
import { BUSINESS_CATEGORIES_DATA } from "@/types/sme";
import type { BusinessCategoryValue } from "@/types/sme";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import {
  Briefcase,
  Check,
  ChevronDown,
  ShoppingBag,
  Wrench,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BusinessType = "goods" | "services" | "mixed";

const BUSINESS_TYPE_OPTIONS: {
  value: BusinessType;
  label: string;
  description: string;
  icon: typeof ShoppingBag;
}[] = [
  {
    value: "goods",
    label: "Goods",
    description: "I sell physical products (trading, retail, manufacturing)",
    icon: ShoppingBag,
  },
  {
    value: "services",
    label: "Services",
    description: "I provide services (consulting, repair, catering, tech)",
    icon: Wrench,
  },
  {
    value: "mixed",
    label: "Mixed",
    description: "I sell both goods and services",
    icon: Briefcase,
  },
];

export default function SMESetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sme = useSmeLedger();

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BusinessCategoryValue | null>(null);
  const [customCategory, setCustomCategory] = useState("");
  const [tin, setTin] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);

  const canSave = businessName.trim().length > 0 && businessType !== null;

  const resolvedCategory =
    selectedCategory === "Other"
      ? customCategory.trim() || null
      : selectedCategory;

  const selectedCategoryData = selectedCategory
    ? BUSINESS_CATEGORIES_DATA.find((c) => c.name === selectedCategory)
    : null;

  const handleSave = useCallback(async () => {
    if (!canSave || !businessType) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await sme.setupBusiness({
        businessName: businessName.trim(),
        businessType,
        businessCategory: resolvedCategory,
        tin: tin.trim() || null,
        vatRegistered: false,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(sme)");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSaving(false);
    }
  }, [canSave, businessType, businessName, resolvedCategory, tin, sme, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StandardHeader
        title="Business Setup"
        centered
        leading={<BackButton />}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 10 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ height: insets.top + (DEFAULT_STANDARD_HEIGHT || 64) }} />

        {/* Business Name */}
        <AppTextField
          label="Business Name"
          placeholder="e.g. Akosua's Catering"
          autoCapitalize="words"
          returnKeyType="next"
          value={businessName}
          onChangeText={setBusinessName}
          autoFocus
        />

        {/* Business Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What do you sell?</Text>
          <View style={styles.typeList}>
            {BUSINESS_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = businessType === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                  onPress={() => setBusinessType(opt.value)}
                >
                  <Icon
                    color={isSelected ? "#10B981" : "#6B7280"}
                    size={22}
                  />
                  <View style={styles.typeTextRow}>
                    <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.typeDescription}>{opt.description}</Text>
                  </View>
                  {isSelected && <Check color="#10B981" size={20} />}
                </Pressable>
              );
            })}
          </View>

          {businessType && businessType !== "goods" && (
            <Text style={styles.serviceWarning}>
              All service providers must register for VAT regardless of turnover under Act 1151.
            </Text>
          )}
        </View>

        {/* Business Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Business Category</Text>
          <Pressable
            style={({ pressed }) => [
              styles.categorySelector,
              pressed && styles.categorySelectorPressed,
            ]}
            onPress={() => setShowCategorySheet(true)}
          >
            {selectedCategoryData ? (
              <View style={styles.categorySelectedRow}>
                <View
                  style={[
                    styles.categoryIconCircle,
                    { backgroundColor: `${selectedCategoryData.color}20` },
                  ]}
                >
                  <selectedCategoryData.icon
                    color={selectedCategoryData.color}
                    size={20}
                  />
                </View>
                <Text
                  style={[styles.categorySelectedText, { color: selectedCategoryData.color }]}
                >
                  {selectedCategory}
                </Text>
              </View>
            ) : (
              <Text style={styles.categoryPlaceholder}>Select a category</Text>
            )}
            <ChevronDown color="#6B7280" size={18} />
          </Pressable>

          {selectedCategory === "Other" && (
            <View style={styles.customCategoryWrapper}>
              <AppTextField
                label="Specify your category"
                placeholder="e.g. Mobile Money Agent"
                value={customCategory}
                returnKeyType="next"
                onChangeText={setCustomCategory}
              />
            </View>
          )}
        </View>

        {/* TIN (optional) */}
        <View style={styles.section}>
          <AppTextField
            label="Tax ID / TIN (optional)"
            placeholder="Your Ghana TIN number"
            value={tin}
            returnKeyType="done"
            onChangeText={(v) => setTin(v.toUpperCase())}
            autoCapitalize="characters"
          />
        </View>

        {/* Save */}
        <View style={styles.saveWrapper}>
          <PrimaryButton
            disabled={!canSave}
            loading={isSaving}
            onPress={handleSave}
          >
            Start Tracking
          </PrimaryButton>
        </View>
      </ScrollView>

      {/* Category Bottom Sheet */}
      <BusinessCategoryBottomSheet
        visible={showCategorySheet}
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        onClose={() => setShowCategorySheet(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 60,
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  typeList: {
    gap: 10,
  },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  typeOptionSelected: {
    backgroundColor: "rgba(16,185,129,0.1)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.3)",
  },
  typeTextRow: {
    flex: 1,
  },
  typeLabel: {
    color: "#D1D5DB",
    fontSize: 15,
    fontWeight: "600",
  },
  typeLabelSelected: {
    color: "#10B981",
  },
  typeDescription: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },
  serviceWarning: {
    color: "#F59E0B",
    fontSize: 13,
    marginTop: 12,
    lineHeight: 18,
  },
  categorySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minHeight: 52,
  },
  categorySelectorPressed: {
    opacity: 0.7,
  },
  categorySelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  categorySelectedText: {
    fontSize: 15,
    fontWeight: "600",
  },
  categoryPlaceholder: {
    color: "#6B7280",
    fontSize: 15,
  },
  customCategoryWrapper: {
    marginTop: 14,
  },
  saveWrapper: {
    marginTop: 32,
  },
});
