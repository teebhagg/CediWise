import { Check, Pencil } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { FadeInRight, FadeOutLeft, Layout } from "react-native-reanimated";

interface SuggestionCardProps {
  title: string;
  subtitle?: string;
  amount?: string;
  bucket?: "needs" | "wants" | "savings";
  reason: string;
  accepted: boolean;
  editable?: boolean;
  error?: string;
  onToggle: () => void;
  onAmountChange?: (newAmount: number) => void;
}

const BUCKET_COLORS = {
  needs: { text: "#60A5FA", bg: "rgba(59, 130, 246, 0.14)", border: "rgba(59, 130, 246, 0.4)" },
  wants: { text: "#A78BFA", bg: "rgba(167, 139, 250, 0.14)", border: "rgba(167, 139, 250, 0.4)" },
  savings: { text: "#34D399", bg: "rgba(52, 211, 153, 0.14)", border: "rgba(52, 211, 153, 0.4)" },
};

const BUCKET_LABELS = {
  needs: "Needs",
  wants: "Wants",
  savings: "Savings",
};

function BucketTag({ bucket }: { bucket: "needs" | "wants" | "savings" }) {
  const colors = BUCKET_COLORS[bucket];
  return (
    <View style={[styles.bucketTag, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.bucketTagText, { color: colors.text }]}>{BUCKET_LABELS[bucket]}</Text>
    </View>
  );
}

export function SuggestionCard({
  title,
  subtitle,
  amount,
  bucket,
  reason,
  accepted,
  editable = false,
  error,
  onToggle,
  onAmountChange
}: SuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleEditPress = () => {
    if (!editable || !accepted) return;
    if (amount) {
      // Extract numeric value, allowing only one decimal point
      const numericOnly = amount.replace(/[^0-9.]/g, "");
      const parts = numericOnly.split(".");
      setEditValue(parts.length > 1 ? parts[0] + "." + parts.slice(1).join("") : numericOnly);
    }
    setIsEditing(true);
  };

  const handleEditSubmit = () => {
    setIsEditing(false);
    // Validate format: only digits and at most one decimal point
    if (!/^\d+(\.\d+)?$/.test(editValue)) {
      return;
    }
    const parsed = parseFloat(editValue);
    if (!isNaN(parsed) && parsed > 0 && onAmountChange) {
      onAmountChange(parsed);
    }
  };

  return (
    <Animated.View
      entering={FadeInRight.duration(400)}
      exiting={FadeOutLeft}
      layout={Layout.springify().damping(15)}
      style={[
        styles.container,
        accepted ? styles.containerActive : styles.containerDisabled,
        error ? styles.containerError : null
      ]}
    >
      <Pressable onPress={onToggle} style={styles.pressable} disabled={isEditing}>
        <View style={styles.content}>
          <View style={styles.mainInfo}>
            <View style={styles.titleRow}>
              {bucket && <BucketTag bucket={bucket} />}
              <Text style={[styles.title, !accepted && styles.textMuted]} numberOfLines={1}>{title}</Text>
            </View>

            <View style={styles.reasonRow}>
              <Text style={styles.reasonText} numberOfLines={2}>{reason}</Text>
            </View>
          </View>

          <View style={styles.rightSide}>
            {amount && (
              isEditing ? (
                <TextInput
                  ref={inputRef}
                  style={styles.amountInput}
                  value={editValue}
                  onChangeText={setEditValue}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onBlur={handleEditSubmit}
                  onSubmitEditing={handleEditSubmit}
                  selectTextOnFocus
                />
              ) : (
                <Pressable
                  onPress={handleEditPress}
                  disabled={!editable || !accepted}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 6, backgroundColor: editable && accepted ? "rgba(148, 163, 184, 0.1)" : "transparent" }}
                >
                  <Text style={[
                    styles.amount,
                    !accepted && styles.textMuted
                  ]}>
                    {amount}
                  </Text>
                  {editable && accepted && <Pencil size={12} color="#94A3B8" />}
                </Pressable>
              )
            )}
            <View style={[
              styles.checkbox,
              accepted ? styles.checkboxActive : styles.checkboxInactive
            ]}>
              {accepted && <Check size={12} color="#0F172A" strokeWidth={3} />}
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  containerActive: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  containerDisabled: {
    backgroundColor: "rgba(51, 65, 85, 0.3)",
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  containerError: {
    borderColor: "rgba(239, 68, 68, 0.5)",
    backgroundColor: "rgba(69, 10, 10, 0.2)",
  },
  pressable: {
    padding: 12,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mainInfo: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    color: "#F8FAFC",
    fontFamily: "Figtree-SemiBold",
    fontSize: 15,
  },
  bucketTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  bucketTagText: {
    fontFamily: "Figtree-SemiBold",
    fontSize: 10,
    letterSpacing: 0.2,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  reasonText: {
    color: "#94A3B8",
    fontFamily: "Figtree-Regular",
    fontSize: 12,
    opacity: 0.7,
    lineHeight: 16,
  },
  rightSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  amount: {
    color: "#F8FAFC",
    fontFamily: "Figtree-Bold",
    fontSize: 14,
  },
  amountInput: {
    color: "#F8FAFC",
    fontFamily: "Figtree-Bold",
    fontSize: 14,
    minWidth: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#34D399",
    paddingVertical: 0,
    textAlign: "right",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: "#34D399",
    borderColor: "#34D399",
  },
  checkboxInactive: {
    borderColor: "rgba(148, 163, 184, 0.3)",
    backgroundColor: "transparent",
  },
  textMuted: {
    color: "#64748B",
  },
  errorRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(239, 68, 68, 0.2)",
  },
  errorText: {
    color: "#FCA5A5",
    fontFamily: "Figtree-Medium",
    fontSize: 12,
  }
});
