import type { LessonContent, LessonSection } from "@/types/literacy";
import Markdown from "@ronradtke/react-native-markdown-display";
import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CalloutCard } from "./sections/CalloutCard";
import { ComparisonCard } from "./sections/ComparisonCard";
import { ContentTable } from "./sections/ContentTable";
import { CtaLinkSection } from "./sections/CtaLinkSection";
import { ExampleCard } from "./sections/ExampleCard";
import { GlossaryTermInline } from "./sections/GlossaryTermInline";

// ─── Markdown styles (legacy fallback) ────────────────────────────────────────

const markdownStyles = {
  body: { color: "#e2e8f0", fontSize: 16, lineHeight: 26 },
  heading1: {
    color: "#f1f5f9",
    fontSize: 20,
    fontFamily: "Figtree-Bold",
    marginTop: 20,
    marginBottom: 10,
  },
  heading2: {
    color: "#f1f5f9",
    fontSize: 17,
    fontFamily: "Figtree-Bold",
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    color: "#f1f5f9",
    fontSize: 15,
    fontFamily: "Figtree-Bold",
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: { marginBottom: 12, fontFamily: "Figtree-Regular" },
  list_item: { marginBottom: 4, fontFamily: "Figtree-Regular" },
  strong: { fontFamily: "Figtree-Bold", color: "#f1f5f9" },
  code_inline: {
    backgroundColor: "#334155",
    color: "#94a3b8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: "Courier",
  },
  code_block: {
    backgroundColor: "#1e293b",
    color: "#94a3b8",
    padding: 14,
    borderRadius: 8,
    marginVertical: 10,
    fontSize: 14,
    fontFamily: "Courier",
  },
  blockquote: {
    backgroundColor: "rgba(71,85,105,0.2)",
    borderLeftWidth: 3,
    borderLeftColor: "#475569",
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 6,
  },
  hr: { backgroundColor: "rgba(71,85,105,0.4)", marginVertical: 14 },
  table: { borderWidth: 1, borderColor: "rgba(71,85,105,0.4)", marginVertical: 10 },
  th: { backgroundColor: "rgba(27,107,58,0.2)", padding: 8 },
  td: { padding: 8, borderTopWidth: 1, borderTopColor: "rgba(71,85,105,0.3)" },
};

// ─── Section renderer ─────────────────────────────────────────────────────────

function renderSection(section: LessonSection, index: number): React.ReactNode {
  switch (section.type) {
    case "text":
      return (
        <Text key={index} style={sectionStyles.text}>
          {section.content}
        </Text>
      );

    case "heading": {
      const headingStyle =
        section.level === 1
          ? sectionStyles.h1
          : section.level === 2
            ? sectionStyles.h2
            : sectionStyles.h3;
      return (
        <Text key={index} style={headingStyle}>
          {section.content}
        </Text>
      );
    }

    case "divider":
      return <View key={index} style={sectionStyles.divider} />;

    case "callout_stat":
    case "callout_tip":
    case "callout_warning":
    case "callout_law":
      return <CalloutCard key={index} section={section} />;

    case "table":
      return <ContentTable key={index} section={section} />;

    case "example":
      return <ExampleCard key={index} section={section} />;

    case "comparison":
      return <ComparisonCard key={index} section={section} />;

    case "cta_link":
      return <CtaLinkSection key={index} section={section} />;

    case "glossary_term":
      return <GlossaryTermInline key={index} section={section} />;

    default:
      return null;
  }
}

// ─── Public component ─────────────────────────────────────────────────────────

type LessonContentRendererProps = {
  content: LessonContent | null;
};

function LessonContentRendererInner({ content }: LessonContentRendererProps) {
  if (!content) {
    return (
      <Text style={sectionStyles.empty}>Content not available.</Text>
    );
  }

  // Legacy Markdown string
  if (typeof content === "string") {
    return <Markdown style={markdownStyles}>{content}</Markdown>;
  }

  // Structured JSON lesson
  return (
    <View style={sectionStyles.container}>
      {content.sections.map((section, idx) => renderSection(section, idx))}
    </View>
  );
}

export const LessonContentRenderer = memo(LessonContentRendererInner);

// ─── Styles ───────────────────────────────────────────────────────────────────

const sectionStyles = StyleSheet.create({
  container: {
    gap: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 26,
    color: "#e2e8f0",
    fontFamily: "Figtree-Regular",
    marginVertical: 4,
  },
  h1: {
    fontSize: 20,
    lineHeight: 28,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
    marginTop: 20,
    marginBottom: 8,
  },
  h2: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
    marginTop: 16,
    marginBottom: 6,
  },
  h3: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Figtree-Bold",
    color: "#cbd5e1",
    marginTop: 12,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(71,85,105,0.35)",
    marginVertical: 16,
  },
  empty: {
    fontSize: 15,
    color: "#64748b",
    fontFamily: "Figtree-Regular",
    textAlign: "center",
    marginTop: 24,
  },
});
