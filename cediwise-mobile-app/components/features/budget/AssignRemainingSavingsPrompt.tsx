import { AppDialog } from "@/components/AppDialog";
import { formatCurrency } from "@/utils/formatCurrency";
import { PiggyBank } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

type Props = {
  visible: boolean;
  unassigned: number;
  onAssign: () => void;
  onSkip: () => void;
};

export function AssignRemainingSavingsPrompt({
  visible,
  unassigned,
  onAssign,
  onSkip,
}: Props) {
  if (unassigned <= 0) return null;

  return (
    <AppDialog
      visible={visible}
      onOpenChange={(open) => {
        if (!open) onSkip();
      }}
      icon={
        <View style={styles.iconWrap}>
          <PiggyBank color="#34D399" size={22} />
        </View>
      }
      title="Assign remaining to Savings?"
      description={`You have ₵${formatCurrency(unassigned)} not assigned yet. Add it to your Savings category for this cycle?`}
      primaryLabel={`Assign ₵${formatCurrency(unassigned)}`}
      onPrimary={onAssign}
      secondaryLabel="Not now"
      onSecondary={onSkip}
    />
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(52, 211, 153, 0.15)",
  },
});
