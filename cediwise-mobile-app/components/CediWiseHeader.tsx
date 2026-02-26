import { GlassView } from "@/components/GlassView";
import React, { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_EXPANDED_HEIGHT = 170;
export const DEFAULT_STANDARD_HEIGHT = 64;
export const DEFAULT_BOTTOM_HEIGHT = 52;

const HORIZONTAL_PADDING = 20;
const BOTTOM_PADDING = 8;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeaderProps {
  /** Primary title text */
  title: string;
  /** Component rendered on the far left (back button, menu icon, etc.) */
  leading?: ReactNode;
  /** Components rendered on the far right */
  actions?: ReactNode[];
  /** Center the title instead of left-aligning */
  centered?: boolean;
  /** Height of the compact nav-bar band (excluding safe-area inset) */
  standardHeight?: number;
  /** Component rendered below the nav bar (e.g. search input) */
  bottom?: ReactNode;
}

export interface ExpandedHeaderProps extends HeaderProps {
  /** Animated scroll-position value from the parent ScrollView / FlatList */
  scrollY: SharedValue<number>;
  /** Title shown in the compact/collapsed nav bar. Defaults to `title`. */
  collapsedTitle?: string;
  /** Optional subtitle shown only in the expanded state */
  subtitle?: string;
  /** Full height of the header when scrolled to top (excludes safe-area & bottom) */
  expandedHeight?: number;
  /** Explicit height for the `bottom` slot.  Measured or estimated by caller. */
  bottomHeight?: number;
}

// ─── Height utility ───────────────────────────────────────────────────────────

/**
 * Returns the initial `paddingTop` the scrollable body must add so its content
 * starts below the fully-expanded header.
 *
 * @example
 * const { top: insetTop } = useSafeAreaInsets();
 * const bodyPaddingTop = getExpandedHeaderHeight({ insetTop });
 */
export function getExpandedHeaderHeight({
  expandedHeight = DEFAULT_EXPANDED_HEIGHT,
  standardHeight = DEFAULT_STANDARD_HEIGHT,
  bottomHeight = 0,
  insetTop = 0,
}: {
  expandedHeight?: number;
  standardHeight?: number;
  bottomHeight?: number;
  insetTop?: number;
} = {}): number {
  void standardHeight; // kept for signature completeness
  return expandedHeight + insetTop + bottomHeight;
}

// ─── Shared nav-bar layout helper ─────────────────────────────────────────────

/**
 * When `centered` the leading slot and actions slot must have the **same**
 * reserved width so the flex-1 title is geometrically centred in the row.
 * LEADING_WIDTH is the fixed width we always allocate for the leading side.
 */
const LEADING_WIDTH = 44;

interface NavBarContentProps {
  title: string;
  leading?: ReactNode;
  actions?: ReactNode[];
  centered?: boolean;
  titleStyle?: object | object[];
  titleComponent?: "text" | "animated";
  animatedTitleStyle?: object | object[];
  isExpandedHeader?: boolean;
}

/**
 * Stateless layout helper shared by both StandardHeader and ExpandedHeader.
 * Keeps leading / title / actions in a proper flex row with no overlap.
 */
const NavBarContent: React.FC<NavBarContentProps> = ({
  title,
  leading,
  actions,
  centered = false,
  titleStyle,
  animatedTitleStyle,
  isExpandedHeader = false,
}) => {
  const hasLeading = !!leading;

  /*
   * Strategy:
   *  - Leading side: fixed LEADING_WIDTH (or 0 if absent and not centered)
   *  - Title: flex:1, minWidth:0 — always in flow, never absolute
   *  - Actions side: when centered, reserved to same width as leading side
   *    so the title is mathematically centred; otherwise wraps to content
   */
  const leadingSideWidth = hasLeading || centered ? LEADING_WIDTH : 0;

  return (
    <>
      {/* Leading */}
      <View style={[
        styles.leadingContainer,
        !isExpandedHeader && { width: leadingSideWidth },
        isExpandedHeader && { minWidth: leadingSideWidth }
      ]}>
        {leading}
      </View>

      {/* Title — flex:1 with min width when actions present so title stays readable on small screens */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.titleFlex,
          actions && actions.length > 0 && styles.titleFlexWithMin,
          centered ? styles.titleCentered : styles.titleLeft,
          animatedTitleStyle,
        ]}>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.standardTitleText, titleStyle]}>
          {title}
        </Text>
      </Animated.View>

      {/* Actions — when centered, reserve same width as leading side */}
      <View
        style={[
          styles.actionsRow,
          centered && { width: leadingSideWidth, minWidth: leadingSideWidth },
        ]}>
        {actions?.map((action, i) => (
          <View key={i} style={styles.actionItem}>
            {action}
          </View>
        ))}
      </View>
    </>
  );
};

