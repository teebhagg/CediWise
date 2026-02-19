/**
 * QuizCard — single-question interactive component
 *
 * FR-QZ-010: immediate correct/incorrect feedback on answer selection
 * FR-QZ-002: explanation always shown after answering
 * FR-QZ-013: "Did you know?" shown only on correct first-attempt
 * FR-ACC-006: icon (✓/✗) accompanies colour — never colour alone
 */

import { PrimaryButton } from "@/components/PrimaryButton";
import type { QuizQuestion } from "@/types/literacy";
import * as Haptics from "expo-haptics";
import { CheckCircle2, Lightbulb, XCircle } from "lucide-react-native";
import React, { memo, useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInLeft,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const OPTION_LETTERS = ["A", "B", "C", "D"];

type OptionState = "idle" | "selected" | "correct" | "wrong" | "reveal_correct";

type Props = {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswered: (correct: boolean, firstAttempt: boolean) => void;
  onNext: () => void;
  isLastQuestion: boolean;
};

export const QuizCard = memo(function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswered,
  onNext,
  isLastQuestion,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [wasFirstAttempt, setWasFirstAttempt] = useState(true);

  const shakeValue = useSharedValue(0);

  const handleOptionPress = useCallback(
    (idx: number) => {
      if (isAnswered) return;

      const isCorrect = idx === question.correctIndex;

      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedIndex(idx);
        setIsAnswered(true);
        onAnswered(true, wasFirstAttempt);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        // Shake animation for wrong answer
        shakeValue.value = withSequence(
          withTiming(-6, { duration: 60 }),
          withTiming(6, { duration: 60 }),
          withTiming(-6, { duration: 60 }),
          withTiming(0, { duration: 60 })
        );
        setSelectedIndex(idx);
        setIsAnswered(true);
        setWasFirstAttempt(false);
        onAnswered(false, wasFirstAttempt);
      }
    },
    [isAnswered, question.correctIndex, onAnswered, wasFirstAttempt, shakeValue]
  );

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeValue.value }],
  }));

  const isCorrectAnswer = isAnswered && selectedIndex === question.correctIndex;
  const showDyk =
    isAnswered && isCorrectAnswer && wasFirstAttempt && question.did_you_know;

  function getOptionState(idx: number): OptionState {
    if (!isAnswered) {
      return selectedIndex === idx ? "selected" : "idle";
    }
    if (idx === question.correctIndex) return "correct";
    if (idx === selectedIndex) return "wrong";
    return "idle";
  }

  return (
    <Animated.View entering={FadeInLeft.duration(300).springify()} style={styles.card}>
      {/* Progress pip row */}
      <View style={styles.progressRow}>
        {Array.from({ length: totalQuestions }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.pip,
              i < questionNumber
                ? styles.pipDone
                : i === questionNumber - 1
                  ? styles.pipActive
                  : styles.pipIdle,
            ]}
          />
        ))}
      </View>

      {/* Question number */}
      <Text style={styles.questionMeta}>
        Question {questionNumber} of {totalQuestions}
      </Text>

      {/* Question text */}
      <Animated.View style={shakeStyle}>
        <Text style={styles.questionText}>{question.question}</Text>
      </Animated.View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options.map((opt, idx) => {
          const state = getOptionState(idx);
          return (
            <OptionRow
              key={idx}
              letter={OPTION_LETTERS[idx]}
              text={opt}
              state={state}
              onPress={() => handleOptionPress(idx)}
              index={idx}
            />
          );
        })}
      </View>

      {/* Explanation — shown after answering */}
      {isAnswered && (
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={[
            styles.explanationCard,
            isCorrectAnswer ? styles.explanationCorrect : styles.explanationWrong,
          ]}
        >
          <View style={styles.explanationHeader}>
            {isCorrectAnswer ? (
              <CheckCircle2 size={16} color="#2D9B5A" />
            ) : (
              <XCircle size={16} color="#ef4444" />
            )}
            <Text
              style={[
                styles.explanationLabel,
                { color: isCorrectAnswer ? "#2D9B5A" : "#ef4444" },
              ]}
            >
              {isCorrectAnswer ? "Correct!" : "Not quite"}
            </Text>
          </View>
          <Text style={styles.explanationText}>{question.explanation}</Text>
          {question.source && (
            <Text style={styles.sourceText}>Source: {question.source.label}</Text>
          )}
        </Animated.View>
      )}

      {/* Did You Know — only on correct first-attempt */}
      {showDyk && (
        <Animated.View
          entering={FadeInDown.delay(250).springify()}
          style={styles.dykCard}
        >
          <View style={styles.dykHeader}>
            <Lightbulb size={15} color="#C9A84C" />
            <Text style={styles.dykLabel}>Did You Know?</Text>
          </View>
          <Text style={styles.dykText}>{question.did_you_know}</Text>
        </Animated.View>
      )}

      {/* Next / See Results button — appears after answering */}
      {isAnswered && (
        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <PrimaryButton
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onNext();
            }}
          >
            <Text style={styles.nextButtonText}>
              {isLastQuestion ? "See My Score" : "Next Question →"}
            </Text>
          </PrimaryButton>
        </Animated.View>
      )}
    </Animated.View>
  );
});

