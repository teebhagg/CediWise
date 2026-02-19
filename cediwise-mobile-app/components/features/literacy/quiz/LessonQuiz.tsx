/**
 * LessonQuiz — orchestrator for the end-of-lesson quiz
 *
 * FR-QZ-020: presents 3–5 questions at the end of every lesson
 * FR-QZ-021: score + tier message after all questions
 * FR-QZ-022: review nudge for <60% (non-forced)
 * FR-QZ-023: records best score and most recent score
 *
 * Flow:
 *   IDLE → (user taps "Start Quiz") → QUESTION[0..n-1] → RESULTS
 *   RESULTS → retry → QUESTION[0]  (reset state)
 *   RESULTS → continue → parent onComplete()
 */

import { QuizCard } from "@/components/features/literacy/quiz/QuizCard";
import { QuizResults } from "@/components/features/literacy/quiz/QuizResults";
import type { QuizQuestion } from "@/types/literacy";
import * as Haptics from "expo-haptics";
import { Brain } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type QuizState = "idle" | "active" | "results";

type Props = {
  lessonId: string;
  questions: QuizQuestion[];
  onComplete: (score: number, correctCount: number) => void;
};

export function LessonQuiz({ lessonId, questions, onComplete }: Props) {
  const [quizState, setQuizState] = useState<QuizState>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const handleAnswered = useCallback((_correct: boolean, _firstAttempt: boolean) => {
    if (_correct) {
      setCorrectCount((c) => c + 1);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // All questions done — show results
      setQuizState("results");
    }
  }, [currentIndex, questions.length]);

  const handleRetry = useCallback(() => {
    setCurrentIndex(0);
    setCorrectCount(0);
    setQuizState("active");
  }, []);

  const handleContinue = useCallback(() => {
    const score = questions.length > 0 ? correctCount / questions.length : 0;
    onComplete(score, correctCount);
  }, [correctCount, questions.length, onComplete]);

  const startQuiz = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentIndex(0);
    setCorrectCount(0);
    setQuizState("active");
  }, []);

  // ── IDLE STATE ──────────────────────────────────────────────────────────────
  if (quizState === "idle") {
    return (
      <Animated.View entering={FadeInDown.duration(300).springify()} style={styles.idleCard}>
        <View style={styles.idleHeader}>
          <Brain size={22} color="#C9A84C" />
          <Text style={styles.idleTitle}>Lesson Quiz</Text>
        </View>
        <Text style={styles.idleSubtitle}>
          Test your understanding with {questions.length} question{questions.length !== 1 ? "s" : ""}.
          You can retry as many times as you like.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.startButton, pressed && styles.startButtonPressed]}
          onPress={startQuiz}
        >
          <Text style={styles.startButtonText}>Start Quiz</Text>
        </Pressable>
      </Animated.View>
    );
  }

  // ── RESULTS STATE ───────────────────────────────────────────────────────────
  if (quizState === "results") {
    return (
      <QuizResults
        correctCount={correctCount}
        totalCount={questions.length}
        onRetry={handleRetry}
        onContinue={handleContinue}
      />
    );
  }

  // ── ACTIVE STATE ────────────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  return (
    <QuizCard
      key={`${lessonId}-q${currentIndex}`}
      question={currentQuestion}
      questionNumber={currentIndex + 1}
      totalQuestions={questions.length}
      onAnswered={handleAnswered}
      onNext={handleNext}
      isLastQuestion={currentIndex === questions.length - 1}
    />
  );
}

const styles = StyleSheet.create({
  idleCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.2)",
    borderRadius: 40,
    padding: 20,
    gap: 12,
  },
  idleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  idleTitle: {
    fontSize: 18,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  idleSubtitle: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
    lineHeight: 21,
  },
  startButton: {
    backgroundColor: "#1B6B3A",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  startButtonPressed: { opacity: 0.8 },
  startButtonText: {
    fontSize: 15,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
});
