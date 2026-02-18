/**
 * Learn (Financial Literacy) Tab
 *
 * FR-SRC-001: Search bar across lessons, modules, and glossary terms
 * FR-SRC-002: Results grouped by type
 * FR-SRC-003: Synonym expansion (momo, susu, bog…)
 * FR-SRC-005: Glossary shortcut card
 */

import { ModuleCard } from "@/components/features/literacy/ModuleCard";
import { MODULES } from "@/constants/literacy";
import { useLessons } from "@/hooks/useLessons";
import { useProgress } from "@/hooks/useProgress";
import { useSearch } from "@/hooks/useSearch";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  BookMarked,
  BookOpen,
  ChevronRight,
  Clock,
  Layers,
  Search,
  X,
} from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

// ─── Search Results View ──────────────────────────────────────────────────────

function SearchResults({ query }: { query: string }) {
  const { lessons } = useLessons();
  const results = useSearch(query, lessons);

  if (results.total === 0) {
    return (
      <View style={styles.emptySearch}>
        <Text style={styles.emptySearchText}>
          {`No results for "${query}"`}
        </Text>
        <Text style={styles.emptySearchHint}>
          {'Try "momo", "susu", "t-bill", "pension", or "budget"'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.resultsScroll}
      contentContainerStyle={styles.resultsContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Lesson results */}
      {results.lessons.length > 0 && (
        <Animated.View entering={FadeInDown.delay(0).duration(250)}>
          <Text style={styles.resultGroupLabel}>Lessons</Text>
          {results.lessons.map((r) => (
            <Pressable
              key={r.id}
              style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/literacy/lesson/${r.id}`);
              }}
            >
              <View style={styles.resultIcon}>
                <BookOpen size={15} color="#2D9B5A" />
              </View>
              <View style={styles.resultContent}>
                <Text style={styles.resultTitle} numberOfLines={1}>{r.title}</Text>
                <View style={styles.resultMeta}>
                  <Text style={styles.resultMetaText}>{r.moduleTitle}</Text>
                  <View style={styles.resultMetaDot} />
                  <Clock size={11} color="#64748b" />
                  <Text style={styles.resultMetaText}>{r.duration_minutes} min</Text>
                </View>
              </View>
              <ChevronRight size={15} color="#475569" />
            </Pressable>
          ))}
        </Animated.View>
      )}

      {/* Module results */}
      {results.modules.length > 0 && (
        <Animated.View entering={FadeInDown.delay(50).duration(250)}>
          <Text style={styles.resultGroupLabel}>Modules</Text>
          {results.modules.map((r) => (
            <Pressable
              key={r.id}
              style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/literacy/${r.id}`);
              }}
            >
              <View style={[styles.resultIcon, styles.resultIconModule]}>
                <Layers size={15} color="#C9A84C" />
              </View>
              <View style={styles.resultContent}>
                <Text style={styles.resultTitle} numberOfLines={1}>{r.title}</Text>
                <Text style={styles.resultMetaText} numberOfLines={1}>{r.description}</Text>
              </View>
              <ChevronRight size={15} color="#475569" />
            </Pressable>
          ))}
        </Animated.View>
      )}

      {/* Glossary results */}
      {results.glossary.length > 0 && (
        <Animated.View entering={FadeInDown.delay(100).duration(250)}>
          <Text style={styles.resultGroupLabel}>Glossary</Text>
          {results.glossary.map((r) => (
            <Pressable
              key={r.term.id}
              style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/literacy/glossary");
              }}
            >
              <View style={[styles.resultIcon, styles.resultIconGlossary]}>
                <BookMarked size={15} color="#64748b" />
              </View>
              <View style={styles.resultContent}>
                <Text style={styles.resultTitle}>{r.term.term}</Text>
                {r.term.full_form && (
                  <Text style={styles.termFullForm}>{r.term.full_form}</Text>
                )}
                <Text style={styles.resultMetaText} numberOfLines={2}>
                  {r.term.definition}
                </Text>
              </View>
            </Pressable>
          ))}
          {results.glossary.length >= 8 && (
            <Pressable
              style={styles.seeAllGlossary}
              onPress={() => router.push("/literacy/glossary")}
            >
              <Text style={styles.seeAllText}>See all glossary terms →</Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </ScrollView>
  );
}

// ─── Main Tab Screen ──────────────────────────────────────────────────────────

export default function LiteracyScreen() {
  const { loading } = useLessons();
  const { isCompleted } = useProgress();
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);
  const isSearching = query.trim().length > 0;

  const clearSearch = useCallback(() => {
    setQuery("");
    inputRef.current?.blur();
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <Animated.View
        entering={FadeInUp.duration(350).springify()}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Learn</Text>
        <Text style={styles.headerSubtitle}>
          Financial literacy tailored for Ghana
        </Text>
      </Animated.View>

      {/* Search bar */}
      <Animated.View
        entering={FadeInDown.delay(80).duration(300).springify()}
        style={styles.searchWrap}
      >
        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder='Search lessons, terms… try "momo" or "pension"'
            placeholderTextColor="#475569"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {isSearching && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={15} color="#64748b" />
            </Pressable>
          )}
        </View>
      </Animated.View>

      {/* Content switches between search results and home view */}
      {isSearching ? (
        <SearchResults query={query.trim()} />
      ) : (
        <ScrollView
          style={styles.homeScroll}
          contentContainerStyle={styles.homeContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="pb-10"
        >
          {/* Glossary shortcut */}
          <Animated.View entering={FadeInDown.delay(120).duration(300).springify()}>
            <Pressable
              style={({ pressed }) => [styles.glossaryCard, pressed && styles.glossaryCardPressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/literacy/glossary");
              }}
            >
              <View style={styles.glossaryCardLeft}>
                <BookMarked size={20} color="#C9A84C" />
                <View style={styles.glossaryCardText}>
                  <Text style={styles.glossaryCardTitle}>Financial Glossary</Text>
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
            style={styles.modulesHeader}
          >
            <Text style={styles.modulesLabel}>Modules</Text>
            <Text style={styles.modulesCount}>{MODULES.length} available</Text>
          </Animated.View>

          {/* Module cards */}
          {loading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : (
            MODULES.map((module, index) => {
              const completedCount = module.lessonIds.filter((id) =>
                isCompleted(id)
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
        </ScrollView>
      )}
    </SafeAreaView>
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
    paddingBottom: 100,
    marginBottom: 140,
    gap: 10,
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
    paddingHorizontal: 20,
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
