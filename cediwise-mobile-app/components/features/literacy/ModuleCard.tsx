import { Card } from "@/components/Card";
import type { ModuleInfo } from "@/types/literacy";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  BookOpen,
  Briefcase,
  ChevronRight,
  FileText,
  PiggyBank,
  Shield,
  Smartphone,
  TrendingUp,
  Wallet,
} from "lucide-react-native";
import React, { memo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

const ICON_MAP = {
  wallet: Wallet,
  "piggy-bank": PiggyBank,
  smartphone: Smartphone,
  "book-open": BookOpen,
  shield: Shield,
  "file-text": FileText,
  "trending-up": TrendingUp,
  briefcase: Briefcase,
};

type ModuleCardProps = {
  module: ModuleInfo;
  completedCount: number;
  totalCount: number;
  index: number;
};

function ModuleCardInner({
  module,
  completedCount,
  totalCount,
  index,
}: ModuleCardProps) {
  const Icon = ICON_MAP[module.icon as keyof typeof ICON_MAP] ?? BookOpen;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/literacy/${module.id}`);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}
        className="active:opacity-95"
      >
        <Card className="flex-row items-center gap-4">
          <View className="w-12 h-12 rounded-full bg-emerald-500/20 items-center justify-center">
            <Icon size={24} color="#10b981" />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-white text-base font-semibold" numberOfLines={1}>
              {module.title}
            </Text>
            <Text
              className="text-muted-foreground text-sm mt-0.5"
              numberOfLines={1}
            >
              {module.description}
            </Text>
            <View className="flex-row items-center gap-2 mt-2">
              <View className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <View
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </View>
              <Text className="text-muted-foreground text-xs">
                {completedCount}/{totalCount}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color="#94a3b8" />
        </Card>
      </Pressable>
    </Animated.View>
  );
}

export const ModuleCard = memo(ModuleCardInner);
