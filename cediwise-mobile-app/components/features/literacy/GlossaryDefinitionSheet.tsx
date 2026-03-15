import { CustomBottomSheet } from "@/components/common/CustomBottomSheet";
import type { ContentSource } from "@/types/literacy";
import { ExternalLink } from "lucide-react-native";
import React from "react";
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
  const handleSourcePress = () => {
    if (source?.url) Linking.openURL(source.url);
  };

  return (
    <CustomBottomSheet
      title={term}
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <View style={styles.content}>
        <Text style={styles.definition}>{definition}</Text>
        {source && (
          <Pressable onPress={handleSourcePress} style={styles.sourceRow}>
            <ExternalLink size={12} color="#64748b" />
            <Text style={styles.sourceText} numberOfLines={1}>
              {source.label}
            </Text>
          </Pressable>
        )}
      </View>
    </CustomBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
  definition: {
    fontSize: 15,
    lineHeight: 24,
    color: "#cbd5e1",
    fontFamily: "Figtree-Regular",
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sourceText: {
    fontSize: 11,
    color: "#64748b",
    fontFamily: "Figtree-Regular",
    textDecorationLine: "underline",
    flex: 1,
  },
});
