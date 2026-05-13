import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
  type TextInputContentSizeChangeEvent,
} from "react-native";
import { chatTheme } from "@/constants/chatTheme";
import { useResponsive } from "@/helpers/hooks/use-responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const MAX_LINES = 5;

interface InputBarProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  initialValue?: string;
  autoFocus?: boolean;
}

export const InputBar: React.FC<InputBarProps> = ({
  onSend,
  disabled = false,
  placeholder = "Ask me anything...",
  maxLength = 2000,
  initialValue = "",
  autoFocus = false,
}: InputBarProps) => {
  const screen = useResponsive();

  const [value, setValue] = useState<string>(initialValue);
  const [inputHeight, setInputHeight] = useState<number>(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const iconSize = screen.rf(20);
  const circleSize = screen.rf(44);

  const lineHeight = screen.rf(22);
  const minHeight = lineHeight;
  const maxHeight = lineHeight * MAX_LINES;

  const handleContentSizeChange = (e: TextInputContentSizeChangeEvent) => {
    const newHeight = e.nativeEvent.contentSize.height;
    setInputHeight(Math.min(newHeight, maxHeight));
  };

  const handleOnPress = () => {
    if (disabled || !value.trim()) return;
    onSend(value);
    setValue("");
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          {
            paddingHorizontal: screen.rf(18),
            paddingTop: screen.rf(16),
            paddingBottom: screen.rf(14),
            borderRadius: screen.rf(28),
            borderColor: chatTheme.composerBorder,
            borderWidth: 1,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor="rgba(148, 163, 184, 0.75)"
          editable={!disabled}
          maxLength={maxLength}
          multiline
          scrollEnabled={inputHeight >= maxHeight}
          onContentSizeChange={handleContentSizeChange}
          style={[
            styles.input,
            {
              fontSize: screen.rf(17),
              lineHeight,
              minHeight,
              maxHeight,
            },
          ]}
          selectionColor={chatTheme.accentEmerald}
          textAlignVertical="top"
        />

        <View style={styles.bottomRow}>
          <View style={styles.rightIcons}>
              <Pressable
                onPress={handleOnPress}
                disabled={disabled || !value.trim()}
                style={{ opacity: disabled || !value.trim() ? 0.35 : 1 }}>
                <LinearGradient
                  colors={[...chatTheme.sendGradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.voiceCircle,
                    {
                      width: circleSize,
                      height: circleSize,
                      borderRadius: circleSize / 2,
                    },
                  ]}>
                  <Ionicons
                    name="arrow-up"
                    size={iconSize}
                    color={chatTheme.primaryForeground}
                  />
                </LinearGradient>
              </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
  },

  container: {
    backgroundColor: chatTheme.composerBg,
    flexDirection: "column",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 30,
      },
      android: { elevation: 10, borderRadius: 30 },
    }),
  },

  input: {
    color: "#FFFFFF",
    width: "100%",
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    marginTop: 12,
  },

  leftIcons: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },

  rightIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  voiceCircle: {
    justifyContent: "center",
    alignItems: "center",
  },
});
