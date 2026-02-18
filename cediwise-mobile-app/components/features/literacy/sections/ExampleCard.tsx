import type { LessonSection } from "@/types/literacy";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ExampleSection = Extract<LessonSection, { type: "example" }>;

type ExampleCardProps = {
  section: ExampleSection;
};

export function ExampleCard({ section }: ExampleCardProps) {
  return (
    <View style={styles.container}>
      {/* Ghana gold accent strip */}
      <View style={styles.accentStrip} />

      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Worked Example</Text>
          </View>
        </View>

        <Text style={styles.title}>{section.title}</Text>
        <Text style={styles.content}>{section.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(201,168,76,0.08)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
    flexDirection: "row",
  },
  accentStrip: {
    width: 4,
    backgroundColor: "#C9A84C",
  },
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "rgba(201,168,76,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Figtree-Bold",
    color: "#C9A84C",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
    marginBottom: 6,
  },
  content: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "Figtree-Regular",
    color: "#cbd5e1",
  },
});
