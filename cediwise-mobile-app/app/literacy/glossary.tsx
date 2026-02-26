/**
 * Financial Glossary Screen
 * Route: /literacy/glossary
 *
 * FR-SRC-005: searchable, alphabetically indexed glossary
 * FR-SRC-006: 75 terms (≥ 60 required)
 * FR-SRC-007: tapping a term opens a bottom sheet with full definition
 */

import { AppTextField } from "@/components/AppTextField";
import { BackButton } from "@/components/BackButton";
import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_STANDARD_HEIGHT,
  ExpandedHeader,
} from "@/components/CediWiseHeader";
import { GlassBottomSheet } from "@/components/GlassBottomSheet";
import {
  GLOSSARY,
  getGlossarySections,
  type GlossaryTerm,
} from "@/constants/glossary";
import { useAppToast } from "@/hooks/useAppToast";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ChevronRight, ExternalLink, Search, X } from "lucide-react-native";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Glossary Term Card ───────────────────────────────────────────────────────

const TermCard = memo(function TermCard({
  term,
  onPress,
  index,
}: {
  term: GlossaryTerm;
  onPress: (t: GlossaryTerm) => void;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 20).duration(250)}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress(term);
        }}
        style={({ pressed }) => [
          styles.termCard,
          pressed && styles.termCardPressed,
        ]}>
        <View style={styles.termCardContent}>
          <Text style={styles.termName}>{term.term}</Text>
          {term.full_form && (
            <Text style={styles.termFullForm}>{term.full_form}</Text>
          )}
          <Text style={styles.termDefinitionPreview} numberOfLines={2}>
            {term.definition}
          </Text>
        </View>
        <ChevronRight size={16} color="#475569" />
      </Pressable>
    </Animated.View>
  );
});

// ─── Term Detail Modal (bottom-anchored sheet) ────────────────────────────────

