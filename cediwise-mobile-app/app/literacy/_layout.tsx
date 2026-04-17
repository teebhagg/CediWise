import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { Stack } from "expo-router";

export default function LiteracyLayout() {
  return (
    <FeatureErrorBoundary
      feature="literacy"
      title="Learn unavailable"
      description="This learning section had a problem. Try again or return to the Learn tab."
    >
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="[moduleId]" />
        <Stack.Screen name="lesson/[lessonId]" />
        <Stack.Screen name="calculator/[calcId]" />
        <Stack.Screen name="module-complete" />
        <Stack.Screen name="glossary" />
      </Stack>
    </FeatureErrorBoundary>
  );
}
