import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { Stack } from "expo-router";

export default function SMELayout() {
  return (
    <FeatureErrorBoundary
      feature="sme"
      title="Business ledger unavailable"
      description="SME ledger hit an unexpected error. Try again or return to Home."
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </FeatureErrorBoundary>
  );
}