function TermDetailModal({
  term,
  onClose,
}: {
  term: GlossaryTerm | null;
  onClose: () => void;
}) {
  const { showError } = useAppToast();

  const handleOpenSource = useCallback(async () => {
    const url = term?.source?.url;
    if (!url) return;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        showError("Link not supported", "Unable to open this source.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      showError("Link failed", "Unable to open this source.");
    }
  }, [term?.source?.url, showError]);

  if (!term) return null;

  return (
    <GlassBottomSheet
      // ref={sheetRef}
      // snapPoints={["42%"]}
      initialIndex={0}
      onClose={onClose}>
      {/* <Pressable style={styles.modalBackdrop} onPress={onClose} /> */}
      <Animated.View
        entering={FadeInUp.duration(300).springify()}
        style={styles.sheet}>
        {/* Handle */}
        {/* <View style={styles.sheetHandle} /> */}

        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleWrap}>
            <Text style={styles.sheetTerm}>{term.term}</Text>
            {term.full_form && (
              <Text style={styles.sheetFullForm}>{term.full_form}</Text>
            )}
          </View>
          <Pressable onPress={onClose} style={styles.sheetCloseBtn}>
            <X size={18} color="#64748b" />
          </Pressable>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Definition */}
          <Text style={styles.sheetDefinition}>{term.definition}</Text>

          {/* Module tags */}
          {term.module_tags && term.module_tags.length > 0 && (
            <View style={styles.sheetTagsRow}>
              {term.module_tags.map((tag) => (
                <View key={tag} style={styles.sheetTag}>
                  <Text style={styles.sheetTagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Source */}
          {term.source && (
            <Pressable style={styles.sheetSource} onPress={handleOpenSource}>
              <Text style={styles.sheetSourceLabel}>
                Source: {term.source.label}
              </Text>
              {term.source.url && <ExternalLink size={13} color="#64748b" />}
            </Pressable>
          )}
        </ScrollView>
      </Animated.View>
    </GlassBottomSheet>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const AnimatedSectionList = Animated.createAnimatedComponent(SectionList);

export default function GlossaryScreen() {
  const [query, setQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<GlossaryTerm | null>(null);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return GLOSSARY;
    const q = query.toLowerCase();
    return GLOSSARY.filter((t) =>
      `${t.term} ${t.full_form ?? ""} ${t.definition} ${t.tags.join(" ")}`
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  const sections = useMemo(() => getGlossarySections(filtered), [filtered]);

  const handleTermPress = useCallback((term: GlossaryTerm) => {
    setSelectedTerm(term);
  }, []);

  const clearSearch = () => {
    setQuery("");
    inputRef.current?.blur();
  };

  const searchBar = (
    <View style={{ width: "100%" }}>
      <AppTextField
        containerClassName="w-full"
        prefixIcon={<Search size={16} color="#64748b" />}
        suffixIcon={
          query.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={15} color="#64748b" />
            </Pressable>
          )
        }
        placeholder="Search terms..."
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        autoCorrect={true}
        autoCapitalize="none"
      />
    </View>
  );

  return (
    <View style={styles.root}>
      <ExpandedHeader
        scrollY={scrollY}
        title="Financial Glossary"
        subtitle={`${GLOSSARY.length} terms tailored for Ghana`}
        centered={true}
        leading={<BackButton onPress={() => router.back()} />}
        bottom={searchBar}
      />

      {/* Search bar pinned below header if not scrolling? No, within ScrollView for glossary usually works best if it's part of header, but here it's better at top of list */}

      {/* Result count when searching */}
      {/* {query.length > 0 && (
        <Text style={[styles.resultCount, { marginTop: 10 }]}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &quot;
          {query}&quot;
        </Text>
      )} */}

      {/* Alphabetical section list */}
      {sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No terms match &quot;{query}&quot;
          </Text>
          <Pressable onPress={clearSearch}>
            <Text style={styles.clearText}>Clear search</Text>
          </Pressable>
        </View>
      ) : (
        <AnimatedSectionList
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          snapToOffsets={[0, DEFAULT_EXPANDED_HEIGHT - DEFAULT_STANDARD_HEIGHT]}
          snapToEnd={false}
          decelerationRate="fast"
          sections={sections}
          keyExtractor={(item: any) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }: any) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLetter}>{section.letter}</Text>
            </View>
          )}
          renderItem={({ item, index }: any) => (
            <TermCard
              term={item}
              onPress={handleTermPress}
              index={index % 10}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          SectionSeparatorComponent={() => (
            <View style={styles.sectionSeparator} />
          )}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: DEFAULT_EXPANDED_HEIGHT + insets.top + 60,
            },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Term detail modal */}
      <TermDetailModal
        term={selectedTerm}
        onClose={() => setSelectedTerm(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  nav: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 4,
  },
  headerIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
  },

  // Search
  searchWrap: {
    // width: "fill",
    paddingHorizontal: 20,
    paddingBottom: 8,
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
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Figtree-Regular",
    color: "#f1f5f9",
    padding: 0,
  },
  resultCount: {
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
    paddingHorizontal: 20,
    marginBottom: 4,
  },

  // Section list
  sectionHeader: {
    backgroundColor: "#000000",
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  sectionLetter: {
    fontSize: 13,
    fontFamily: "Figtree-Bold",
    color: "#C9A84C",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  listContent: {
    paddingBottom: 48,
  },

  // Term cards
  termCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#000000",
    gap: 12,
  },
  termCardPressed: {
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  termCardContent: {
    flex: 1,
    gap: 2,
  },
  termName: {
    fontSize: 15,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  termFullForm: {
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#C9A84C",
    marginBottom: 2,
  },
  termDefinitionPreview: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
    lineHeight: 19,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginLeft: 20,
  },
  sectionSeparator: {
    height: 4,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
  },
  clearText: {
    fontSize: 14,
    fontFamily: "Figtree-Medium",
    color: "#2D9B5A",
  },

  // Term detail modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    // backgroundColor: "#111111",
    // borderTopLeftRadius: 20,
    // borderTopRightRadius: 20,
    // borderWidth: 1,
    // borderColor: "rgba(255,255,255,0.08)",
    // maxHeight: "75%",
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  sheetTitleWrap: {
    flex: 1,
    gap: 2,
  },
  sheetTerm: {
    fontSize: 20,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  sheetFullForm: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#C9A84C",
  },
  sheetCloseBtn: {
    padding: 4,
    marginLeft: 12,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    padding: 20,
    gap: 16,
  },
  sheetDefinition: {
    fontSize: 15,
    fontFamily: "Figtree-Regular",
    color: "#cbd5e1",
    lineHeight: 24,
  },
  sheetTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  sheetTag: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sheetTagText: {
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
  },
  sheetSource: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sheetSourceLabel: {
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
    fontStyle: "italic",
  },
});
