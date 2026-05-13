import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import type { IChipGrid } from "./types";
import { chatTheme } from "@/constants/chatTheme";

export const EmptyChipGrid: React.FC<IChipGrid> = ({
  options = [],
  columns = 2,
  gap = 12,
  containerStyle,
  chipStyle,
  labelStyle,
  iconStyle,
}) => {
  const safeOptions = options || [];
  return (
    <View style={[styles.container, containerStyle]}>
      {chunkArray(safeOptions, columns).map((row, rowIdx) => (
        <View
          key={rowIdx}
          style={[styles.row, { marginTop: rowIdx === 0 ? 0 : gap }]}
        >
          {row.map((item, colIdx) => (
            <TouchableOpacity
              key={`${rowIdx}-${colIdx}`}
              activeOpacity={0.7}
              onPress={item.onPress}
              style={[
                styles.chip,
                chipStyle,
                {
                  marginLeft: colIdx === 0 ? 0 : gap,
                },
              ]}
            >
              <View style={[styles.iconWrapper, iconStyle]}>{item.icon}</View>
              <Text style={[styles.label, labelStyle]} numberOfLines={1}>
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
          {row.length < columns &&
            Array.from({ length: columns - row.length }).map((_, i) => (
              <View key={`spacer-${i}`} style={{ flex: 1, marginLeft: gap }} />
            ))}
        </View>
      ))}
    </View>
  );
};

function chunkArray<T>(arr: T[] | null | undefined, size: number): T[][] {
  if (!arr) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: chatTheme.chipBorder,
    backgroundColor: chatTheme.chipBg,
    ...Platform.select({
      ios: {
        shadowColor: chatTheme.chipShadowIos,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: { elevation: 5 },
    }),
  },
  iconWrapper: {
    marginRight: 8,
  },
  label: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: 0.15,
  },
});
