/**
 * QuizResults — end-of-quiz score panel
 *
 * FR-QZ-021: score display with tier-based message (Excellent / Good / Review)
 * FR-QZ-022: review prompt (non-forced) for <60%
 */

import { SCORE_TIERS, getScoreTier } from "@/constants/quizzes";
import * as Haptics from "expo-haptics";
import { RefreshCw, Star } from "lucide-react-native";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { PrimaryButton } from "@/components/PrimaryButton";

type Props = {
  correctCount: number;
  totalCount: number;
  onRetry: () => void;
  onContinue: () => void;
};

export function QuizResults({ correctCount, totalCount, onRetry, onContinue }: Props) {
  const score = totalCount > 0 ? correctCount / totalCount : 0;
  const tier = getScoreTier(score);
  const tierInfo = SCORE_TIERS[tier];

  // Animate the score ring fill
  const ringProgress = useSharedValue(0);
  useEffect(() => {
    Haptics.notificationAsync(
      score >= 0.8
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
    ringProgress.value = withDelay(
      300,
      withTiming(score, { duration: 900, easing: Easing.out(Easing.quad) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animation runs once on mount
  }, []);

  // We fake the ring with a simple percentage bar instead of SVG for compatibility
  const barStyle = useAnimatedStyle(() => ({
    width: `${ringProgress.value * 100}%`,
  }));

  const scorePercent = Math.round(score * 100);

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.card}>
      {/* Score badge */}
      <Animated.View
        entering={FadeInUp.delay(100).springify()}
        style={styles.scoreSection}
      >
        <View style={[styles.scoreBadge, { borderColor: tierInfo.color + "60" }]}>
          <Star size={20} color={tierInfo.color} />
          <Text style={[styles.scorePercent, { color: tierInfo.color }]}>
            {scorePercent}%
          </Text>
          <Text style={styles.scoreFraction}>
            {correctCount}/{totalCount} correct
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: tierInfo.color },
              barStyle,
            ]}
          />
        </View>
      </Animated.View>

      {/* Tier label + message */}
      <Animated.View
        entering={FadeInDown.delay(200).springify()}
        style={styles.tierSection}
      >
        <View style={[styles.tierBadge, { backgroundColor: tierInfo.color + "18", borderColor: tierInfo.color + "40" }]}>
          <Text style={[styles.tierLabel, { color: tierInfo.color }]}>
            {tierInfo.label}
          </Text>
        </View>
        <Text style={styles.tierMessage}>{tierInfo.message}</Text>
      </Animated.View>

      {/* Review nudge for <60% */}
      {tier === "review" && (
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.reviewNudge}
        >
          <Text style={styles.reviewNudgeText}>
            Scroll back up to review the lesson — a second read makes a big difference.
          </Text>
        </Animated.View>
      )}

      {/* CTAs */}
      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        style={styles.actions}
      >
        <PrimaryButton
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onContinue();
          }}
        >
          <Text style={styles.primaryCtaText}>Continue</Text>
        </PrimaryButton>

        <PrimaryButton
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRetry();
          }}
        >
          <RefreshCw size={15} color="#94a3b8" />
          <Text style={styles.retryCtaText}>Try Again</Text>
        </PrimaryButton>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 30,
    padding: 20,
    gap: 16,
    alignItems: "center",
  },

  // Score
  scoreSection: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  scoreBadge: {
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  scorePercent: {
    fontSize: 44,
    fontFamily: "Figtree-Bold",
    lineHeight: 52,
  },
  scoreFraction: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
  },
  progressTrack: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1e293b",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },

  // Tier
  tierSection: {
    alignItems: "center",
    gap: 8,
  },
  tierBadge: {
    borderWidth: 1,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  tierLabel: {
    fontSize: 13,
    fontFamily: "Figtree-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tierMessage: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 21,
  },

  // Review nudge
  reviewNudge: {
    backgroundColor: "rgba(232,160,32,0.08)",
    borderWidth: 1,
    borderColor: "rgba(232,160,32,0.3)",
    borderRadius: 30,
    padding: 12,
    width: "100%",
  },
  reviewNudgeText: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#E8A020",
    lineHeight: 20,
    textAlign: "center",
  },

  // Actions
  actions: {
    width: "100%",
    gap: 10,
  },
  primaryCta: {
    backgroundColor: "#1B6B3A",
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: "center",
  },
  primaryCtaText: {
    fontSize: 16,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  retryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 30,
    paddingVertical: 13,
  },
  retryCtaText: {
    fontSize: 14,
    fontFamily: "Figtree-Medium",
    color: "#94a3b8",
  },
  ctaPressed: { opacity: 0.75 },
});
