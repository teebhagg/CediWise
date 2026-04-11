import { Text, View } from "react-native";

import type { VaultDeposit, VaultDepositSource } from "@/types/budget";
import { formatCurrency } from "@/utils/formatCurrency";
import { sortDepositsVaultLedgerOrder } from "@/utils/vaultCalculator";

function labelForDeposit(d: VaultDeposit): string {
  if (d.source === "initial") return "Starting balance";
  if (d.note) return d.note;
  return "Cycle surplus";
}

export type VaultDepositFilter = "all" | VaultDepositSource;

export function filterAndSortVaultDeposits(
  deposits: VaultDeposit[],
  filter: VaultDepositFilter,
): VaultDeposit[] {
  const filtered =
    filter === "all" ? deposits : deposits.filter((d) => d.source === filter);
  return sortDepositsVaultLedgerOrder(filtered);
}

export function VaultDepositListItem({ item }: { item: VaultDeposit }) {
  return (
    <View className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <Text className="text-white font-medium">{labelForDeposit(item)}</Text>
      <View className="flex-row justify-between mt-1">
        <Text className="text-emerald-300 text-lg font-semibold">
          ₵{formatCurrency(item.amount)}
        </Text>
        <Text className="text-white/45 text-xs">
          {new Date(item.depositedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </View>
      <Text className="text-white/35 text-[10px] mt-1 uppercase tracking-wide">
        {item.source === "initial" ? "Initial" : "Cycle surplus"}
      </Text>
    </View>
  );
}
