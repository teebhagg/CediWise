import type { LessonSection } from "@/types/literacy";
import { CheckCircle2 } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

type ComparisonSection = Extract<LessonSection, { type: "comparison" }>;

type ComparisonCardProps = {
  section: ComparisonSection;
};

type ColumnProps = {
  label: string;
  points: string[];
  accent: string;
  bg: string;
};

function Column({ label, points, accent, bg }: ColumnProps) {
  return (
    <View style={[styles.column, { backgroundColor: bg, borderColor: accent + "40" }]}>
      <View style={[styles.columnHeader, { borderBottomColor: accent + "50" }]}>
        <Text style={[styles.columnLabel, { color: accent }]}>{label}</Text>
      </View>
      <View style={styles.pointsList}>
        {points.map((point, idx) => (
          <View key={idx} style={styles.pointRow}>
            <CheckCircle2 size={12} color={accent} style={styles.pointIcon} />
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ComparisonCard({ section }: ComparisonCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Column
          label={section.left.label}
          points={section.left.points}
          accent="#2D9B5A"
          bg="rgba(45,155,90,0.08)"
        />
        <View style={styles.divider} />
        <Column
          label={section.right.label}
          points={section.right.points}
          accent="#C9A84C"
          bg="rgba(201,168,76,0.08)"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(71,85,105,0.4)",
  },
  row: {
    flexDirection: "row",
  },
  column: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 0,
  },
  columnHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  columnLabel: {
    fontSize: 13,
    fontFamily: "Figtree-Bold",
    textAlign: "center",
  },
  pointsList: {
    padding: 12,
    gap: 8,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  pointIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  pointText: {
    fontSize: 13,
    lineHeight: 19,
    color: "#cbd5e1",
    fontFamily: "Figtree-Regular",
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: "rgba(71,85,105,0.4)",
  },
});
