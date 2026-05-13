import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppDialog } from "./AppDialog";

type CediCalendarPickerModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  title: string;
  subtitle?: string;
  /** Calendar or custom body */
  children: ReactNode;
  /** Primary action label (e.g. "Select") */
  primaryLabel?: string;
  /** Primary action callback */
  onPrimary?: () => void;
  /** Secondary action label (e.g. "Cancel") */
  secondaryLabel?: string;
  /** Secondary action callback */
  onSecondary?: () => void;
};

/**
 * Standardized Date Picker Modal that uses AppDialog as its shell.
 * Matches the application's premium dark UI and glassmorphism patterns.
 */
export function CediCalendarPickerModal({
  visible,
  onRequestClose,
  title,
  subtitle,
  children,
  primaryLabel = "Done",
  onPrimary,
  secondaryLabel,
  onSecondary,
}: CediCalendarPickerModalProps) {
  return (
    <AppDialog
      visible={visible}
      onOpenChange={(open) => !open && onRequestClose()}
      title={title}
      description={subtitle ?? ""}
      primaryLabel={primaryLabel}
      onPrimary={onPrimary ?? onRequestClose}
      secondaryLabel={secondaryLabel}
      onSecondary={onSecondary ?? onRequestClose}
    >
      <View style={styles.body}>{children}</View>
    </AppDialog>
  );
}

/** 
 * Legacy styles for `react-native-calendar-datepicker`.
 * Keeping these for now to avoid breaking existing manual styling in consumers,
 * though they should be phased out in favor of NativeDateSelection.
 */
export const cediCalendarPickerStyles = StyleSheet.create({
  calendarWrap: {
    alignSelf: "stretch",
    minWidth: 300,
    marginTop: 4,
    borderRadius: 16,
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
  body: {
    marginTop: 8,
    marginBottom: 6,
    alignItems: "center",
  },
});
