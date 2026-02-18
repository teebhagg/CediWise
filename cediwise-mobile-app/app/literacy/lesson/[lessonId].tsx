import { BackButton } from "@/components/BackButton";
import { LessonContentRenderer } from "@/components/features/literacy/LessonContentRenderer";
import { LessonFeedbackModal } from "@/components/features/literacy/LessonFeedbackModal";
import { LessonQuiz } from "@/components/features/literacy/quiz/LessonQuiz";
import { PrimaryButton } from "@/components/PrimaryButton";
import { MODULES } from "@/constants/literacy";
import { LESSON_QUIZZES } from "@/constants/quizzes";
import { useTriggerContext } from "@/contexts/TriggerContext";
import { useAppToast } from "@/hooks/useAppToast";
import { getBundledContent, useLessons } from "@/hooks/useLessons";
import { useLiteracyAnalytics } from "@/hooks/useLiteracyAnalytics";
import { useProgress } from "@/hooks/useProgress";
import type { LessonContent } from "@/types/literacy";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle2, MessageCircle } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { lessons } = useLessons();
  const { saveProgress, isCompleted } = useProgress();
  const { showSuccess, showError } = useAppToast();
  const { setViewedModuleId } = useTriggerContext();
  const { trackLessonView, trackLessonComplete, trackQuizAttempt } =
    useLiteracyAnalytics();

  const lessonStartTime = useRef<number>(Date.now());
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [lessonMarkedComplete, setLessonMarkedComplete] = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────────
  const lesson = lessons.find((l) => l.id === lessonId);
  const rawContent = getBundledContent(lessonId ?? "");

  const content: LessonContent | null = (() => {
    if (!rawContent) return null;
    if (typeof rawContent !== "string") return rawContent as LessonContent;
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed?.schema_version) return parsed as LessonContent;
    } catch {
      // not JSON — treat as Markdown
    }
    return rawContent;
  })();

  const quizQuestions = lessonId ? (LESSON_QUIZZES[lessonId] ?? []) : [];
  const hasQuiz = quizQuestions.length > 0;

  // Already completed before this session?
  const alreadyCompleted = isCompleted(lessonId ?? "");

  // ── Side effects ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (lesson?.module) setViewedModuleId(lesson.module);
    return () => setViewedModuleId(undefined);
  }, [lesson?.module, setViewedModuleId]);

  useEffect(() => {
    if (lesson?.id && lesson?.module) {
      trackLessonView(lesson.id, lesson.module);
    }
  }, [lesson?.id, lesson?.module, trackLessonView]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /** After saving progress, check if this was the last lesson in the module */
  const checkModuleComplete = useCallback(
    (completedLessonId: string) => {
      if (!lesson?.module) return;
      const mod = MODULES.find((m) => m.id === lesson.module);
      if (!mod) return;
      const allDone = mod.lessonIds.every(
        (id) => id === completedLessonId || isCompleted(id)
      );
      if (allDone) {
        setTimeout(() => {
          router.replace(`/literacy/module-complete?moduleId=${mod.id}`);
        }, 800);
      }
    },
    [lesson?.module, isCompleted]
  );

  /** Called by LessonQuiz when the user finishes the quiz */
  const handleQuizComplete = useCallback(
    async (score: number, correctCount: number) => {
      if (!lessonId || !lesson?.module) return;

      const passed = score >= 0.5;
      await saveProgress(lessonId, passed, score);
      trackQuizAttempt(lessonId, lesson.module, correctCount, quizQuestions.length);

      if (passed) {
        setLessonMarkedComplete(true);
        showSuccess(
          "Lesson completed!",
          `Quiz score: ${Math.round(score * 100)}%`
        );
        checkModuleComplete(lessonId);
      } else {
        showError(
          "Not quite there yet",
          "You can review the lesson and try the quiz again."
        );
      }
    },
    [
      lessonId,
      lesson?.module,
      quizQuestions.length,
      saveProgress,
      trackQuizAttempt,
      showSuccess,
      showError,
      checkModuleComplete,
    ]
  );

  /** Called by "Mark as Complete" button (lessons with no quiz) */
  const handleMarkComplete = useCallback(async () => {
    if (!lessonId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveProgress(lessonId, true);

    if (lesson?.id && lesson?.module) {
      const timeSpentSeconds = Math.floor(
        (Date.now() - lessonStartTime.current) / 1000
      );
      trackLessonComplete(lesson.id, lesson.module, timeSpentSeconds);
    }

    setLessonMarkedComplete(true);
    showSuccess("Lesson completed!", "Great progress.");
    checkModuleComplete(lessonId);
  }, [
    lessonId,
    lesson?.id,
    lesson?.module,
    saveProgress,
    trackLessonComplete,
    showSuccess,
    checkModuleComplete,
  ]);

  // ── Render guards ───────────────────────────────────────────────────────────

  if (!lesson) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Lesson not found</Text>
          <BackButton onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const isDone = alreadyCompleted || lessonMarkedComplete;

  // ── UI ──────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      {/* Nav bar */}
      <View style={styles.nav}>
        <BackButton onPress={() => router.back()} />
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFeedbackModal(true);
          }}
          style={styles.feedbackBtn}
        >
          <MessageCircle size={20} color="#10b981" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Lesson header */}
        <View style={styles.lessonHeader}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <View style={styles.lessonMeta}>
            <Text style={styles.lessonMetaText}>
              {lesson.duration_minutes} min
            </Text>
            <View style={styles.metaDot} />
            <Text style={styles.lessonMetaText}>{lesson.difficulty}</Text>
            {isDone && (
              <>
                <View style={styles.metaDot} />
                <CheckCircle2 size={13} color="#2D9B5A" />
                <Text style={[styles.lessonMetaText, styles.doneText]}>
                  Completed
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Lesson content */}
        <View style={styles.contentWrap}>
          <LessonContentRenderer content={content} />
        </View>

        {/* Quiz section */}
        <View style={styles.quizSection}>
          <View style={styles.quizDivider} />

          {hasQuiz ? (
            isDone ? (
              // Already completed — show a compact "retake" option
              <Animated.View
                entering={FadeInDown.duration(300).springify()}
                style={styles.completedQuizCard}
              >
                <CheckCircle2 size={20} color="#2D9B5A" />
                <Text style={styles.completedQuizText}>
                  Quiz completed. Feel free to retake it below.
                </Text>
              </Animated.View>
            ) : null
          ) : null}

          {hasQuiz && (
            <LessonQuiz
              lessonId={lessonId ?? ""}
              questions={quizQuestions}
              onComplete={handleQuizComplete}
            />
          )}

          {!hasQuiz && !isDone && (
            <PrimaryButton onPress={handleMarkComplete}>
              Mark as Complete
            </PrimaryButton>
          )}

          {!hasQuiz && isDone && (
            <Animated.View
              entering={FadeInDown.duration(300).springify()}
              style={styles.completedBanner}
            >
              <CheckCircle2 size={18} color="#2D9B5A" />
              <Text style={styles.completedBannerText}>Lesson completed</Text>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Feedback modal */}
      <LessonFeedbackModal
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  feedbackBtn: {
    padding: 8,
    borderRadius: 30,
    backgroundColor: "rgba(30,41,59,0.6)",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },

  // Lesson header
  lessonHeader: {
    gap: 6,
    marginBottom: 24,
  },
  lessonTitle: {
    fontSize: 22,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
    lineHeight: 30,
  },
  lessonMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  lessonMetaText: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
    textTransform: "capitalize",
  },
  doneText: { color: "#2D9B5A", fontFamily: "Figtree-Medium" },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#334155",
  },

  // Content
  contentWrap: {
    marginBottom: 8,
  },

  // Quiz
  quizSection: {
    marginTop: 16,
    gap: 16,
  },
  quizDivider: {
    height: 1,
    backgroundColor: "rgba(51,65,85,0.5)",
    marginBottom: 8,
  },

  // Completed states
  completedQuizCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(45,155,90,0.08)",
    borderWidth: 1,
    borderColor: "rgba(45,155,90,0.25)",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  completedQuizText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#86efac",
    lineHeight: 19,
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(45,155,90,0.08)",
    borderWidth: 1,
    borderColor: "rgba(45,155,90,0.25)",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  completedBannerText: {
    fontSize: 14,
    fontFamily: "Figtree-Medium",
    color: "#86efac",
  },

  // Not found
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
  },
});