// ─── Standard Header ──────────────────────────────────────────────────────────

export const StandardHeader: React.FC<HeaderProps> = ({
  title,
  leading,
  actions,
  centered = false,
  bottom,
  standardHeight = DEFAULT_STANDARD_HEIGHT,
}) => {
  const insets = useSafeAreaInsets();
  const bottomH = bottom ? DEFAULT_BOTTOM_HEIGHT : 0;
  const totalHeight = insets.top + standardHeight + bottomH;

  return (
    <View style={[styles.container, { height: totalHeight }]}>
      <GlassView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[styles.border, { top: totalHeight - 1 }]} />

      <View style={[styles.navBar, { top: insets.top, height: standardHeight }]}>
        <NavBarContent
          title={title}
          leading={leading}
          actions={actions}
          centered={centered}
        />
      </View>

      {bottom && (
        <View
          style={[
            styles.bottomSlot,
            { top: insets.top + standardHeight, height: bottomH },
          ]}>
          {bottom}
        </View>
      )}
    </View>
  );
};

// ─── Expanded Header ──────────────────────────────────────────────────────────

export const ExpandedHeader: React.FC<ExpandedHeaderProps> = ({
  scrollY,
  title,
  collapsedTitle,
  subtitle,
  leading,
  actions,
  bottom,
  bottomHeight: bottomHeightProp,
  centered = false,
  expandedHeight = DEFAULT_EXPANDED_HEIGHT,
  standardHeight = DEFAULT_STANDARD_HEIGHT,
}) => {
  const insets = useSafeAreaInsets();

  // Resolve heights
  const bottomH = bottom ? (bottomHeightProp ?? DEFAULT_BOTTOM_HEIGHT) : 0;
  // Distance the header travels before it is fully collapsed
  const collapseRange = expandedHeight - standardHeight;

  // Total pixel heights
  const totalExpandedH = insets.top + expandedHeight + bottomH;
  const totalStandardH = insets.top + standardHeight + bottomH;

  // ── Compact background: fades in as header collapses ──────────────────────
  const compactBgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [collapseRange * 0.7, collapseRange],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  // ── Expanded content: fades out + scales down as user scrolls ─────────────
  const expandedContentStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, collapseRange * 0.6],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [0, collapseRange],
      [1, 0.96],
      Extrapolation.CLAMP,
    );
    // Parallax: content rises slightly slower than the header itself
    const translateY = interpolate(
      scrollY.value,
      [0, collapseRange],
      [0, -collapseRange * 0.25],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ scale }, { translateY }] };
  });

  // ── Compact title: slides up + fades in ───────────────────────────────────
  const compactTitleStyle = useAnimatedStyle(() => {
    const triggerAt = collapseRange * 0.75;
    const opacity = interpolate(
      scrollY.value,
      [triggerAt, collapseRange],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [triggerAt, collapseRange],
      [10, 0],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  // ── Bottom slot: follows the collapsing header bottom edge ────────────────
  const bottomSlotStyle = useAnimatedStyle(() => {
    const top = interpolate(
      scrollY.value,
      [0, collapseRange],
      [insets.top + expandedHeight, insets.top + standardHeight],
      Extrapolation.CLAMP,
    );
    return { top };
  });

  return (
    /*
     * The container is as tall as the fully-expanded header.
     * overflow: visible so nothing is clipped during the open state.
     * The compact background sits at the very top and never grows.
     */
    <View style={[styles.container, { height: totalExpandedH }]}>

      {/* ── Compact glassmorphic band (top portion only) ─────────────────── */}
      <Animated.View
        style={[
          styles.compactBand,
          { height: totalStandardH },
          compactBgStyle,
        ]}>
        <GlassView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[styles.border, { top: totalStandardH - 1 }]} />
      </Animated.View>

      {/* ── Nav bar row (leading + animated compact title + actions) ─────── */}
      <View
        style={[
          styles.navBar,
          { top: insets.top, height: standardHeight },
        ]}>
        <NavBarContent
          title={collapsedTitle ?? title}
          leading={leading}
          actions={actions}
          centered={centered}
          animatedTitleStyle={compactTitleStyle}
          isExpandedHeader={true}
        />
      </View>

      {/* ── Expanded title + subtitle ─────────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.expandedContent,
          {
            // Sits below the nav bar, above the bottom slot
            top: insets.top + standardHeight,
            bottom: bottomH,
            paddingHorizontal: HORIZONTAL_PADDING,
          },
          expandedContentStyle,
        ]}>
        <View
          style={[
            styles.expandedInner,
            centered && styles.expandedInnerCentered,
          ]}>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[
              styles.expandedTitleText,
              centered && { textAlign: "center" },
            ]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              numberOfLines={3}
              ellipsizeMode="tail"
              style={[
                styles.subtitleText,
                centered && { textAlign: "center" },
              ]}>
              {subtitle}
            </Text>
          )}
        </View>
      </Animated.View>

      {/* ── Bottom slot (search bar, tabs, etc.) ─────────────────────────── */}
      {bottom && (
        <Animated.View
          style={[
            styles.bottomSlot,
            { height: bottomH, marginTop: -16 },
            bottomSlotStyle,
          ]}>
          {bottom}
        </Animated.View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /* Outer shell — absolute, full width, never clips */
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    // No overflow: hidden — expanded content must not be clipped
  },

  /* Compact-state blurred band */
  compactBand: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },

  /* Single-pixel separator line */
  border: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  /* Horizontal nav row */
  navBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: HORIZONTAL_PADDING,
    zIndex: 10,
  },

  /* Leading icon / back button */
  leadingContainer: {
    // width is set inline (LEADING_WIDTH or 0) via NavBarContent
    alignItems: "flex-start",
    justifyContent: "center",
    flexShrink: 0,
  },

  /* Title — always in-flow; minWidth so it stays readable on small screens (e.g. iPhone 13 mini) */
  titleFlex: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  titleFlexWithMin: {
    minWidth: 80, // reserve space so at least "Expenses" / short titles are visible
  },

  /* Left-aligned title: small gap from leading */
  titleLeft: {
    alignItems: "flex-start",
    paddingLeft: 4,
  },

  /* Centered title: text centred within the flex-1 cell */
  titleCentered: {
    alignItems: "center",
  },

  /* Actions row — can shrink on small screens so title keeps min width */
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0,
    justifyContent: "flex-end",
  },
  actionItem: {
    marginLeft: 10,
  },

  /* Compact title text */
  standardTitleText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "600",
    fontFamily: "Figtree-SemiBold",
    letterSpacing: -0.2,
  },

  /* Expanded title area — fills space between nav bar and bottom slot */
  expandedContent: {
    position: "absolute",
    left: 0,
    right: 0,
    justifyContent: "flex-end",
    paddingBottom: 16,
  },
  expandedInner: {
    width: "100%",
    alignItems: "flex-start",
  },
  expandedInnerCentered: {
    alignItems: "center",
  },
  expandedTitleText: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
    fontFamily: "Figtree-Bold",
    letterSpacing: -0.8,
  },
  subtitleText: {
    color: "#94a3b8",
    fontSize: 15,
    lineHeight: 20,
    marginTop: 6,
    fontFamily: "Figtree-Regular",
  },

  /* Bottom slot (search bar, tabs, etc.) */
  bottomSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: BOTTOM_PADDING,
    justifyContent: "center",
  },
});