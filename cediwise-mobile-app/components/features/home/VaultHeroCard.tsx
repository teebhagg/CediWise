import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Landmark } from "lucide-react-native";
import { Pressable, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { useEffect } from "react";
import Animated, { FadeIn, SlideInUp, useSharedValue, useAnimatedProps, withTiming } from "react-native-reanimated";

import { Card } from "@/components/Card";
import { VaultSparkline } from "@/components/features/vault/VaultSparkline";
import { useVaultStore } from "@/stores/vaultStore";
import { computeVaultTotal } from "@/utils/vaultCalculator";
import { formatCurrency } from "@/utils/formatCurrency";

export interface VaultHeroCardProps {
  animatedStyle?: StyleProp<ViewStyle>;
}

const SPARK_W = 280;
const SPARK_H = 44;

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/** Thousands separators only; digits + optional leading minus. Runs on UI thread — no regex lookaheads. */
function addThousandsSeparatorsWorklet(integerDigits: string): string {
  "worklet";
  const neg = integerDigits.startsWith("-");
  const d = neg ? integerDigits.slice(1) : integerDigits;
  let out = "";
  let n = 0;
  for (let i = d.length - 1; i >= 0; i--) {
    if (n > 0 && n % 3 === 0) out = "," + out;
    out = d[i] + out;
    n++;
  }
  return neg ? "-" + out : out;
}

function AnimatedMoney({ value }: { value: number }) {
  const animatedValue = useSharedValue(value);

  // Update animated value whenever the prop changes
  useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 800 });
  }, [value, animatedValue]);

  const animatedProps = useAnimatedProps(() => {
    const [intRaw, frac] = animatedValue.value.toFixed(2).split(".");
    const formatted = `${addThousandsSeparatorsWorklet(intRaw)}.${frac}`;
    return {
      text: `₵${formatted}`,
      defaultValue: `₵${formatted}`,
    };
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      animatedProps={animatedProps}
      className="text-white text-3xl font-bold tracking-tight py-0 m-0"
    />
  );
}

export function VaultHeroCard({ animatedStyle }: VaultHeroCardProps) {
  const router = useRouter();
  const deposits = useVaultStore((s) => s.deposits);
  const summary = useVaultStore((s) => s.summary);
  const isLoading = useVaultStore((s) => s.isLoading);

  const total = summary?.totalBalance ?? 0;
  /** Per-deposit cumulative series (starting balance first); not month-windowed. */
  const sparkPoints =
    summary?.sparklinePoints ?? computeVaultTotal(deposits).sparklinePoints;

  /** Badge only for cycle surpluses — editing starting balance updates `initial` timestamps and should not read as a “deposit”. */
  const rolloverOnly = deposits.filter((d) => d.source === "cycle_rollover");
  const sorted = [...rolloverOnly].sort(
    (a, b) =>
      new Date(b.depositedAt).getTime() - new Date(a.depositedAt).getTime(),
  );
  const lastRollover = sorted.find(
    (d) => new Date(d.depositedAt).getTime() <= Date.now(),
  );
  const lastAmount = lastRollover?.amount ?? 0;

  const onPress = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    router.push("/vault");
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} style={animatedStyle}>
      <Animated.View entering={SlideInUp.duration(420).delay(80)}>
        <Pressable onPress={onPress}>
          <Card className="border border-emerald-500/20 bg-emerald-500/5">
            <View className="flex-row items-center gap-2 mb-2">
              <Landmark size={18} color="rgba(52, 211, 153, 0.95)" />
              <Text className="text-emerald-200/90 text-sm font-semibold tracking-wide">
                Savings Vault
              </Text>
              {isLoading ? (
                <Text className="text-white/40 text-xs ml-auto">Updating…</Text>
              ) : null}
            </View>
            <Animated.View entering={FadeIn.delay(500).duration(800)}>
              <AnimatedMoney value={total} />
              <Text className="text-white/50 text-xs mt-1 max-w-[95%]">
                Total you&apos;ve built in CediWise from your starting balance and
                cycle-end surpluses (not linked to bank balances).
              </Text>
              {lastAmount > 0 ? (
                <View className="self-start mt-2 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <Text className="text-emerald-300 text-xs font-medium">
                    +₵{formatCurrency(lastAmount)} last surplus
                  </Text>
                </View>
              ) : null}
              <View className="mt-3 items-center">
                <VaultSparkline
                  points={sparkPoints}
                  width={SPARK_W}
                  height={SPARK_H}
                />
              </View>
            </Animated.View>
            <Text className="text-cyan-400/80 text-xs mt-2 text-center">
              Tap for history & starting balance
            </Text>
          </Card>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
