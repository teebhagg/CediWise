import { InputAccessoryView, Keyboard, Platform, Pressable, Text, View } from "react-native";

export function KeyboardDoneAccessory({ accessoryId }: { accessoryId: string }) {
  if (Platform.OS !== "ios") return null;

  return (
    <InputAccessoryView nativeID={accessoryId}>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.10)",
          backgroundColor: "rgba(0,0,0,0.92)",
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => Keyboard.dismiss()}
          style={({ pressed }) => ({
            minHeight: 36,
            paddingHorizontal: 14,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.14)",
            borderWidth: 1,
            borderColor: "rgba(34,197,94,0.35)",
          })}
        >
          <Text style={{ color: "#E2E8F0", fontFamily: "Figtree-Medium" }}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

