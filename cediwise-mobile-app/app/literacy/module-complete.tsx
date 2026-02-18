/**
 * Module Completion Celebration Screen
 * Route: /literacy/module-complete?moduleId=MOD-01
 *
 * Shows when a user completes all lessons in a module.
 * Features: Reanimated confetti, key takeaways, average quiz score,
 * and a next-module CTA.
 */

import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { LEVEL_COLORS, LEVEL_LABELS, MODULES } from "@/constants/literacy";
import { useProgress } from "@/hooks/useProgress";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Star,
} from "lucide-react-native";
import React, { useEffect, useMemo } from "react";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Confetti particle ────────────────────────────────────────────────────────

const COLORS = ["#C9A84C", "#2D9B5A", "#3B82F6", "#E8A020", "#f472b6", "#a78bfa"];

type ParticleProps = {
  x: number;
  delay: number;
  color: string;
  size: number;
};

function ConfettiParticle({ x, delay, color, size }: ParticleProps) {
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    const duration = 1800 + Math.random() * 800;
    translateY.value = withDelay(
      delay,
      withTiming(Dimensions.get("window").height * 0.55, {
        duration,
        easing: Easing.out(Easing.quad),
      })
    );
    translateX.value = withDelay(
      delay,
      withSequence(
        withTiming((Math.random() - 0.5) * 120, { duration: duration / 2 }),
        withTiming((Math.random() - 0.5) * 60, { duration: duration / 2 })
      )
    );
    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(duration - 500, withTiming(0, { duration: 400 }))
      )
    );
    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: 600, easing: Easing.linear }),
        Math.floor(duration / 600),
        false
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animation runs once on mount
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { left: x, backgroundColor: color, width: size, height: size, borderRadius: size / 2 },
        animStyle,
      ]}
    />
  );
}

function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        delay: Math.random() * 600,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
      })),
    []
  );

  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} x={p.x} delay={p.delay} color={p.color} size={p.size} />
      ))}
    </View>
  );
}

// ─── Badge pulse animation ────────────────────────────────────────────────────

