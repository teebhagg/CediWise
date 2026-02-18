import { BackButton } from "@/components/BackButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { LEVEL_COLORS, LEVEL_LABELS, MODULES } from "@/constants/literacy";
import { useLessons } from "@/hooks/useLessons";
import { useProgress } from "@/hooks/useProgress";
import type { Lesson } from "@/types/literacy";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Target,
  Trophy,
} from "lucide-react-native";
import React, { memo, useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

// ─── Lesson Row ───────────────────────────────────────────────────────────────

type LessonRowProps = {
  lesson: Lesson;
  index: number;
  isCompleted: boolean;
  isLocked: boolean;
};

const LessonRow = memo(function LessonRow({
  lesson,
  index,
  isCompleted,
  isLocked,
}: LessonRowProps) {
  const handlePress = () => {
    if (isLocked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/literacy/lesson/${lesson.id}`);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.lessonRow,
          pressed && !isLocked && styles.lessonRowPressed,
          isLocked && styles.lessonRowLocked,
        ]}
      >
        {/* Step number / completion indicator */}
        <View style={styles.stepIndicator}>
          {isCompleted ? (
            <CheckCircle2 size={26} color="#2D9B5A" />
          ) : (
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
            </View>
          )}
        </View>

        {/* Connector line (not on last item) */}
        {/* Content */}
        <View style={styles.lessonContent}>
          <Text
            style={[styles.lessonTitle, isCompleted && styles.lessonTitleDone]}
            numberOfLines={2}
          >
            {lesson.title}
          </Text>
          <View style={styles.lessonMeta}>
            <Clock size={12} color="#64748b" />
            <Text style={styles.lessonMetaText}>
              {lesson.duration_minutes} min
            </Text>
            {isCompleted && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.lessonCompleteText}>Completed</Text>
              </>
            )}
          </View>
        </View>

        {!isLocked && <ChevronRight size={18} color="#475569" />}
      </Pressable>
    </Animated.View>
  );
});

// ─── Module Overview Screen ───────────────────────────────────────────────────

export default function ModuleOverviewScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const { lessons } = useLessons();
  const { isCompleted } = useProgress();

  const module = useMemo(
    () => MODULES.find((m) => m.id === moduleId),
    [moduleId]
  );

  const moduleLessons = useMemo(
    () => lessons.filter((l) => l.module === moduleId),
    [lessons, moduleId]
  );

  const completedCount = useMemo(
    () => moduleLessons.filter((l) => isCompleted(l.id)).length,
    [moduleLessons, isCompleted]
  );

  const totalCount = moduleLessons.length;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const inProgress = completedCount > 0 && !allDone;

  if (!module) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Module not found</Text>
        <BackButton onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const levelColor = LEVEL_COLORS[module.level] ?? "#2D9B5A";
  const levelLabel = LEVEL_LABELS[module.level] ?? module.level;

  // Smart CTA label + action
  const ctaLabel = allDone
    ? "Review Module"
    : inProgress
      ? "Continue Learning"
      : "Start Module";

  const handleCta = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (allDone) {
      // Navigate to completion/celebration screen
      router.push(`/literacy/module-complete?moduleId=${module.id}`);
      return;
    }
    // Navigate to next incomplete lesson
    const nextLesson = moduleLessons.find((l) => !isCompleted(l.id));
    if (nextLesson) {
      router.push(`/literacy/lesson/${nextLesson.id}`);
    }
  };

  const ListHeader = (
    <Animated.View entering={FadeInUp.duration(400).springify()}>
      {/* ── Module header card ─── */}
      <View style={[styles.headerCard, { borderColor: levelColor + "40" }]}>
        {/* Level badge */}
        <View style={styles.headerTop}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + "20", borderColor: levelColor + "50" }]}>
            <Text style={[styles.levelBadgeText, { color: levelColor }]}>
              {levelLabel}
            </Text>
          </View>
          <View style={styles.timePill}>
            <Clock size={12} color="#64748b" />
            <Text style={styles.timePillText}>{module.estimated_minutes} min total</Text>
          </View>
        </View>

        <Text style={styles.moduleTitle}>{module.title}</Text>
        <Text style={styles.moduleDescription}>{module.description}</Text>

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct * 100}%`, backgroundColor: levelColor },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {completedCount}/{totalCount} lessons
          </Text>
        </View>
      </View>

      {/* ── Learning objectives ─── */}
      <View style={styles.objectivesSection}>
        <View style={styles.sectionHeader}>
          <Target size={16} color="#C9A84C" />
          <Text style={styles.sectionTitle}>What you will learn</Text>
        </View>
        {module.learning_objectives.map((obj, idx) => (
          <Animated.View
            key={idx}
            entering={FadeInDown.delay(100 + idx * 50).springify()}
            style={styles.objectiveRow}
          >
            <View style={styles.objectiveDot} />
            <Text style={styles.objectiveText}>{obj}</Text>
          </Animated.View>
        ))}
      </View>

      {/* ── Lessons header ─── */}
      <View style={styles.sectionHeader}>
        <BookOpen size={16} color="#94a3b8" />
        <Text style={styles.sectionTitle}>Lessons</Text>
      </View>
    </Animated.View>
  );

  const ListFooter = (
    <View style={styles.footerContainer}>
      {/* Module complete CTA if all done */}
      {allDone && (
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.completeBanner}
        >
          <Trophy size={20} color="#C9A84C" />
          <Text style={styles.completeBannerText}>
            {"You've completed this module!"}
          </Text>
        </Animated.View>
      )}

      <PrimaryButton onPress={handleCta}>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </PrimaryButton>

      {/* Next module teaser */}
      {allDone && module.next_module_id && (() => {
        const next = MODULES.find((m) => m.id === module.next_module_id);
        if (!next) return null;
        return (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/literacy/${next.id}`);
            }}
            style={styles.nextModuleCard}
          >
            <View style={styles.nextModuleContent}>
              <Text style={styles.nextModuleLabel}>Up next</Text>
              <Text style={styles.nextModuleTitle}>{next.title}</Text>
              <Text style={styles.nextModuleDesc} numberOfLines={1}>
                {next.description}
              </Text>
            </View>
            <ChevronRight size={20} color="#2D9B5A" />
          </Pressable>
        );
      })()}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      {/* Top nav */}
      <View style={styles.nav}>
        <BackButton onPress={() => router.back()} />
      </View>

      <FlashList
        data={moduleLessons}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        renderItem={({ item, index }) => (
          <LessonRow
            lesson={item}
            index={index}
            isCompleted={isCompleted(item.id)}
            isLocked={false}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
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
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#64748b",
    fontFamily: "Figtree-Regular",
    fontSize: 15,
    marginBottom: 12,
  },

  // Header card
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderRadius: 30,
    padding: 18,
    marginBottom: 20,
    marginTop: 8,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  levelBadgeText: {
    fontSize: 11,
    fontFamily: "Figtree-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timePillText: {
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
  },
  moduleTitle: {
    fontSize: 22,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
    marginBottom: 6,
  },
  moduleDescription: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
    lineHeight: 21,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1e293b",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: "Figtree-Medium",
    color: "#64748b",
    minWidth: 70,
    textAlign: "right",
  },

  // Objectives
  objectivesSection: {
    backgroundColor: "rgba(201,168,76,0.06)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
    borderRadius: 30,  // rounded-xl
    padding: 14,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Figtree-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  objectiveRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  objectiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9A84C",
    marginTop: 7,
    flexShrink: 0,
  },
  objectiveText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#cbd5e1",
    lineHeight: 21,
  },

  // Lesson rows
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  lessonRowPressed: {
    opacity: 0.85,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  lessonRowLocked: {
    opacity: 0.4,
  },
  stepIndicator: {
    width: 28,
    alignItems: "center",
    flexShrink: 0,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontSize: 12,
    fontFamily: "Figtree-Bold",
    color: "#64748b",
  },
  lessonContent: {
    flex: 1,
    gap: 4,
  },
  lessonTitle: {
    fontSize: 15,
    fontFamily: "Figtree-Medium",
    color: "#e2e8f0",
    lineHeight: 21,
  },
  lessonTitleDone: {
    color: "#94a3b8",
  },
  lessonMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  lessonMetaText: {
    fontSize: 12,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#334155",
  },
  lessonCompleteText: {
    fontSize: 12,
    fontFamily: "Figtree-Medium",
    color: "#2D9B5A",
  },
  separator: {
    height: 8,
  },

  // Footer
  footerContainer: {
    marginTop: 24,
    gap: 12,
  },
  completeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(201,168,76,0.1)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.3)",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 4,
  },
  completeBannerText: {
    fontSize: 14,
    fontFamily: "Figtree-Medium",
    color: "#C9A84C",
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Figtree-Bold",
    color: "#020617",
  },
  nextModuleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(45,155,90,0.08)",
    borderWidth: 1,
    borderColor: "rgba(45,155,90,0.2)",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  nextModuleContent: {
    flex: 1,
    gap: 2,
  },
  nextModuleLabel: {
    fontSize: 11,
    fontFamily: "Figtree-Bold",
    color: "#2D9B5A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextModuleTitle: {
    fontSize: 15,
    fontFamily: "Figtree-Bold",
    color: "#e2e8f0",
  },
  nextModuleDesc: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
  },
});
