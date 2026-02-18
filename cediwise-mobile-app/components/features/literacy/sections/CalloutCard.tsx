import type { LessonSection } from "@/types/literacy";
import { AlertTriangle, Gavel, Lightbulb, TrendingUp } from "lucide-react-native";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

type CalloutType = "callout_stat" | "callout_tip" | "callout_warning" | "callout_law";

type CalloutSection = Extract<LessonSection, { type: CalloutType }>;

type CalloutCardProps = {
  section: CalloutSection;
};

type CalloutConfig = {
  borderColor: string;
  bgColor: string;
  iconColor: string;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
};

const CALLOUT_CONFIG: Record<CalloutType, CalloutConfig> = {
  callout_stat: {
    borderColor: "#64748b",
    bgColor: "rgba(100,116,139,0.12)",
    iconColor: "#94a3b8",
    label: "Data",
    Icon: TrendingUp,
  },
  callout_tip: {
    borderColor: "#2D9B5A",
    bgColor: "rgba(45,155,90,0.12)",
    iconColor: "#2D9B5A",
    label: "Tip",
    Icon: Lightbulb,
  },
  callout_warning: {
    borderColor: "#E8A020",
    bgColor: "rgba(232,160,32,0.12)",
    iconColor: "#E8A020",
    label: "Warning",
    Icon: AlertTriangle,
  },
  callout_law: {
    borderColor: "#3B82F6",
    bgColor: "rgba(59,130,246,0.12)",
    iconColor: "#3B82F6",
    label: "Legal",
    Icon: Gavel,
  },
};

export function CalloutCard({ section }: CalloutCardProps) {
  const config = CALLOUT_CONFIG[section.type];
  const { Icon } = config;

  const handleSourcePress = () => {
    if (section.source?.url) {
      Linking.openURL(section.source.url);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderLeftColor: config.borderColor,
          backgroundColor: config.bgColor,
        },
      ]}
    >
      <View style={styles.header}>
        <Icon size={16} color={config.iconColor} />
        <Text style={[styles.label, { color: config.iconColor }]}>
          {config.label}
        </Text>
      </View>

      <Text style={styles.content}>{section.content}</Text>

      {section.source && (
        <Pressable
          onPress={handleSourcePress}
          style={styles.sourceRow}
          hitSlop={8}
        >
          <Text style={styles.sourceText} numberOfLines={1}>
            Source: {section.source.label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: "Figtree-Bold",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  content: {
    fontSize: 15,
    lineHeight: 23,
    color: "#cbd5e1",
    fontFamily: "Figtree-Regular",
  },
  sourceRow: {
    marginTop: 8,
  },
  sourceText: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "Figtree-Regular",
    textDecorationLine: "underline",
  },
});
