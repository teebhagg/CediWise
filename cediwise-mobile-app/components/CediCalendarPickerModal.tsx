import type { ReactNode } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CediCalendarPickerModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  title: string;
  subtitle?: string;
  /** Calendar or custom body */
  children: ReactNode;
  /** Replace default single Cancel row (e.g. All time + Cancel) */
  footer?: ReactNode;
};

/**
 * Shared shell for react-native-calendar-datepicker: matches Card / Expenses dark UI
 * (rounded surface, slate typography, spacing).
 */
export function CediCalendarPickerModal({
  visible,
  onRequestClose,
  title,
  subtitle,
  children,
  footer,
}: CediCalendarPickerModalProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 20);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { paddingBottom: bottomPad }]}>
        {Platform.OS === "ios" ? (
          <BlurView
            style={StyleSheet.absoluteFillObject}
            intensity={20}
            tint="dark"
          />
        ) : null}
        <Pressable
          style={[styles.backdrop, Platform.OS === "ios" ? { backgroundColor: "rgba(0,0,0,0.5)" } : { backgroundColor: "rgba(0,0,0,0.85)" }]}
          onPress={onRequestClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />
        <View style={styles.card} pointerEvents="box-none">
          <Pressable
            style={styles.closeIcon}
            onPress={onRequestClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={{ color: "#94A3B8", fontSize: 20, fontWeight: "600" }}>✕</Text>
          </Pressable>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}
          <View style={styles.body}>{children}</View>
          {footer ?? (
            <Pressable
              style={styles.footerSingle}
              onPress={onRequestClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.footerSingleText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Pass-through props for `react-native-calendar-datepicker` for visual consistency. */
export const cediCalendarPickerStyles = StyleSheet.create({
  calendarWrap: {
    alignSelf: "stretch",
    minWidth: 300,
    marginTop: 4,
    borderRadius: 90
  },
  calendarBar: {
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  calendarBarText: {
    color: "#6EE7B7",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  calendarStage: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 4,
  },
  calendarDayRow: {
    paddingVertical: 20,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(241, 245, 249, 0.15)",
  },
  calendarDayHeader: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  calendarDayText: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "500",
    paddingBottom: 30,
  },
  calendarDayToday: {
    color: "#34D399",
    fontWeight: "700",
  },
  calendarDaySelected: {
    color: "#6EE7B7",
    fontWeight: "800",
  },
  calendarDaySelectedView: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderRadius: 999,
  },
  calendarDayDisabled: {
    color: "#475569",
    fontWeight: "400",
  },
  calendarMonthText: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    paddingVertical: 14,
    borderRadius: 12,
    overflow: "hidden",
  },
  calendarMonthDisabled: {
    color: "#334155",
    fontWeight: "500",
  },
  calendarMonthSelected: {
    color: "#059669",
    fontWeight: "800",
    backgroundColor: "#6EE7B7",
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  card: {
    zIndex: 1,
    backgroundColor: "rgba(18, 22, 33, 0.98)",
    borderRadius: 28,
    paddingTop: 26,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
    position: "relative",
  },
  closeIcon: {
    position: "absolute",
    top: 16,
    right: 20,
    zIndex: 2,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.35,
    marginBottom: 6,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  body: {
    marginTop: 8,
    marginBottom: 6,
  },
  footerSingle: {
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minHeight: 48,
    justifyContent: "center",
  },
  footerSingleText: {
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "600",
  },
});
