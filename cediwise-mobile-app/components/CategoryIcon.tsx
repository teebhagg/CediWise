/**
 * Renders a category icon with optional colored background.
 */
import {
  DEFAULT_CATEGORY_ICON,
  type CategoryIconName,
} from '@/constants/categoryIcons';
import {
  ArrowLeftRight,
  Baby,
  Beer,
  BookOpen,
  Briefcase,
  Bus,
  Cake,
  Church,
  Coins,
  Droplets,
  Dumbbell,
  Gamepad2,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  Laptop,
  Music,
  Palette,
  PiggyBank,
  Plane,
  Receipt,
  RotateCcw,
  Shield,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Trash2,
  TrendingUp,
  Tv,
  UtensilsCrossed,
  Wallet,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

const ICON_MAP: Record<CategoryIconName, LucideIcon> = {
  Home,
  GraduationCap,
  Bus,
  ShoppingCart,
  Church,
  Zap,
  Droplets,
  Trash2,
  UtensilsCrossed,
  Shirt,
  Laptop,
  Gamepad2,
  Music,
  Dumbbell,
  Plane,
  Heart,
  Briefcase,
  Wallet,
  PiggyBank,
  Landmark,
  Receipt,
  ArrowLeftRight,
  Shield,
  TrendingUp,
  RotateCcw,
  Coins,
  Baby,
  Smartphone,
  Tv,
  BookOpen,
  Palette,
  Cake,
  Beer,
  Gift,
  Sparkles,
};

type Props = {
  icon: CategoryIconName;
  size?: number;
  backgroundColor?: string;
  color?: string;
};

export function CategoryIcon({
  icon,
  size = 24,
  backgroundColor,
  color = '#fff',
}: Props) {
  const LucideIconComponent = ICON_MAP[icon] ?? ICON_MAP[DEFAULT_CATEGORY_ICON];
  const content = (
    <LucideIconComponent size={size * 0.6} color={color} strokeWidth={2} />
  );

  if (backgroundColor) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {content}
      </View>
    );
  }

  return content;
}
