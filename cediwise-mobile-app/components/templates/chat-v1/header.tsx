import { chatTheme } from "@/constants/chatTheme";
import { View, Text, Pressable, StyleSheet } from "react-native";
import React from "react";
import { useFonts } from "expo-font";
import { MaterialIcons, FontAwesome, AntDesign } from "@expo/vector-icons";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ChatHeaderProps = {
  title?: string;
  subtitle?: string;
  /** Sheet: close control; calls on press. */
  onClosePress?: () => void;
  /** `full` = demo template (ChadGPT). `sheet` = bottom sheet row. */
  mode?: "full" | "sheet";
  backgroundColor?: string;
  renderActions?: () => React.ReactNode;
  /** Full mode only: menu control (left). Omit to treat icon as decorative. */
  onMenuPress?: () => void;
  /** Full mode only: edit control (right). Omit to treat icon as decorative. */
  onEditPress?: () => void;
  /** Full mode only: overflow control (right). Omit to treat icon as decorative. */
  onMorePress?: () => void;
};

export function ChatHeader({
  title = "ChadGPT",
  subtitle,
  onClosePress,
  mode = "full",
  backgroundColor = "#000",
  renderActions,
  onMenuPress,
  onEditPress,
  onMorePress,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();
  const [fontLoaded] = useFonts({
    "Figtree-Bold": require("@/assets/fonts/Figtree-Bold.ttf"),
  });

  if (mode === "sheet") {
    return (
      <View
        style={[
          styles.sheetRow,
          {
            backgroundColor,
            paddingTop: Math.max(insets.top, 8),
          },
        ]}>
        <View style={styles.sheetTitleBlock}>
          <Text
            style={[
              styles.sheetTitle,
              { fontFamily: fontLoaded ? "Figtree-Bold" : undefined },
            ]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.sheetSubtitle}>{subtitle}</Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {renderActions?.()}
          {onClosePress ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close assistant"
              onPress={onClosePress}
              style={styles.closeBtn}>
              <X size={20} color="#e2e8f0" />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  const decorativeIconWrap = (node: React.ReactNode) => (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no">
      {node}
    </View>
  );

  const iconControl = (
    onPress: (() => void) | undefined,
    node: React.ReactNode,
    accessibilityLabel: string,
  ) =>
    onPress ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        hitSlop={8}
        style={{ padding: 4 }}>
        {node}
      </Pressable>
    ) : (
      decorativeIconWrap(node)
    );

  return (
    <View
      style={[
        styles.fullHeader,
        {
          backgroundColor,
        },
      ]}>
      <View style={styles.fullInner}>
        <View style={styles.fullLeft}>
          {iconControl(
            onMenuPress,
            <MaterialIcons name="menu" size={22} color="#fff" />,
            "Open menu",
          )}
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontFamily: fontLoaded ? "Figtree-Bold" : undefined,
            }}>
            {title}
          </Text>
        </View>

        <View style={styles.fullRight}>
          {iconControl(
            onEditPress,
            <FontAwesome name="pencil-square-o" size={20} color="#fff" />,
            "Edit",
          )}
          {iconControl(
            onMorePress,
            <AntDesign name="ellipsis" size={20} color="#fff" />,
            "More options",
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullHeader: {
    width: "100%",
    height: 100,
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
    paddingHorizontal: 16,
    paddingTop: 40,
    justifyContent: "center",
  },
  fullInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fullLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  fullRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: chatTheme.headerDivider,
  },
  sheetTitleBlock: {
    flex: 1,
    gap: 4,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  sheetSubtitle: {
    color: chatTheme.headerSubtitle,
    fontSize: 11,
    fontWeight: "500",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: chatTheme.closeBtnBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: chatTheme.closeBtnBorder,
    alignItems: "center",
    justifyContent: "center",
  },
});
