import { GlassView } from "@/components/GlassView";
import { formatCurrency } from "@/utils/formatCurrency";
import * as Haptics from "expo-haptics";
import { Button, Dialog } from "heroui-native";
import { CheckIcon, ChevronDown } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { AppTextField } from "./AppTextField";

const EXPANDED_CONTENT_HEIGHT = 350;

export type RolloverDestination = {
  id: string;
  name: string;
};

type Props = {
  visible: boolean;
  totalAmount: number;
  destinations: RolloverDestination[];
  nextCycleStart: string;
  nextCycleEnd: string;
  durationDays: number;
  durationUnit: "days" | "months";
  durationMonths?: number;
  paydayDay: number;
  onClose: () => void;
  onConfirm: (
    allocations: Record<string, number>,
    overrides?: {
      durationDays?: number;
      durationMonths?: number;
      paydayDay?: number;
    }
  ) => void;
};

function formatCycleDates(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${s.getDate()} ${m[s.getMonth()]} - ${e.getDate()} ${m[e.getMonth()]} ${e.getFullYear()}`;
}

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = lastDayOfMonth(result.getFullYear(), result.getMonth());
  result.setDate(Math.min(day, lastDay));
  return result;
}

function computePreviewEndDate(
  startIso: string,
  fallbackEndIso: string,
  unit: "days" | "months",
  durationValue: number
): string {
  if (!startIso || !/^\d{4}-\d{2}-\d{2}/.test(startIso)) return fallbackEndIso;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return fallbackEndIso;
  const dur = Math.max(1, Math.min(365, Math.floor(Number(durationValue)) || 1));
  let end: Date;
  try {
    if (unit === "months") {
      const periodEnd = addMonths(start, dur);
      end = new Date(periodEnd);
      end.setDate(end.getDate() - 1);
    } else {
      end = new Date(start);
      end.setDate(end.getDate() + dur - 1);
    }
    if (Number.isNaN(end.getTime())) return fallbackEndIso;
    return end.toISOString().slice(0, 10);
  } catch {
    return fallbackEndIso;
  }
}

function formatCycleSummary(
  start: string,
  end: string,
  durationUnit: "days" | "months",
  durationDays: number,
  durationMonths: number,
  paydayDay: number
): string {
  const range = formatCycleDates(start, end);
  const paydayOrdinal =
    paydayDay === 1 ? "1st" : paydayDay === 2 ? "2nd" : paydayDay === 3 ? "3rd" : `${paydayDay}th`;
  const durationLabel =
    durationUnit === "months"
      ? `${durationMonths} ${durationMonths === 1 ? "month" : "months"}`
      : `${durationDays} days`;
  return `${range} · ${durationLabel} · Payday ${paydayOrdinal}`;
}

export function RolloverAllocationModal({
  visible,
  totalAmount,
  destinations,
  nextCycleStart,
  nextCycleEnd,
  durationDays,
  durationUnit,
  durationMonths = 1,
  paydayDay,
  onClose,
  onConfirm,
}: Props) {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<'allToFirst' | 'splitEvenly'>('splitEvenly');
  const [unitToggle, setUnitToggle] = useState<"days" | "months">(durationUnit);
  const displayDuration = unitToggle === "months" ? durationMonths : durationDays;
  const [duration, setDuration] = useState(String(displayDuration));
  const [payday, setPayday] = useState(String(paydayDay));
  const [optionsExpanded, setOptionsExpanded] = useState(false);

  const expandedValue = useSharedValue(0);
  const { height: screenHeight } = useWindowDimensions();
  const maxModalHeight = Math.min(screenHeight * 0.85, 600);

  const toggleOptions = useCallback(() => {
    try {
      Haptics.selectionAsync();
    } catch {
      /* ignore */
    }
    setOptionsExpanded((prev) => !prev);
  }, []);

  useEffect(() => {
    expandedValue.value = withTiming(optionsExpanded ? 1 : 0, {
      duration: 280,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [optionsExpanded, expandedValue]);

  useEffect(() => {
    if (visible) {
      setUnitToggle(durationUnit);
      setDuration(String(durationUnit === "months" ? durationMonths : durationDays));
      setPayday(String(paydayDay));
      if (destinations.length > 0 && totalAmount > 0) {
        const split = Math.round(totalAmount / destinations.length);
        const initial: Record<string, number> = {};
        let remainder = totalAmount;
        destinations.forEach((d, i) => {
          const amt = i === destinations.length - 1 ? remainder : split;
          initial[d.id] = amt;
          remainder -= amt;
        });
        setAmounts(initial);
      }
    }
  }, [visible, totalAmount, destinations, durationDays, durationMonths, durationUnit, paydayDay]);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleClose = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      /* ignore */
    }
    onClose();
  };

  const allocated = Object.values(amounts).reduce((s, a) => s + a, 0);
  const allocationValid =
    totalAmount <= 0 ||
    destinations.length === 0 ||
    (Math.abs(allocated - totalAmount) < 0.01 && allocated > 0);

  const handleAllToFirst = () => {
    if (destinations.length === 0) return;
    const first = destinations[0].id;
    const next: Record<string, number> = {};
    destinations.forEach((d) => {
      next[d.id] = d.id === first ? totalAmount : 0;
    });
    setAmounts(next);
    setSelectedOption('allToFirst');
  };

  const handleSplitEvenly = () => {
    const split = Math.floor(totalAmount / destinations.length);
    const next: Record<string, number> = {};
    let remainder = totalAmount;
    destinations.forEach((d, i) => {
      const amt = i === destinations.length - 1 ? remainder : split;
      next[d.id] = amt;
      remainder -= amt;
    });
    setAmounts(next);
    setSelectedOption('splitEvenly');
  };

  const handleConfirm = async () => {
    if (!allocationValid) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      /* ignore */
    }
    const p = Math.max(1, Math.min(31, parseInt(payday, 10) || paydayDay));
    const overrides: {
      durationDays?: number;
      durationMonths?: number;
      paydayDay?: number;
    } = {};
    if (p !== paydayDay) overrides.paydayDay = p;

    if (unitToggle === "months") {
      const m = Math.max(1, Math.min(12, parseInt(duration, 10) || durationMonths));
      if (m !== durationMonths) overrides.durationMonths = m;
    } else {
      const d = Math.max(1, Math.min(365, parseInt(duration, 10) || durationDays));
      if (d !== durationDays) overrides.durationDays = d;
    }

    onConfirm(amounts, Object.keys(overrides).length > 0 ? overrides : undefined);
    onClose();
  };

  const isValid = allocationValid;

  const previewEndDate = useMemo(() => {
    const d =
      unitToggle === "days"
        ? (parseInt(duration, 10) || durationDays)
        : (parseInt(duration, 10) || durationMonths);
    return computePreviewEndDate(nextCycleStart, nextCycleEnd, unitToggle, d);
  }, [nextCycleStart, nextCycleEnd, unitToggle, duration, durationDays, durationMonths]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(expandedValue.value, [0, 1], [0, 180])}deg` }],
  }));

  const expandContentAnimatedStyle = useAnimatedStyle(() => ({
    height: interpolate(expandedValue.value, [0, 1], [0, EXPANDED_CONTENT_HEIGHT]),
    opacity: interpolate(expandedValue.value, [0, 1], [0, 1]),
    overflow: "hidden" as const,
  }));

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/60" />
        <GlassView
          intensity={7}
          tint="dark"
          className="absolute inset-0"
          onTouchEnd={handleClose}
        />
        <Dialog.Content
          className="max-w-[360px] w-full rounded-xl overflow-hidden bg-slate-900/95 p-0"
          style={{ maxHeight: maxModalHeight }}
        >
          <Dialog.Close
            variant="secondary"
            className="absolute top-4 right-4 p-1 z-10 bg-slate-800/70 rounded-full blur-2xl"
            onPress={handleClose}
          />
          <ScrollView
            style={{ maxHeight: maxModalHeight - 60, paddingTop: 40 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            <Text className="text-white text-lg font-bold text-left mb-1">
              {totalAmount > 0 && destinations.length > 0
                ? "Where should your unspent money go?"
                : "Start new cycle"}
            </Text>
            {totalAmount > 0 && destinations.length > 0 ? (
              <Text className="text-slate-400 text-sm text-center mb-4">
                ₵{formatCurrency(totalAmount)} available to allocate
              </Text>
            ) : (
              <Text className="text-slate-400 text-sm mb-4">
                {formatCycleDates(nextCycleStart, nextCycleEnd)}
              </Text>
            )}

            {totalAmount > 0 && destinations.length > 0 && (
              <View className="flex-row gap-2 mb-4">
                <Pressable
                  onPress={handleAllToFirst}
                  className={`flex-row gap-2 px-2 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 ${selectedOption === 'allToFirst' ? 'bg-emerald-500/30 border-emerald-500' : ''}`}
                >
                  <Text className={`text-slate-300 text-xs font-medium text-center ${selectedOption === 'allToFirst' ? 'text-emerald-500' : ''}`}>
                    All to {destinations[0]?.name ?? "Emergency"}
                  </Text>
                  {selectedOption === 'allToFirst' && <CheckIcon size={16} color="#1B6B3A" />}
                </Pressable>
                <Pressable
                  onPress={handleSplitEvenly}
                  className={`flex-row gap-2 px-2 py-2 rounded-lg bg-slate-500/20 border border-slate-500/30 ${selectedOption === 'splitEvenly' ? 'bg-slate-500/30 border-slate-500' : ''}`}
                >
                  <Text className={`text-slate-300 text-xs font-medium text-center ${selectedOption === 'splitEvenly' ? 'text-emerald-500' : ''}`}>
                    Split evenly
                  </Text>
                  {selectedOption === 'splitEvenly' && <CheckIcon size={16} color="#1B6B3A" />}
                </Pressable>
              </View>
            )}

            {destinations.length > 0 && (
              <View className="gap-3 mb-4 max-h-56">
                {destinations.map((d) => (
                  <View
                    key={d.id}
                    className="flex-row items-center justify-between py-3.5 px-3 rounded-[16px] bg-slate-800/50"
                  >
                    <Text className="text-slate-200 font-medium text-sm flex-1">{d.name}</Text>
                    <Text className="text-emerald-400 font-semibold">
                      ₵{formatCurrency(amounts[d.id] ?? 0)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View className="mb-4">
              <Pressable
                onPress={toggleOptions}
                className="flex-row items-center justify-between py-3 px-3 rounded-[22px] bg-slate-800/40 active:bg-slate-800/60"
              >
                <View className="flex-1">
                  <Text className="text-slate-400 text-xs mb-0.5">New cycle</Text>
                  <Text className="text-slate-200 text-sm">
                    {formatCycleSummary(
                      nextCycleStart,
                      previewEndDate,
                      unitToggle,
                      unitToggle === "days" ? (parseInt(duration, 10) || durationDays) : durationDays,
                      unitToggle === "months" ? (parseInt(duration, 10) || durationMonths) : durationMonths,
                      parseInt(payday, 10) || paydayDay
                    )}
                  </Text>
                </View>
                <Animated.View style={chevronAnimatedStyle} className="p-1.5 bg-slate-600/70 rounded-full">
                  <ChevronDown size={20} color="#94A3B8" />
                </Animated.View>
              </Pressable>
              <Animated.View style={expandContentAnimatedStyle}>
                <View className="mt-3 gap-4 pl-0.5" style={{ minHeight: EXPANDED_CONTENT_HEIGHT }}>
                  <View>
                    <Text className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">
                      Duration (weeks/days/months)
                    </Text>
                    <View className="flex-row gap-2 mb-2">
                      <Pressable
                        onPress={() => {
                          setUnitToggle("days");
                          setDuration(String(durationDays));
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-lg border ${unitToggle === "days"
                          ? "bg-emerald-500/20 border-emerald-500/50"
                          : "bg-slate-800/40 border-slate-500/30"
                          }`}
                      >
                        <Text
                          className={`text-sm font-medium text-center ${unitToggle === "days" ? "text-emerald-400" : "text-slate-400"
                            }`}
                        >
                          Weeks (days)
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setUnitToggle("months");
                          setDuration(String(durationMonths));
                        }}
                        className={`flex-1 py-2.5 px-3 rounded-lg border ${unitToggle === "months"
                          ? "bg-emerald-500/20 border-emerald-500/50"
                          : "bg-slate-800/40 border-slate-500/30"
                          }`}
                      >
                        <Text
                          className={`text-sm font-medium text-center ${unitToggle === "months" ? "text-emerald-400" : "text-slate-400"
                            }`}
                        >
                          Months
                        </Text>
                      </Pressable>
                    </View>
                    <AppTextField
                      label={unitToggle === "months" ? "Months" : "Days"}
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      placeholder={String(unitToggle === "months" ? durationMonths : durationDays)}
                    />
                    <Text className="text-slate-500 text-xs mt-1">
                      {unitToggle === "months"
                        ? "Calendar months (30–31 days varies)"
                        : "e.g. 7 weekly, 14 bi-weekly"}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">
                      Day of Pay
                    </Text>
                    <AppTextField
                      label="Day of month (1–31)"
                      value={payday}
                      onChangeText={setPayday}
                      keyboardType="number-pad"
                      placeholder={`${paydayDay}`}
                    />
                    <Text className="text-slate-500 text-xs mt-1">
                      Payday day. 30–31 use last day in February.
                    </Text>
                  </View>
                </View>
              </Animated.View>
            </View>

            <Button
              variant="primary"
              onPress={handleConfirm}
              isDisabled={!isValid}
              className="h-12 rounded-full bg-emerald-500"
            >
              <Button.Label className="text-slate-900 font-semibold">
                {totalAmount > 0 && destinations.length > 0
                  ? "Confirm allocation"
                  : "Start cycle"}
              </Button.Label>
            </Button>
          </ScrollView>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