function BadgePulse({ color }: { color: string }) {
  const scale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scale.value = withDelay(300, withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.6)) }));
    ringOpacity.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(0, { duration: 600 })
        ),
        3,
        false
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animation runs once on mount
  }, []);

  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: 1 + (1 - ringOpacity.value) * 0.3 }],
  }));

  return (
    <View style={styles.badgeWrap}>
      {/* Pulse ring */}
      <Animated.View
        style={[styles.pulseRing, { borderColor: color }, ringStyle]}
      />
      {/* Badge */}
      <Animated.View
        style={[styles.badgeCircle, { backgroundColor: color + "20", borderColor: color + "60" }, badgeStyle]}
      >
        <Award size={40} color={color} />
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ModuleCompleteScreen() {
  const { moduleId } = useLocalSearchParams<{ moduleId: string }>();
  const { progress } = useProgress();

  const module = useMemo(
    () => MODULES.find((m) => m.id === moduleId),
    [moduleId]
  );

  const nextModule = useMemo(
    () => module?.next_module_id ? MODULES.find((m) => m.id === module.next_module_id) : null,
    [module]
  );

  // Average quiz score across this module's lessons
  const avgScore = useMemo(() => {
    if (!module) return null;
    const scores = module.lessonIds
      .map((id) => progress[id]?.quizScore)
      .filter((s): s is number => s != null);
    if (scores.length === 0) return null;
    return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
  }, [module, progress]);

  if (!module) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.errorText}>Module not found</Text>
      </SafeAreaView>
    );
  }

  const levelColor = LEVEL_COLORS[module.level] ?? "#2D9B5A";
  const levelLabel = LEVEL_LABELS[module.level] ?? module.level;

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (nextModule) {
      router.replace(`/literacy/${nextModule.id}`);
    } else {
      router.replace("/(tabs)/literacy");
    }
  };

  const handleReview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace(`/literacy/${module.id}`);
  };

  return (
    <SafeAreaView style={styles.root}>
      <Confetti />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.topSection}
        >
          <BadgePulse color={levelColor} />

          <Text style={styles.congratsLabel}>Module Complete!</Text>
          <Text style={styles.moduleTitle}>{module.title}</Text>

          <View style={[styles.levelBadge, { backgroundColor: levelColor + "20", borderColor: levelColor + "50" }]}>
            <Text style={[styles.levelBadgeText, { color: levelColor }]}>
              {levelLabel}
            </Text>
          </View>
        </Animated.View>

        {/* Score card */}
        {avgScore != null && (
          <Animated.View
            entering={FadeInDown.delay(250).springify()}
            style={styles.scoreCard}
          >
            <View style={styles.scoreRow}>
              <Star size={18} color="#C9A84C" />
              <Text style={styles.scoreLabel}>Average Quiz Score</Text>
            </View>
            <Text style={[styles.scoreValue, { color: avgScore >= 70 ? "#2D9B5A" : avgScore >= 50 ? "#E8A020" : "#ef4444" }]}>
              {avgScore}%
            </Text>
            <Text style={styles.scoreHint}>
              {avgScore >= 70
                ? "Excellent understanding!"
                : avgScore >= 50
                  ? "Good effort — review any tricky sections."
                  : "Consider revisiting the lessons to strengthen your knowledge."}
            </Text>
          </Animated.View>
        )}

        {/* Key takeaways */}
        <Animated.View
          entering={FadeInDown.delay(350).springify()}
          style={styles.takeawaysCard}
        >
          <View style={styles.takeawaysHeader}>
            <BookOpen size={16} color="#C9A84C" />
            <Text style={styles.takeawaysTitle}>Key Takeaways</Text>
          </View>
          {module.learning_objectives.map((obj, idx) => (
            <View key={idx} style={styles.takeawayRow}>
              <CheckCircle2 size={16} color="#2D9B5A" />
              <Text style={styles.takeawayText}>{obj}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Next module teaser */}
        {nextModule && (
          <Animated.View
            entering={FadeInDown.delay(450).springify()}
            style={styles.nextCard}
          >
            <Text style={styles.nextLabel}>Continue your learning journey</Text>
            <View style={styles.nextContent}>
              <View style={styles.nextText}>
                <Text style={styles.nextTitle}>{nextModule.title}</Text>
                <Text style={styles.nextDesc} numberOfLines={2}>
                  {nextModule.description}
                </Text>
              </View>
              <ChevronRight size={20} color="#2D9B5A" />
            </View>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View
          entering={FadeInUp.delay(500).springify()}
          style={styles.actions}
        >
          <PrimaryButton onPress={handleContinue}>
            <Text style={styles.primaryCtaText}>
              {nextModule ? `Start ${nextModule.title}` : "Back to Learn"}
            </Text>
          </PrimaryButton>
          <SecondaryButton onPress={handleReview}>
            <Text style={styles.secondaryCtaText}>Review Module</Text>
          </SecondaryButton>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 16,
  },
  errorText: {
    color: "#64748b",
    fontFamily: "Figtree-Regular",
    fontSize: 15,
    textAlign: "center",
    marginTop: 40,
  },

  // Confetti
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    pointerEvents: "none",
  },
  particle: {
    position: "absolute",
    top: 0,
  },

  // Badge
  topSection: {
    alignItems: "center",
    paddingTop: 32,
    marginBottom: 24,
  },
  badgeWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    width: 100,
    height: 100,
  },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  badgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  congratsLabel: {
    fontSize: 13,
    fontFamily: "Figtree-Bold",
    color: "#C9A84C",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  moduleTitle: {
    fontSize: 22,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 30,
  },
  levelBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontSize: 12,
    fontFamily: "Figtree-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Score card
  scoreCard: {
    backgroundColor: "rgba(201,168,76,0.08)",
    borderWidth: 1,
    borderColor: "rgba(201,168,76,0.25)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: "Figtree-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scoreValue: {
    fontSize: 42,
    fontFamily: "Figtree-Bold",
    lineHeight: 50,
  },
  scoreHint: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 4,
  },

  // Takeaways
  takeawaysCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  takeawaysHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  takeawaysTitle: {
    fontSize: 13,
    fontFamily: "Figtree-Bold",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  takeawayRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  takeawayText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#cbd5e1",
    lineHeight: 21,
  },

  // Next module
  nextCard: {
    backgroundColor: "rgba(45,155,90,0.08)",
    borderWidth: 1,
    borderColor: "rgba(45,155,90,0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  nextLabel: {
    fontSize: 11,
    fontFamily: "Figtree-Bold",
    color: "#2D9B5A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  nextContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nextText: {
    flex: 1,
    gap: 4,
  },
  nextTitle: {
    fontSize: 16,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  nextDesc: {
    fontSize: 13,
    fontFamily: "Figtree-Regular",
    color: "#64748b",
    lineHeight: 19,
  },

  // Actions
  actions: {
    gap: 10,
  },
  primaryCtaText: {
    fontSize: 16,
    fontFamily: "Figtree-Bold",
    color: "#020617",
  },
  secondaryCtaText: {
    fontSize: 15,
    fontFamily: "Figtree-Medium",
    color: "#94a3b8",
  },
});
