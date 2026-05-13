import { EmptyChipGrid } from "./empty-chat-options";
import { ChatHeader } from "./header";
import { InputBar } from "./input-bar";
import type { IChipOption } from "./types";
import { useResponsive } from "@/helpers/hooks/use-responsive";
import type { AIChatStructuredMessage } from "@/types/ai";
import { chatTheme } from "@/constants/chatTheme";
import { Image } from "expo-image";
import Markdown from "@ronradtke/react-native-markdown-display";
import { LinearGradient } from "expo-linear-gradient";
import { useFonts } from "expo-font";
import type { ReactElement } from "react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GiftedChat, type IMessage } from "react-native-gifted-chat";
import { Ionicons } from "@expo/vector-icons";
const FAB_AVATAR = require("@/assets/images/my-notion-face-transparent.png");

export const CHAT_V1_LAYOUT_ANIMATION = {
  duration: 900,
  create: {
    type: LayoutAnimation.Types.easeOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

export type BudgetGiftedMessage = IMessage & {
  structured?: AIChatStructuredMessage | null;
};

export type BudgetChatV1Props = {
  messages: BudgetGiftedMessage[];
  giftedUser: IMessage["user"];
  /** Header + list top offset (safe area / sheet chrome). */
  topChromeHeight: number;
  chipOptions: IChipOption[];
  welcomeTitle: string;
  welcomeSubtitle: string;
  onSendPlain: (text: string) => void;
  /** Shown above the expanding composer (e.g. horizontal quick prompts). */
  renderAboveComposer?: React.ReactNode;
  limitBanner?: string | null;
  /** Empty-state spinner under welcome subtitle (e.g. loading persisted chat history). */
  welcomeLoading?: boolean;
  composerDisabled?: boolean;
  composerPlaceholder?: string;
  initialDraft?: string;
  headerTitle: string;
  headerSubtitle?: string;
  onClose: () => void;
  renderHeaderActions?: () => React.ReactNode;
  onRegenerate?: () => void;
  /** GiftedChat list background */
  surfaceColor?: string;
  renderBubble: (props: {
    currentMessage?: BudgetGiftedMessage;
    [key: string]: unknown;
  }) => ReactElement;
};

export function BudgetChatV1({
  messages,
  giftedUser,
  topChromeHeight,
  chipOptions,
  welcomeTitle,
  welcomeSubtitle,
  onSendPlain,
  renderAboveComposer,
  limitBanner,
  welcomeLoading,
  composerDisabled,
  composerPlaceholder = "Ask about your budget…",
  initialDraft,
  headerTitle,
  headerSubtitle,
  onClose,
  renderHeaderActions,
  onRegenerate,
  surfaceColor = "#020617",
  renderBubble,
}: BudgetChatV1Props) {
  const screen = useResponsive();

  const [fontLoaded] = useFonts({
    "Figtree-Medium": require("@/assets/fonts/Figtree-Medium.ttf"),
    "Figtree-Regular": require("@/assets/fonts/Figtree-Regular.ttf"),
  });

  const appendUserMessage = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t || composerDisabled) return;
      LayoutAnimation.configureNext(CHAT_V1_LAYOUT_ANIMATION);
      onSendPlain(t);
    },
    [composerDisabled, onSendPlain],
  );

  // Get display width
  const { width } = useResponsive();

  const chatRef = useRef<FlatList>(null);
  const flatListRef = useRef<FlatList>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const offsetY = useRef(0);
  const layoutHeight = useRef(0);

  const isUserMsg = (uid: unknown) => String(uid) === String(giftedUser._id);

  const renderChatEmpty = useCallback(
    () => (
      <View style={{ flex: 1, transform: [{ scaleY: -1 }] }}>
        <View
          style={{
            justifyContent: "center",
            alignItems: "center",
            height: screen.rv({
              compact: screen.height - topChromeHeight - 250,
              nano: screen.height - topChromeHeight - 250,
              medium: screen.height - topChromeHeight - 250,
              expanded: screen.height * 0.2,
            }),
          }}>
          <View style={{ alignItems: "center", gap: 12 }}>
            <LinearGradient
              colors={[...chatTheme.welcomeRing]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.welcomeIconRing}>
              <LinearGradient
                colors={[...chatTheme.welcomeInner]}
                style={[
                  styles.welcomeIconInner,
                  {
                    width: screen.rf(64),
                    height: screen.rf(64),
                    borderRadius: screen.rf(32),
                  },
                ]}>
                <Image
                  source={FAB_AVATAR}
                  style={{ width: screen.rf(48), height: screen.rf(48) }}
                  contentFit="contain"
                  transition={0}
                  cachePolicy="memory"
                />
              </LinearGradient>
            </LinearGradient>
            <Text
              style={{
                fontSize: screen.rf(28),
                color: "#f8fafc",
                fontFamily: fontLoaded ? "Figtree-Medium" : undefined,
                textAlign: "center",
                letterSpacing: -0.5,
              }}>
              {welcomeTitle}
            </Text>
            <Text
              style={{
                fontSize: screen.rf(16),
                color: "#94a3b8",
                fontFamily: fontLoaded ? "Figtree-Regular" : undefined,
                textAlign: "center",
                paddingHorizontal: 28,
                lineHeight: screen.rf(24),
              }}>
              {welcomeSubtitle}
            </Text>
            {welcomeLoading && (
              <View style={{ marginTop: 16 }}>
                <ActivityIndicator
                  size="small"
                  color={chatTheme.accentEmerald}
                />
              </View>
            )}
          </View>
          <View
            style={{
              marginTop: screen.rf(24),
              width: "100%",
              paddingHorizontal: screen.rf(12),
            }}>
            <EmptyChipGrid
              options={chipOptions}
              columns={2}
              containerStyle={{
                paddingHorizontal: screen.rf(16),
              }}
              labelStyle={{
                fontFamily: fontLoaded ? "Figtree-Regular" : undefined,
                fontSize: screen.rv({
                  compact: 13,
                  medium: 15,
                  expanded: 16,
                  nano: 12,
                }),
              }}
            />
          </View>
        </View>
      </View>
    ),
    [
      screen,
      topChromeHeight,
      welcomeTitle,
      welcomeSubtitle,
      welcomeLoading,
      fontLoaded,
      chipOptions,
    ],
  );

  return (
    <View style={[styles.container, { backgroundColor: surfaceColor }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[...chatTheme.gradientColors]}
        locations={[...chatTheme.gradientLocations]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <ChatHeader
        mode="sheet"
        title={headerTitle}
        subtitle={headerSubtitle}
        onClosePress={onClose}
        backgroundColor={surfaceColor}
        renderActions={renderHeaderActions}
      />

      {limitBanner ? (
        <View style={styles.limitPill}>
          <Text style={styles.limitBanner}>{limitBanner}</Text>
        </View>
      ) : null}

      <GiftedChat
        ref={chatRef}
        messages={[...messages]}
        renderMessageText={(props) => {
          const msg = props.currentMessage;
          const isUser = isUserMsg(msg?.user._id);

          if (isUser) {
            return (
              <View style={styles.messageTextPad}>
                <Text
                  style={{
                    color: chatTheme.userBubbleText,
                    fontSize: 15,
                    lineHeight: 21,
                    fontFamily: fontLoaded ? "Figtree-Regular" : undefined,
                  }}>
                  {msg?.text}
                </Text>
              </View>
            );
          }

          return (
            <View style={styles.messageTextPad}>
              {!isUser && (!msg?.text || !msg.text.trim()) ? (
                <View style={{ height: 21, justifyContent: "center" }}>
                  <TypingDots />
                </View>
              ) : (
                <Markdown
                  style={{
                    body: {
                      color: chatTheme.assistantBubbleText,
                      fontSize: 15,
                      lineHeight: 22,
                      fontFamily: fontLoaded ? "Figtree-Regular" : undefined,
                    },
                    link: { color: chatTheme.accentEmerald },
                    strong: {
                      fontWeight: "bold",
                      color: chatTheme.accentEmerald,
                    },
                    heading2: {
                      fontSize: 18,
                      fontFamily: fontLoaded ? "Figtree-Medium" : undefined,
                      color: "#ffffff",
                      marginTop: 12,
                      marginBottom: 6,
                    },
                    heading3: {
                      fontSize: 16,
                      fontFamily: fontLoaded ? "Figtree-Medium" : undefined,
                      color: "#f8fafc",
                      marginTop: 10,
                      marginBottom: 4,
                    },
                    paragraph: {
                      marginVertical: 6,
                    },
                    hr: {
                      backgroundColor: chatTheme.headerDivider,
                      height: 1,
                      marginVertical: 12,
                    },
                    blockquote: {
                      borderLeftWidth: 3,
                      borderLeftColor: chatTheme.accentEmerald,
                      paddingLeft: 12,
                      opacity: 0.8,
                      marginVertical: 6,
                    },
                    bullet_list: { marginVertical: 6, width: width - 72 },
                    ordered_list: { marginVertical: 6, width: width - 72 },
                    list_item: { marginBottom: 6 },
                  }}>
                  {msg?.text || ""}
                </Markdown>
              )}
            </View>
          );
        }}
        isAvatarVisibleForEveryMessage={false}
        showAvatarForEveryMessage={false}
        isUserAvatarVisible={false}
        renderAvatar={() => null}
        renderBubble={(messageBubbleProps) =>
          renderBubble(
            messageBubbleProps as {
              currentMessage?: BudgetGiftedMessage;
              [key: string]: unknown;
            },
          )
        }
        onSend={() => {
          /* composer uses InputBar + onSendPlain */
        }}
        user={giftedUser}
        isKeyboardInternallyHandled={false}
        keyboardShouldPersistTaps="handled"
        /** `true` is required for GiftedChat's scrollToBottom and proper layout. */
        inverted={false}
        renderInputToolbar={() => (
          <View style={{ backgroundColor: "transparent" }}>
            {messages.length > 0 ? renderAboveComposer : null}
            <InputBar
              initialValue={initialDraft}
              autoFocus={!!initialDraft}
              onSend={(message) => {
                appendUserMessage(message);
              }}
              disabled={!!composerDisabled}
              placeholder={composerPlaceholder}
              maxLength={1500}
            />
          </View>
        )}
        renderChatEmpty={renderChatEmpty}
        listViewProps={{
          ref: flatListRef,
          onScroll: ({ nativeEvent }) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              nativeEvent;
            offsetY.current = contentOffset.y;
            layoutHeight.current = layoutMeasurement.height;
            const distanceFromBottom =
              contentSize.height - layoutMeasurement.height - contentOffset.y;
            setShowScrollBtn(distanceFromBottom > 120);
          },
          onLayout: ({ nativeEvent }) => {
            layoutHeight.current = nativeEvent.layout.height;
          },
          onContentSizeChange: (contentWidth, contentHeight) => {
            if (layoutHeight.current > 0) {
              const distanceFromBottom =
                contentHeight - layoutHeight.current - offsetY.current;
              setShowScrollBtn(distanceFromBottom > 120);
            }
          },
          scrollEventThrottle: 100,
          contentContainerStyle: {
            paddingTop: screen.rv({
              compact: 8,
              medium: 24,
              expanded: 32,
            }),
            paddingBottom: screen.rv({
              compact: 12,
              medium: 20,
              expanded: 24,
            }),
          },
        }}
        messagesContainerStyle={{ backgroundColor: "transparent" }}
      />
      {showScrollBtn && (
        <TouchableOpacity
          onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
          style={{
            position: "absolute",
            bottom: 180,
            left: width / 2 - 20,
            zIndex: 9999,
            backgroundColor: chatTheme.cardGlass,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: chatTheme.border,
            borderRadius: 20,
            width: 40,
            height: 40,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 10,
          }}>
          <Ionicons name="chevron-down" size={20} color="#f8fafc" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  messageTextPad: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  welcomeIconRing: {
    padding: 2,
    borderRadius: 999,
  },
  welcomeIconInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  limitPill: {
    marginHorizontal: 16,
    marginTop: 4,
    alignSelf: "stretch",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(250, 204, 21, 0.1)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(250, 204, 21, 0.35)",
  },
  limitBanner: {
    color: "#fde68a",
    fontSize: 12,
    lineHeight: 17,
  },
});

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.stagger(150, [
            Animated.timing(dot1, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          Animated.stagger(150, [
            Animated.timing(dot1, {
              toValue: 0.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dot2, {
              toValue: 0.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(dot3, {
              toValue: 0.3,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    };
    animate();
  }, [dot1, dot2, dot3]);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingVertical: 4,
      }}>
      <Animated.View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: chatTheme.accentEmerald,
          opacity: dot1,
        }}
      />
      <Animated.View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: chatTheme.accentEmerald,
          opacity: dot2,
        }}
      />
      <Animated.View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: chatTheme.accentEmerald,
          opacity: dot3,
        }}
      />
    </View>
  );
}
