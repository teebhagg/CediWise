/**
 * Shared dialog pattern: dark card, optional icon + title in header,
 * description body, and vertically stacked full-width buttons (primary on top, secondary below).
 * Matches the phone confirmation / confirm flow design.
 */
import * as Haptics from "expo-haptics";
import { Button, Dialog, ScrollShadow } from "heroui-native";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardCenteringScrollView } from "./common/KeyboardCenteringScrollView";

import { GlassView } from "@/components/GlassView";

export type AppDialogProps = {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional icon shown to the left of the title in the header */
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  /** Primary action (top button): emerald bg, dark text */
  primaryLabel?: string;
  onPrimary?: () => void | Promise<void>;
  /** Secondary action (bottom button): dark grey bg, white text */
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose?: () => void;
  loading?: boolean;
  /** Optional extra content between description and buttons */
  children?: React.ReactNode;
  /** Override primary button container (e.g. destructive red). */
  primaryButtonClassName?: string;
  /** Override primary label text class (e.g. text-white on red). */
  primaryLabelClassName?: string;
  /** Disable the primary button. */
  primaryDisabled?: boolean;
  /** Override the glass backdrop intensity on iOS */
  backdropIntensity?: number;
  /** Custom header component to replace the default icon + title row */
  customHeader?: React.ReactNode;
  /** Optional style for the icon container */
  iconContainerStyle?: any;
};

export function AppDialog({
  visible,
  onOpenChange,
  icon,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
  loading = false,
  children,
  primaryButtonClassName = 'bg-emerald-500',
  primaryLabelClassName = 'text-slate-950',
  primaryDisabled = false,
  backdropIntensity = 7,
  customHeader,
  iconContainerStyle,
}: AppDialogProps) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) onOpenChange(false);
  };

  const handleSecondary = async () => {
    if (loading) return;
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    if (onSecondary) {
      onSecondary();
    } else if (onClose) {
      onClose();
    } else {
      onOpenChange(false);
    }
  };

  const handlePrimary = async () => {
    if (loading || primaryDisabled || !onPrimary) return;
    try {
      const ret = onPrimary();
      if (ret != null && typeof (ret as Promise<unknown>).then === "function") {
        await ret;
      }
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // ignore
      }
    } catch {
      // Caller failed
    }
  };

  const insets = useSafeAreaInsets();
  const isKeyboardVisible = keyboardHeight > 0;

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/65" />
        {Platform.OS === "ios" ? (
          <GlassView
            intensity={backdropIntensity}
            tint="dark"
            className="absolute inset-0"
            onTouchEnd={handleSecondary}
          />
        ) : null}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top + 16,
            paddingBottom: isKeyboardVisible ? 12 : insets.bottom + 16,
            paddingHorizontal: 16,
          }}
        >
          <Dialog.Content
            className="max-w-[360px] min-w-[320px] w-full rounded-2xl overflow-hidden bg-[rgba(18,22,33,0.98)] p-0"
            style={[styles.contentShadow, isKeyboardVisible && { maxHeight: '100%' }]}
          >
            {!loading && (
              <Dialog.Close
                variant="ghost"
                className="absolute top-4 right-4 w-10 h-10 rounded-full z-10 bg-slate-600/60 border border-slate-500/50"
                iconProps={{ size: 20, color: "#e2e8f0" }}
                onPress={handleSecondary}
              />
            )}
            <ScrollShadow color="#121621" LinearGradientComponent={LinearGradient}>
              <KeyboardCenteringScrollView
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={[styles.content, isKeyboardVisible && { paddingVertical: 20 }]}>
                  {/* Header */}
                  {customHeader ? (
                    <View style={styles.header}>{customHeader}</View>
                  ) : (title || icon) ? (
                    <View style={styles.header}>
                      {icon ? <View style={[styles.iconWrap, iconContainerStyle]}>{icon}</View> : null}
                      {title ? (
                        <Text numberOfLines={2} style={styles.title}>
                          {title}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {description ? (
                    <Text style={styles.description}>{description}</Text>
                  ) : null}

                  {children ? <View style={styles.extra}>{children}</View> : null}

                  {/* Actions */}
                  {loading ? (
                    <View style={styles.loaderWrap}>
                      <ActivityIndicator size="large" color="#10b981" />
                    </View>
                  ) : (primaryLabel || secondaryLabel) ? (
                    <View style={styles.actions}>
                      {primaryLabel && (
                        <Button
                          variant="primary"
                          size="md"
                          onPress={handlePrimary}
                          isDisabled={primaryDisabled || loading}
                          className={`w-full h-12 rounded-xl ${primaryButtonClassName} ${(primaryDisabled || loading) ? 'opacity-50' : ''}`}
                        >
                          <Button.Label className={`font-semibold ${primaryLabelClassName}`}>
                            {primaryLabel}
                          </Button.Label>
                        </Button>
                      )}
                      {secondaryLabel && (
                        <Button
                          variant="ghost"
                          size="md"
                          onPress={handleSecondary}
                          className="w-full h-12 rounded-xl bg-slate-600/80 border-0"
                        >
                          <Button.Label className="text-white font-semibold">
                            {secondaryLabel}
                          </Button.Label>
                        </Button>
                      )}
                    </View>
                  ) : null}
                </View>
              </KeyboardCenteringScrollView>
            </ScrollShadow>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  contentShadow: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.4,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 18 },
    }),
  },
  content: {
    padding: 24,
    paddingTop: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: {
    fontSize: 20,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
    flex: 1,
    textAlign: "left",
  },
  description: {
    fontSize: 15,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
    lineHeight: 22,
    marginBottom: 20,
    textAlign: "left",
    paddingRight: 8,
  },
  extra: {
    marginBottom: 16,
  },
  actions: {
    gap: 12,
  },
  loaderWrap: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
