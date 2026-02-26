import { GlassView } from '@/components/GlassView';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Tunables to match your reference (once you share the screenshot/video frame).
const H_MARGIN = 16;
const PADDING = 10;
const BAR_RADIUS = 28;
const BAR_HEIGHT = 68;
const INDICATOR_HEIGHT = 50;
const INDICATOR_RADIUS = 20;

const INDICATOR_MAX_WIDTH = 85;
const INDICATOR_MIN_WIDTH = 30;
const BG = '#020617';
const BORDER = 'rgba(255,255,255,0.10)';
const ACTIVE = '#22C55E';
const INACTIVE = '#94A3B8';

const SPRING = { damping: 18, stiffness: 220, mass: 0.6 } as const;

export function CustomTabBar(props: BottomTabBarProps) {
  const { state, descriptors, navigation } = props;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const tabCount = state.routes.length;
  const usableWidth = Math.max(0, width - H_MARGIN * 2 - PADDING * 2);
  const step = tabCount > 0 ? usableWidth / tabCount : 0;

  const indicatorWidth = useMemo(() => {
    // Keep the active pill from becoming comically wide on tablets.
    return Math.min(INDICATOR_MAX_WIDTH, Math.max(56, step - 8));
  }, [step]);

  const x = useSharedValue(0);

  useEffect(() => {
    const target =
      H_MARGIN +
      PADDING +
      step * state.index +
      Math.max(0, (step - indicatorWidth) / 2);
    x.value = withSpring(target, SPRING);
  }, [indicatorWidth, state.index, step, x]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: x.value }],
    };
  });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <GlassView intensity={30} tint="dark" style={styles.blur}>
        <View style={styles.border} />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            indicatorStyle,
            { width: Math.max(INDICATOR_MIN_WIDTH, indicatorWidth), height: INDICATOR_HEIGHT, borderRadius: INDICATOR_RADIUS },
          ]}
        />

        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const focused = state.index === index;
            const { options } = descriptors[route.key];

            const label =
              options.tabBarLabel ??
              options.title ??
              // expo-router route name as fallback
              route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
                void Haptics.selectionAsync();
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const icon = options.tabBarIcon?.({
              focused,
              color: focused ? BG : INACTIVE,
              size: 22,
            });

            return (
              <TabButton
                key={route.key}
                label={String(label)}
                focused={focused}
                onPress={onPress}
                onLongPress={onLongPress}
              >
                {icon}
              </TabButton>
            );
          })}
        </View>
      </GlassView>
    </View>
  );
}

function TabButton({
  focused,
  label,
  onPress,
  onLongPress,
  children,
}: {
  focused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  children: React.ReactNode;
}) {
  const focus = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    focus.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focus, focused]);

  const labelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(focus.value, [0, 1], [0.6, 1]);
    const translateY = interpolate(focus.value, [0, 1], [2, 0]);
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <View style={styles.iconWrap}>{children}</View>
      <Animated.View style={labelStyle}>
        <Text style={[styles.label, { color: focused ? BG : INACTIVE }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: H_MARGIN,
    paddingBottom: 10,
    paddingTop: 0,
  },
  blur: {
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    padding: PADDING,
    backgroundColor: Platform.OS === 'android' ? BG : 'transparent',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 18,
      },
      default: {},
    }),
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BAR_RADIUS,
    borderWidth: 1,
    borderColor: BORDER,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // paddingHorizontal: 26,
  },
  indicator: {
    position: 'absolute',
    top: (BAR_HEIGHT - INDICATOR_HEIGHT) / 2,
    left: -16,
    right: 0,
    backgroundColor: ACTIVE,
    borderRadius: INDICATOR_RADIUS,
    opacity: 0.95,
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 18,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});


