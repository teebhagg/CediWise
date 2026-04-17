import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { Stack } from 'expo-router';

export default function BudgetLayout() {
  return (
    <FeatureErrorBoundary
      feature="budget"
      title="Budget unavailable"
      description="Your budget data is safe. Try again or leave this section and come back."
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'black' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="income" />
        <Stack.Screen name="insights" />
        <Stack.Screen name="cash-flow" />
        <Stack.Screen name="settings" />
      </Stack>
    </FeatureErrorBoundary>
  );
}
