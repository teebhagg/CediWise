import { AppDialog } from "@/components/AppDialog";
import type { BudgetPlanValidationResult } from "@/utils/budgetPlanValidation";
import { formatCurrency } from "@/utils/formatCurrency";
import { ShieldAlert } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  validation: BudgetPlanValidationResult | null;
  onReviewIncome: () => void;
  onReduceFixed: () => void;
  onClose: () => void;
};

export function BudgetSurvivalSheet({
  visible,
  validation,
  onReviewIncome,
  onReduceFixed,
  onClose,
}: Props) {
  if (!validation) return null;

  const l4 = validation.violations.find((v) => v.type === "L4");
  const overBy = l4?.amount ?? validation.lockedObligations - validation.takeHome;

  return (
    <AppDialog
      visible={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      icon={
        <View style={styles.iconWrap}>
          <ShieldAlert color="#F87171" size={24} />
        </View>
      }
      title="Your essentials exceed take-home"
      description="Fixed costs are higher than your take-home pay. We need to adjust before this budget can work."
      primaryLabel="Review income"
      onPrimary={onReviewIncome}
      secondaryLabel="Reduce fixed lines"
      onSecondary={onReduceFixed}
    >
      <View style={styles.stats}>
        <Text style={styles.statLine}>
          Fixed costs: ₵{formatCurrency(validation.lockedObligations)}
        </Text>
        <Text style={styles.statLine}>
          Take-home: ₵{formatCurrency(validation.takeHome)}
        </Text>
        {overBy > 0 ? (
          <Text style={styles.overLine}>
            ₵{formatCurrency(overBy)} over take-home
          </Text>
        ) : null}
      </View>
      <Text style={styles.note}>
        Lower fixed category limits, check your salary, or update recurring expenses.
        This cannot be dismissed while fixed costs exceed take-home.
      </Text>
    </AppDialog>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 113, 113, 0.15)",
  },
  stats: {
    marginBottom: 12,
    gap: 4,
  },
  statLine: { color: "#E2E8F0", fontSize: 14 },
  overLine: { color: "#F87171", fontSize: 14, fontWeight: "600", marginTop: 4 },
  note: { color: "#94A3B8", fontSize: 13, lineHeight: 18 },
});
