import type { LessonSection } from "@/types/literacy";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

type TableSection = Extract<LessonSection, { type: "table" }>;

type ContentTableProps = {
  section: TableSection;
};

export function ContentTable({ section }: ContentTableProps) {
  return (
    <View style={styles.wrapper}>
      {section.caption && (
        <Text style={styles.caption}>{section.caption}</Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header row */}
          <View style={styles.headerRow}>
            {section.headers.map((header, colIdx) => (
              <View
                key={colIdx}
                style={[styles.cell, styles.headerCell, { minWidth: colIdx === 0 ? 140 : 100 }]}
              >
                <Text style={styles.headerText}>{header}</Text>
              </View>
            ))}
          </View>

          {/* Data rows */}
          {section.rows.map((row, rowIdx) => (
            <View
              key={rowIdx}
              style={[
                styles.dataRow,
                rowIdx % 2 === 0 ? styles.rowEven : styles.rowOdd,
              ]}
            >
              {row.map((cell, colIdx) => (
                <View
                  key={colIdx}
                  style={[styles.cell, { minWidth: colIdx === 0 ? 140 : 100 }]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      colIdx > 0 && styles.numericCell,
                    ]}
                  >
                    {cell}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 10,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(71,85,105,0.5)",
  },
  caption: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "Figtree-Regular",
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "rgba(27,107,58,0.25)",
  },
  dataRow: {
    flexDirection: "row",
  },
  rowEven: {
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  rowOdd: {
    backgroundColor: "rgba(30,41,59,0.5)",
  },
  cell: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  headerCell: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(71,85,105,0.4)",
  },
  headerText: {
    fontSize: 12,
    fontFamily: "Figtree-Bold",
    color: "#e2e8f0",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  cellText: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#cbd5e1",
    lineHeight: 20,
  },
  numericCell: {
    fontFamily: "Figtree-Medium",
    textAlign: "right",
  },
});
