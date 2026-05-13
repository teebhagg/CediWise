import { Stack } from 'expo-router';

export default function DebtLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'black' },
      }}
    >
      <Stack.Screen
        name="ai-chat"
        options={{
          animation: 'default',
          gestureEnabled: true,
          contentStyle: { backgroundColor: '#020617' },
        }}
      />
    </Stack>
  );
}
