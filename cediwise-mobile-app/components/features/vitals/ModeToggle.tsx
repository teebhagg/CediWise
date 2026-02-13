import { Pressable, Text, View } from "react-native";

import type { UtilitiesMode } from "@/utils/profileVitals";

type ModeToggleProps = {
  value: UtilitiesMode;
  onChange: (mode: UtilitiesMode) => void;
};

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Pressable
        onPress={() => onChange("general")}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 44,
          paddingVertical: 12,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: value === "general" ? "rgba(34,197,94,0.18)" : "rgba(148,163,184,0.10)",
          borderWidth: 1,
          borderColor: value === "general" ? "rgba(34,197,94,0.40)" : "rgba(148,163,184,0.25)",
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ color: "#E2E8F0", fontFamily: "Figtree-Medium" }}>General</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange("precise")}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 44,
          paddingVertical: 12,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: value === "precise" ? "rgba(34,197,94,0.18)" : "rgba(148,163,184,0.10)",
          borderWidth: 1,
          borderColor: value === "precise" ? "rgba(34,197,94,0.40)" : "rgba(148,163,184,0.25)",
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ color: "#E2E8F0", fontFamily: "Figtree-Medium" }}>Precise</Text>
      </Pressable>
    </View>
  );
}

