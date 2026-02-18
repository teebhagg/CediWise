import { GlossaryDefinitionSheet } from "@/components/features/literacy/GlossaryDefinitionSheet";
import type { LessonSection } from "@/types/literacy";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

type GlossarySection = Extract<LessonSection, { type: "glossary_term" }>;

type GlossaryTermInlineProps = {
  section: GlossarySection;
};

export function GlossaryTermInline({ section }: GlossaryTermInlineProps) {
  const [open, setOpen] = useState(false);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(true);
  };

  return (
    <>
      <Pressable onPress={handlePress} style={styles.container}>
        <Text style={styles.term}>{section.term}</Text>
        <Text style={styles.hint}> — tap to define</Text>
      </Pressable>

      <GlossaryDefinitionSheet
        term={section.term}
        definition={section.definition}
        source={section.source}
        visible={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    marginVertical: 4,
  },
  term: {
    fontSize: 15,
    fontFamily: "Figtree-Bold",
    color: "#C9A84C",
    textDecorationLine: "underline",
    textDecorationColor: "rgba(201,168,76,0.5)",
    textDecorationStyle: "dashed",
  },
  hint: {
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
  },
});
