declare module "react-native-calendar-datepicker" {
  import type { Moment } from "moment";
  import type { StyleProp, TextStyle, ViewStyle } from "react-native";
  import type { ComponentType } from "react";

  export interface CalendarDatepickerProps {
    selected?: Moment;
    onChange?: (date: Moment) => void;
    minDate: Moment;
    maxDate: Moment;
    startStage?: "day" | "month" | "year";
    finalStage?: "day" | "month" | "year";
    slideThreshold?: number;
    showArrows?: boolean;
    style?: StyleProp<ViewStyle>;
    barView?: StyleProp<ViewStyle>;
    barText?: StyleProp<TextStyle>;
    stageView?: StyleProp<ViewStyle>;
    dayHeaderText?: StyleProp<TextStyle>;
    dayText?: StyleProp<TextStyle>;
    dayTodayText?: StyleProp<TextStyle>;
    daySelectedText?: StyleProp<TextStyle>;
    daySelectedView?: StyleProp<ViewStyle>;
    dayDisabledText?: StyleProp<TextStyle>;
    dayRowView?: StyleProp<ViewStyle>;
    dayView?: StyleProp<ViewStyle>;
    monthText?: StyleProp<TextStyle>;
    monthDisabledText?: StyleProp<TextStyle>;
    monthSelectedText?: StyleProp<TextStyle>;
    yearMinTintColor?: string;
    yearMaxTintColor?: string;
  }

  const Calendar: ComponentType<CalendarDatepickerProps>;
  export default Calendar;
}
