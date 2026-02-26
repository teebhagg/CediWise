/**
 * Learn (Financial Literacy) Tab
 *
 * FR-SRC-001: Search bar across lessons, modules, and glossary terms
 * FR-SRC-002: Results grouped by type
 * FR-SRC-003: Synonym expansion (momo, susu, bog…)
 * FR-SRC-005: Glossary shortcut card
 */

import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_STANDARD_HEIGHT,
  ExpandedHeader,
} from "@/components/CediWiseHeader";
import { ModuleCard } from "@/components/features/literacy/ModuleCard";
import { MODULES } from "@/constants/literacy";
import { useLessons } from "@/hooks/useLessons";
import { useProgress } from "@/hooks/useProgress";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { BookMarked, ChevronRight } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Main Tab Screen ──────────────────────────────────────────────────────────

export default function LiteracyScreen() {
  const { loading } = useLessons();
  const { isCompleted } = useProgress();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  return (
    <View style={styles.root}>
      <ExpandedHeader
        scrollY={scrollY}
        title="Learn"
        subtitle="Financial literacy tailored for Ghana"
      />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToOffsets={[0, DEFAULT_EXPANDED_HEIGHT - DEFAULT_STANDARD_HEIGHT]}
        snapToEnd={false}
        decelerationRate="fast"
        style={styles.homeScroll}
        contentContainerStyle={[
          styles.homeContent,
          {
            paddingTop: DEFAULT_EXPANDED_HEIGHT + insets.top + 24,
            paddingBottom: insets.bottom + 100,
            gap: 24,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={{ gap: 24, marginTop: 8 }}>
          {/* Glossary shortcut */}
          <Animated.View
            entering={FadeInDown.delay(120).duration(300).springify()}>
            <Pressable
              style={({ pressed }) => [
                styles.glossaryCard,
                pressed && styles.glossaryCardPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/literacy/glossary");
              }}
              hitSlop={8}>
              <View style={styles.glossaryCardLeft}>
                <BookMarked size={20} color="#C9A84C" />
                <View style={styles.glossaryCardText}>
                  <Text style={styles.glossaryCardTitle}>
                    Financial Glossary
                  </Text>
                  <Text style={styles.glossaryCardSubtitle}>
                    75 Ghana-specific terms, A–Z
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color="#C9A84C" />
            </Pressable>
          </Animated.View>

          {/* Section label */}
          <Animated.View
            entering={FadeInDown.delay(160).duration(300).springify()}
            style={styles.modulesHeader}>
            <Text style={styles.modulesLabel}>Modules</Text>
            <Text style={styles.modulesCount}>
              {MODULES.length} available
            </Text>
          </Animated.View>

          {/* Module cards */}
          {loading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            MODULES.map((module, index) => {
              const completedCount = module.lessonIds.filter((id) =>
                isCompleted(id),
              ).length;
              const totalCount = module.lessonIds.length;
              return (
                <ModuleCard
                  key={module.id}
                  module={module}
                  completedCount={completedCount}
                  totalCount={totalCount}
                  index={index}
                />
              );
            })
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
  },

  // Search
  searchWrap: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#f1f5f9",
    padding: 0,
  },

  // Home view
  homeScroll: { flex: 1 },
  homeContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },

  // Glossary shortcut card
  glossaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(201,168,76,0.08)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
  },
  glossaryCardPressed: { opacity: 0.8 },
  glossaryCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  glossaryCardText: { gap: 2 },
  glossaryCardTitle: {
    fontSize: 15,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  glossaryCardSubtitle: {
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
  },

  // Modules section
  modulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 2,
  },
  modulesLabel: {
    fontSize: 13,
    fontFamily: "Figtree-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modulesCount: {
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#475569",
  },
  errorBanner: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#fca5a5",
  },
  errorRetry: {
    fontSize: 12,
    fontFamily: "Figtree-Bold",
    color: "#fecaca",
  },
  loadingState: {
    paddingTop: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
  },

  // Search results
  resultsScroll: { flex: 1 },
  resultsContent: {
    paddingBottom: 40,
    gap: 4,
  },
  emptySearch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 32,
  },
  emptySearchText: {
    fontSize: 15,
    fontFamily: "Figtree-Medium",
    color: "#94a3b8",
    textAlign: "center",
  },
  emptySearchHint: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#475569",
    textAlign: "center",
    lineHeight: 19,
  },
  resultGroupLabel: {
    fontSize: 11,
    fontFamily: "Figtree-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    marginBottom: 6,
  },
  resultRowPressed: {
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(45,155,90,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resultIconModule: {
    backgroundColor: "rgba(201,168,76,0.12)",
  },
  resultIconGlossary: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  resultContent: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 14,
    fontFamily: "Figtree-Medium",
    color: "#e2e8f0",
  },
  termFullForm: {
    fontSize: 11,
    fontFamily: "Figtree-Regular",
    color: "#C9A84C",
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  resultMetaText: {
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
  },
  resultMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#334155",
  },
  seeAllGlossary: {
    paddingVertical: 10,
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 13,
    fontFamily: "Figtree-Medium",
    color: "#C9A84C",
  },
});