// ─── Option Row ───────────────────────────────────────────────────────────────

type OptionRowProps = {
  letter: string;
  text: string;
  state: OptionState;
  onPress: () => void;
  index: number;
};

const OptionRow = memo(function OptionRow({
  letter,
  text,
  state,
  onPress,
  index,
}: OptionRowProps) {
  const letterStyle = [
    styles.optionLetter,
    state === "correct" && styles.optionLetterCorrect,
    state === "wrong" && styles.optionLetterWrong,
  ];

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.option,
          state === "correct" && styles.optionCorrect,
          state === "wrong" && styles.optionWrong,
          state === "selected" && styles.optionSelected,
          pressed && styles.optionPressed,
        ]}
      >
        {/* Letter badge */}
        <View
          style={[
            styles.letterBadge,
            state === "correct" && styles.letterBadgeCorrect,
            state === "wrong" && styles.letterBadgeWrong,
          ]}
        >
          {state === "correct" ? (
            <CheckCircle2 size={16} color="#fff" />
          ) : state === "wrong" ? (
            <XCircle size={16} color="#fff" />
          ) : (
            <Text style={letterStyle}>{letter}</Text>
          )}
        </View>

        {/* Option text */}
        <Text
          style={[
            styles.optionText,
            state === "correct" && styles.optionTextCorrect,
            state === "wrong" && styles.optionTextWrong,
          ]}
        >
          {text}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 40,
    padding: 18,
    gap: 16,
  },

  // Progress pips
  progressRow: {
    flexDirection: "row",
    gap: 5,
  },
  pip: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  pipIdle: { backgroundColor: "#1e293b" },
  pipActive: { backgroundColor: "#C9A84C" },
  pipDone: { backgroundColor: "#2D9B5A" },

  // Question
  questionMeta: {
    fontSize: 11,
    fontFamily: "Figtree-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 17,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
    lineHeight: 25,
  },

  // Options
  optionsContainer: { gap: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 50,
    padding: 12,
  },
  optionPressed: {
    backgroundColor: "rgba(30,41,59,0.8)",
    borderColor: "#475569",
  },
  optionSelected: {
    borderColor: "#C9A84C",
    backgroundColor: "rgba(201,168,76,0.08)",
  },
  optionCorrect: {
    borderColor: "#2D9B5A",
    backgroundColor: "rgba(45,155,90,0.1)",
  },
  optionWrong: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239,68,68,0.08)",
  },
  letterBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  letterBadgeCorrect: {
    backgroundColor: "#2D9B5A",
    borderColor: "#2D9B5A",
  },
  letterBadgeWrong: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  optionLetter: {
    fontSize: 12,
    fontFamily: "Figtree-Bold",
    color: "#94a3b8",
    // color: "black",
  },
  optionLetterCorrect: { color: "#fff" },
  optionLetterWrong: { color: "#fff" },
  optionText: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#cbd5e1",
    // color: "black",
    lineHeight: 20,
  },
  optionTextCorrect: { color: "#86efac", fontFamily: "Figtree-Medium" },
  optionTextWrong: { color: "#fca5a5" },

  // Explanation
  explanationCard: {
    borderWidth: 1,
    borderRadius: 30,
    padding: 14,
    gap: 6,
  },
  explanationCorrect: {
    backgroundColor: "rgba(45,155,90,0.08)",
    borderColor: "rgba(45,155,90,0.3)",
  },
  explanationWrong: {
    backgroundColor: "rgba(239,68,68,0.06)",
    borderColor: "rgba(239,68,68,0.25)",
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  explanationLabel: {
    fontSize: 13,
    fontFamily: "Figtree-Bold",
  },
  explanationText: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#cbd5e1",
    lineHeight: 20,
  },
  sourceText: {
    fontSize: 11,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
    fontStyle: "italic",
    marginTop: 2,
  },

  // Did You Know
  dykCard: {
    backgroundColor: "rgba(201,168,76,0.08)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
    borderRadius: 30,
    padding: 12,
    gap: 6,
  },
  dykHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dykLabel: {
    fontSize: 12,
    fontFamily: "Figtree-Bold",
    color: "#C9A84C",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dykText: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#e2d5a0",
    lineHeight: 20,
  },

  // Next button
  nextButton: {
    backgroundColor: "#1B6B3A",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  nextButtonPressed: { opacity: 0.8 },
  nextButtonText: {
    fontSize: 15,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
});
