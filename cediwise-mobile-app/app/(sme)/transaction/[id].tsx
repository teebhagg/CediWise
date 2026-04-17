/**
 * SME Ledger — read-only transaction detail.
 * Edit flow lives on add-transaction so view vs change stays visually distinct.
 */

import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { StandardHeader, DEFAULT_STANDARD_HEIGHT } from "@/components/CediWiseHeader";
import { useSmeLedger } from "@/hooks/useSmeLedger";
import { PAYMENT_METHOD_LABELS } from "@/types/sme";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowDownRight, ArrowUpRight, Pencil } from "lucide-react-native";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatGHS(amount: number) {
  return `GH₵${amount.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sme = useSmeLedger();

  const tx = useMemo(
    () => sme.transactions.find((t) => t.id === id) ?? null,
    [sme.transactions, id],
  );

  const headerPad = insets.top + DEFAULT_STANDARD_HEIGHT;

  if (!id || !tx) {
    return (
      <View style={styles.root}>
        <StandardHeader title="Transaction details" leading={<BackButton />} centered />
        <View style={[styles.centered, { paddingTop: headerPad }]}>
          <Text style={styles.mutedTitle}>Not found</Text>
          <Text style={styles.mutedBody}>
            This transaction may have been removed or is still syncing.
          </Text>
        </View>
      </View>
    );
  }

  const paymentLabel =
    tx.paymentMethod != null ? PAYMENT_METHOD_LABELS[tx.paymentMethod] : "—";

  return (
    <View style={styles.root}>
      <StandardHeader title="Transaction details" leading={<BackButton />} centered />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: headerPad + 8, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.viewOnlyHint}>Read-only summary</Text>
        <Card style={styles.heroCard}>
          <View
            style={[
              styles.typeRow,
              tx.type === "income" ? styles.typeIncome : styles.typeExpense,
            ]}>
            {tx.type === "income" ? (
              <ArrowUpRight color="#10B981" size={20} />
            ) : (
              <ArrowDownRight color="#F87171" size={20} />
            )}
            <Text style={styles.typeLabel}>
              {tx.type === "income" ? "Income (sale)" : "Expense"}
            </Text>
          </View>
          <Text style={styles.amount} accessibilityRole="text">
            {tx.type === "income" ? "+" : "−"}
            {formatGHS(tx.amount)}
          </Text>
          <Text style={styles.description}>{tx.description}</Text>
        </Card>

        <View style={styles.facts}>
          <Fact label="Category" value={tx.category} />
          <Fact label="Date" value={formatDate(tx.transactionDate)} />
          <Fact label="Payment" value={paymentLabel} />
          {tx.vatApplicable ? (
            <Fact
              label="VAT"
              value={tx.vatAmount > 0 ? formatGHS(tx.vatAmount) : "Included / n/a"}
            />
          ) : null}
          {tx.notes ? <Fact label="Notes" value={tx.notes} multiline /> : null}
        </View>

        <PrimaryButton
          accessibilityLabel="Edit transaction"
          onPress={() => {
            try {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {
              /* ignore */
            }
            router.push({
              pathname: "/(sme)/add-transaction",
              params: { editId: tx.id },
            });
          }}
          style={styles.editCta}>
          <View style={styles.editRow}>
            <Pencil color="#020617" size={18} />
            <Text style={styles.editLabel}>Edit transaction</Text>
          </View>
        </PrimaryButton>
      </ScrollView>
    </View>
  );
}

function Fact({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, multiline && styles.factValueMultiline]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 20,
  },
  viewOnlyHint: {
    color: "#64748B",
    fontSize: 13,
    fontFamily: "Figtree-Medium",
  },
  heroCard: {
    padding: 22,
    borderRadius: 20,
    gap: 12,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  typeIncome: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  typeExpense: {
    backgroundColor: "rgba(248, 113, 113, 0.12)",
  },
  typeLabel: {
    color: "#E2E8F0",
    fontSize: 12,
    fontFamily: "Figtree-SemiBold",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  amount: {
    color: "#fff",
    fontSize: 32,
    fontFamily: "Figtree-Bold",
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  description: {
    color: "#94A3B8",
    fontSize: 16,
    fontFamily: "Figtree-Medium",
    lineHeight: 22,
  },
  facts: {
    gap: 0,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.15)",
  },
  factRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.12)",
    gap: 4,
  },
  factLabel: {
    color: "#64748B",
    fontSize: 11,
    fontFamily: "Figtree-Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  factValue: {
    color: "#F1F5F9",
    fontSize: 15,
    fontFamily: "Figtree-Medium",
  },
  factValueMultiline: {
    lineHeight: 22,
  },
  editCta: {
    marginTop: 4,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  editLabel: {
    color: "#020617",
    fontSize: 16,
    fontFamily: "Figtree-SemiBold",
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 8,
  },
  mutedTitle: {
    color: "#F1F5F9",
    fontSize: 18,
    fontFamily: "Figtree-SemiBold",
    textAlign: "center",
  },
  mutedBody: {
    color: "#64748B",
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
