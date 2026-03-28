/**
 * FeatureLockSheet
 * Bottom sheet shown when a free user taps a locked feature.
 * Matches existing CustomBottomSheet pattern.
 */

import { CustomBottomSheet } from "@/components/common/CustomBottomSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Lock, Sparkles, Zap, Crown } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

type FeatureLockSheetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  featureDescription: string;
  tierRequired: "budget" | "sme";
  highlights?: string[];
};

const TIER_CONFIG = {
  budget: {
    label: "Smart Budget",
    price: "GHS 15/month",
    icon: Zap,
    color: "#10B981",
  },
  sme: {
    label: "SME Ledger",
    price: "GHS 25/month",
    icon: Crown,
    color: "#10B981",
  },
};

export function FeatureLockSheet({
  isOpen,
  onOpenChange,
  featureName,
  featureDescription,
  tierRequired,
  highlights = [],
}: FeatureLockSheetProps) {
  const router = useRouter();
  const config = TIER_CONFIG[tierRequired];
  const TierIcon = config.icon;

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onOpenChange(false);
    router.push("/upgrade");
  };

  return (
    <CustomBottomSheet
      title={featureName}
      description="Upgrade to unlock"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <View style={{ gap: 16 }}>
        {/* Lock icon + feature description */}
        <View style={{ alignItems: "center", gap: 12 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: "rgba(255,255,255,0.05)",
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.1)",
            }}
          >
            <Lock color="#6B7280" size={24} />
          </View>
          <Text
            style={{
              color: "#D1D5DB",
              fontSize: 14,
              fontFamily: "Figtree-Regular",
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {featureDescription}
          </Text>
        </View>

        {/* Highlights */}
        {highlights.length > 0 && (
          <View style={{ gap: 10, paddingLeft: 4 }}>
            {highlights.map((item, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Sparkles color="#F59E0B" size={16} />
                <Text
                  style={{
                    color: "#D1D5DB",
                    fontSize: 13,
                    fontFamily: "Figtree-Medium",
                    flex: 1,
                  }}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Tier required */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 12,
            borderRadius: 12,
            backgroundColor: "rgba(16,185,129,0.08)",
            borderWidth: 1,
            borderColor: "rgba(16,185,129,0.15)",
          }}
        >
          <TierIcon color={config.color} size={20} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: "#10B981",
                fontSize: 14,
                fontFamily: "Figtree-SemiBold",
              }}
            >
              {config.label}
            </Text>
            <Text
              style={{
                color: "#6B7280",
                fontSize: 12,
                fontFamily: "Figtree-Regular",
              }}
            >
              {config.price}
            </Text>
          </View>
        </View>

        {/* Upgrade button */}
        <PrimaryButton onPress={handleUpgrade}>
          <Text
            style={{
              color: "#020617",
              fontSize: 15,
              fontFamily: "Figtree-SemiBold",
            }}
          >
            Unlock with {config.label}
          </Text>
        </PrimaryButton>
      </View>
    </CustomBottomSheet>
  );
}
