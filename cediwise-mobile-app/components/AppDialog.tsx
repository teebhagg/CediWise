/**
 * Shared dialog pattern: dark card, optional icon + title in header,
 * description body, and vertically stacked full-width buttons (primary on top, secondary below).
 * Matches the phone confirmation / confirm flow design.
 */
import * as Haptics from "expo-haptics";
import { Button, Dialog, ScrollShadow } from "heroui-native";
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassView } from "@/components/GlassView";

export type AppDialogProps = {
  visible: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional icon shown to the left of the title in the header */
  icon?: React.ReactNode;
  title: string;
  description: string;
  /** Primary action (top button): emerald bg, dark text */
  primaryLabel: string;
  onPrimary: () => void;
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
}: AppDialogProps) {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
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
    if (loading) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
    onPrimary();
  };

  const insets = useSafeAreaInsets();

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/65" />
        {Platform.OS === "ios" && (
          <GlassView
            intensity={7}
            tint="dark"
            className="absolute inset-0"
            onTouchEnd={handleSecondary}
          />
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ 
            flex: 1, 
            justifyContent: isKeyboardVisible ? 'flex-end' : 'center', 
            alignItems: 'center',
            paddingTop: insets.top + 16,
            paddingBottom: isKeyboardVisible ? 12 : insets.bottom + 16,
            paddingHorizontal: 16
          }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <Dialog.Content
            className="max-w-[360px] w-full rounded-2xl overflow-hidden bg-[rgba(18,22,33,0.98)] p-0"
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
              <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                <View style={[styles.content, isKeyboardVisible && { paddingVertical: 20 }]}>
                  {/* Header: icon + title */}
                  <View style={styles.header}>
                    {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
                    <Text numberOfLines={2} style={styles.title}>
                      {title}
                    </Text>
                  </View>

                  <Text style={styles.description}>{description}</Text>

                  {children ? <View style={styles.extra}>{children}</View> : null}

                  {/* Actions: vertical stack, primary on top, secondary below */}
                  {loading ? (
                    <View style={styles.loaderWrap}>
                      <ActivityIndicator size="large" color="#10b981" />
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <Button
                        variant="primary"
                        size="md"
                        onPress={handlePrimary}
                        className={`w-full h-12 rounded-xl ${primaryButtonClassName}`}
                      >
                        <Button.Label className={`font-semibold ${primaryLabelClassName}`}>
                          {primaryLabel}
                        </Button.Label>
                      </Button>
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
                  )}
                </View>
              </ScrollView>
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
