import { Stack } from "expo-router";

export default function LiteracyLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[moduleId]" />
      <Stack.Screen name="lesson/[lessonId]" />
      <Stack.Screen name="calculator/[calcId]" />
      <Stack.Screen name="module-complete" />
      <Stack.Screen name="glossary" />
    </Stack>
  );
}
