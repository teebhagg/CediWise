/**
 * SME Tab Screen
 * Shows SME Dashboard for SME users, upgrade prompt for everyone else.
 */

import SMEDashboardScreen from "@/app/(sme)/index";
import { PrimaryButton } from "@/components/PrimaryButton";
import { useTierContext } from "@/contexts/TierContext";
import { useRouter } from "expo-router";
import { Card } from "heroui-native";
import { Crown, Lock, ArrowRight } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SMETabScreen() {
  const { canAccessSME } = useTierContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (canAccessSME) {
    return <SMEDashboardScreen />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.lockCircle}>
            <Crown color="#10B981" size={36} />
          </View>
          <Text style={styles.heroTitle}>SME Ledger</Text>
          <Text style={styles.heroSubtitle}>
            Track sales, expenses, and VAT for your business. Built for Ghanaian SMEs.
          </Text>
        </View>

        {/* Features */}
        <Card style={[styles.featuresCard, { borderRadius: 35 }]}>
          {[
            { title: "Sales & Expenses Ledger", desc: "Log all business income and expenses in one place" },
            { title: "Auto 20% VAT", desc: "VAT calculated automatically under Act 1151" },
            { title: "GHS 750k Threshold Alert", desc: "Know when to register for VAT" },
            { title: "Monthly P&L Summary", desc: "Revenue, expenses, and profit at a glance" },
            { title: "CSV Export", desc: "Export for your accountant" },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Lock color="#6B7280" size={16} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Card>

        {/* CTA */}
        <PrimaryButton
          onPress={() => router.push("/upgrade")}
        >
          <Text style={styles.ctaText}>Upgrade to SME Ledger</Text>
          <ArrowRight color="#020617" size={20} />
        </PrimaryButton>

        <Text style={styles.ctaSubtext}>
          GHS 25/month • Cancel anytime
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 60,
    alignItems: "center",
  },
  hero: {
    alignItems: "center",
    marginBottom: 32,
  },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(16,185,129,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
  },
  heroTitle: {
    color: "white",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "#94A3B8",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  featuresCard: {
    backgroundColor: "rgba(18,22,33,0.9)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    width: "100%",
    gap: 16,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: "#D1D5DB",
    fontSize: 14,
    fontWeight: "600",
  },
  featureDesc: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 2,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10B981",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: "100%",
  },
  ctaText: {
    color: "#020617",
    fontSize: 16,
    fontWeight: "600",
  },
  ctaSubtext: {
    color: "#6B7280",
    fontSize: 13,
    marginTop: 12,
  },
});
