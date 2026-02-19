import type { GlassBottomSheetHandle } from "@/components/GlassBottomSheet";
import { GlassBottomSheet } from "@/components/GlassBottomSheet";
import type { ContentSource } from "@/types/literacy";
import * as Haptics from "expo-haptics";
import { BookOpen, ExternalLink, X } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

type GlossaryDefinitionSheetProps = {
  term: string;
  definition: string;
  source?: ContentSource;
  visible: boolean;
  onClose: () => void;
};

export function GlossaryDefinitionSheet({
  term,
  definition,
  source,
  visible,
  onClose,
}: GlossaryDefinitionSheetProps) {
  const sheetRef = useRef<GlassBottomSheetHandle>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sheetRef.current?.close();
  };

  const handleSourcePress = () => {
    if (source?.url) Linking.openURL(source.url);
  };

  if (!visible) return null;

  return (
    <GlassBottomSheet
      ref={sheetRef}
      snapPoints={["42%"]}
      initialIndex={0}
      onClose={onClose}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <BookOpen size={20} color="#2D9B5A" />
        </View>
        <Text style={styles.term} numberOfLines={2}>
          {term}
        </Text>
        <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
          <X size={20} color="#94a3b8" />
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* Definition */}
      <Text style={styles.definition}>{definition}</Text>

      {/* Source */}
      {source && (
        <Pressable onPress={handleSourcePress} style={styles.sourceRow}>
          <ExternalLink size={12} color="#64748b" />
          <Text style={styles.sourceText} numberOfLines={1}>
            {source.label}
          </Text>
        </Pressable>
      )}
    </GlassBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(45,155,90,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  term: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  closeBtn: {
    padding: 4,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(71,85,105,0.4)",
    marginBottom: 14,
  },
  definition: {
    fontSize: 15,
    lineHeight: 24,
    color: "#cbd5e1",
    fontFamily: "Figtree-Regular",
    flex: 1,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  sourceText: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "Figtree-Regular",
    textDecorationLine: "underline",
    flex: 1,
  },
});
