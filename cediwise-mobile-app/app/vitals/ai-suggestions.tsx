import { AISuggestionsScreen } from "@/components/features/vitals/AISuggestionsScreen";
import type { AppliedAISelections } from "@/components/features/vitals/types";
import { usePendingAISelections } from "@/utils/aiSelections";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AISuggestionsRoute() {
  const params = useLocalSearchParams<{ monthlyIncomeStr: string }>();
  const router = useRouter();
  const { rawSuggestions, updateCurrent } = usePendingAISelections();

  const suggestions = rawSuggestions;
  const monthlyIncome = parseFloat(params.monthlyIncomeStr ?? "");

  if (!suggestions || isNaN(monthlyIncome)) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
        }}>
        <Text style={{ color: "#EF4444" }}>Missing or invalid suggestion data.</Text>
      </SafeAreaView>
    );
  }

  const handleApply = (selections: AppliedAISelections) => {
    updateCurrent(selections);
    router.back();
  };

  const handleSkip = () => {
    updateCurrent(null);
    router.back();
  };

  const handleBack = () => {
    updateCurrent(null);
    router.back();
  };

  return (
    <AISuggestionsScreen
      suggestions={suggestions}
      monthlyIncome={monthlyIncome}
      onApply={handleApply}
      onSkip={handleSkip}
      onBack={handleBack}
    />
  );
}
