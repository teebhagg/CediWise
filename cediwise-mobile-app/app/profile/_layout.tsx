import { Stack } from "expo-router";

const darkHeader = {
  headerStyle: { backgroundColor: "#000000" },
  headerTintColor: "#F8FAFC",
  headerTitleStyle: { fontWeight: "600" as const, color: "#F8FAFC" },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: "#000000" },
};

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: "Profile",
        animation: "slide_from_right",
        ...darkHeader,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
