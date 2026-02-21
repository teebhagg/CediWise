import { Stack } from 'expo-router';

export default function BudgetLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="income" />
      <Stack.Screen name="insights" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
