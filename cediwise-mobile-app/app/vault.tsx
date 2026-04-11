import { FlashList } from "@shopify/flash-list";
import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { Landmark, Plus } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog } from "@/components/AppDialog";
import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import { StandardHeader } from "@/components/CediWiseHeader";
import {
  filterAndSortVaultDeposits,
  VaultDepositListItem,
  type VaultDepositFilter,
} from "@/components/features/vault/VaultDepositHistory";
import {
  InitialBalanceInput,
  type InitialBalanceInputRef,
} from "@/components/features/vault/InitialBalanceInput";
import { VaultSparkline } from "@/components/features/vault/VaultSparkline";
import { useAuth } from "@/hooks/useAuth";
import { useVaultStore } from "@/stores/vaultStore";
import type { VaultDeposit } from "@/types/budget";
import { computeVaultTotal } from "@/utils/vaultCalculator";
import { formatCurrency } from "@/utils/formatCurrency";

const FILTERS: { key: VaultDepositFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "cycle_rollover", label: "Surpluses" },
  { key: "initial", label: "Initial" },
];

const headerActionStyles = StyleSheet.create({
  actionTrigger: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const deposits = useVaultStore((s) => s.deposits);
  const summary = useVaultStore((s) => s.summary);
  const refreshFromRemote = useVaultStore((s) => s.refreshFromRemote);
  const setInitialBalance = useVaultStore((s) => s.setInitialBalance);
  const startingBalanceRef = useRef<InitialBalanceInputRef>(null);

  const [filter, setFilter] = useState<VaultDepositFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [startingBalanceOpen, setStartingBalanceOpen] = useState(false);
  const [startingBalanceSubmitting, setStartingBalanceSubmitting] = useState(false);

  const sparkPoints = useMemo(
    () => summary?.sparklinePoints ?? computeVaultTotal(deposits).sparklinePoints,
    [summary, deposits],
  );

  const listData = useMemo(
    () => filterAndSortVaultDeposits(deposits, filter),
    [deposits, filter],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFromRemote();
    } finally {
      setRefreshing(false);
    }
  }, [refreshFromRemote]);

  const total = summary?.totalBalance ?? 0;
  const initialBal = summary?.initialBalance ?? 0;
  const HEADER_HEIGHT = 100;

  const closeStartingBalanceDialog = useCallback(() => {
    setStartingBalanceOpen(false);
  }, []);

  const handleStartingBalanceOpenChange = useCallback((open: boolean) => {
    if (!open) setStartingBalanceOpen(false);
  }, []);

  const openStartingBalanceDialog = useCallback(() => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* ignore */
    }
    setStartingBalanceOpen(true);
  }, []);

  const saveStartingBalance = useCallback(
    async (amount: number) => {
      await setInitialBalance(amount);
    },
    [setInitialBalance],
  );

  const onStartingBalancePrimary = useCallback(async () => {
    setStartingBalanceSubmitting(true);
    try {
      await startingBalanceRef.current?.submit();
    } finally {
      setStartingBalanceSubmitting(false);
    }
  }, []);

  const listHeader = useMemo(
    () => (
      <View className="pb-4">
        <Card className="border border-emerald-500/20">
          <Text className="text-white/60 text-xs uppercase tracking-wider mb-1">
            Total in vault
          </Text>
          <Text className="text-white text-4xl font-bold">₵{formatCurrency(total)}</Text>
          <View className="items-center mt-4">
            <VaultSparkline points={sparkPoints} width={320} height={120} />
          </View>
        </Card>

        <Text className="text-white font-semibold mb-2 mt-4">History</Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-full border ${filter === f.key
                ? "bg-emerald-500/25 border-emerald-500/50"
                : "bg-white/5 border-white/10"
                }`}>
              <Text
                className={
                  filter === f.key ? "text-emerald-200 text-sm" : "text-white/70 text-sm"
                }>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    ),
    [filter, sparkPoints, total],
  );

  const listEmpty = useCallback(
    () => (
      <View className="py-8 px-2">
        <Text className="text-white/50 text-center text-sm">
          No deposits to show for this filter.
        </Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: VaultDeposit }) => <VaultDepositListItem item={item} />,
    [],
  );

  const itemSeparator = useCallback(() => <View style={{ height: 10 }} />, []);

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />
      <StandardHeader
        title="Savings Vault"
        leading={<BackButton />}
        centered
        actions={[
          <Pressable
            key="vault-starting-balance"
            onPress={openStartingBalanceDialog}
            style={headerActionStyles.actionTrigger}
            className="rounded-full bg-emerald-500"
            accessibilityLabel="Set or edit starting balance"
            accessibilityRole="button">
            <Plus size={22} color="#020617" />
          </Pressable>,
        ]}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
        <FlashList
          style={{ flex: 1 }}
          data={listData}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ItemSeparatorComponent={itemSeparator}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#22C55E"
              colors={["#22C55E"]}
            />
          }
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: insets.top + HEADER_HEIGHT,
            paddingBottom: insets.bottom + 32,
          }}
          showsVerticalScrollIndicator={false}
        />
      </KeyboardAvoidingView>

      <AppDialog
        visible={startingBalanceOpen}
        onOpenChange={handleStartingBalanceOpenChange}
        icon={
          <View className="w-10 h-10 rounded-full bg-emerald-500/20 items-center justify-center border border-emerald-500/35">
            <Landmark size={22} color="rgba(52, 211, 153, 0.95)" />
          </View>
        }
        title="Starting balance"
        description="How much have you already saved? (Bank, Momo, Susu, cash — your best estimate.) This is only used inside CediWise; it does not connect to your accounts. You can update this anytime."
        primaryLabel="Save starting balance"
        onPrimary={onStartingBalancePrimary}
        secondaryLabel="Cancel"
        onSecondary={closeStartingBalanceDialog}
        loading={startingBalanceSubmitting}
        onClose={closeStartingBalanceDialog}>
        <InitialBalanceInput
          ref={startingBalanceRef}
          variant="appDialog"
          submitLocked={startingBalanceSubmitting}
          initialValue={initialBal}
          onSave={saveStartingBalance}
          onSaved={closeStartingBalanceDialog}
          disabled={!user?.id}
        />
      </AppDialog>
    </View>
  );
}
