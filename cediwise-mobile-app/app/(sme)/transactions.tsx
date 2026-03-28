/**
 * SME Ledger - Transaction List
 * Shows all transactions with filtering by type and date.
 */

import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import { useSmeLedger } from "@/hooks/useSmeLedger";
import { PAYMENT_METHOD_LABELS } from "@/types/sme";
import type { SMETransaction, TransactionType } from "@/types/sme";
import { useRouter } from "expo-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Search,
  Plus,
  X,
} from "lucide-react-native";
import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_STANDARD_HEIGHT,
  ExpandedHeader,
} from "@/components/CediWiseHeader";
import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { InputGroup } from "heroui-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FilterType = "all" | TransactionType;

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sme = useSmeLedger();

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await sme.hydrate();
    } finally {
      setRefreshing(false);
    }
  }, [sme]);

  const filteredTransactions = useMemo(() => {
    let txs = sme.transactions;

    if (filter !== "all") {
      txs = txs.filter((t) => t.type === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    return txs;
  }, [sme.transactions, filter, searchQuery]);

  const formatGHS = (amount: number) =>
    `GH₵${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderTransaction = useCallback(
    ({ item, index }: { item: SMETransaction; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(sme)/add-transaction",
              params: { editId: item.id },
            })
          }
        >
          <Card style={styles.txCard} className="mb-2 flex-row items-center gap-3">
            <View
              className={`w-11 h-11 rounded-2xl items-center justify-center ${
                item.type === "income"
                  ? "bg-emerald-500/10"
                  : "bg-rose-500/10"
              }`}
            >
              {item.type === "income" ? (
                <ArrowUpRight color="#10B981" size={20} />
              ) : (
                <ArrowDownRight color="#EF4444" size={20} />
              )}
            </View>

            <View className="flex-1">
              <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                {item.description}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Text className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">{item.category}</Text>
                <Text className="text-slate-700 text-[11px]">•</Text>
                <Text className="text-slate-500 text-[11px] font-medium">{formatDate(item.transactionDate)}</Text>
              </View>
            </View>

            <View className="items-end">
              <Text
                className={`font-bold text-base ${
                  item.type === "income" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {item.type === "income" ? "+" : "-"}
                {formatGHS(item.amount)}
              </Text>
              {item.vatApplicable && item.vatAmount > 0 && (
                <Text className="text-amber-500/80 text-[10px] font-bold mt-0.5 uppercase tracking-tighter">
                  VAT: {formatGHS(item.vatAmount)}
                </Text>
              )}
            </View>
          </Card>
        </Pressable>
      </Animated.View>
    ),
    [formatGHS, router]
  );

  return (
    <View style={styles.container}>
      <ExpandedHeader
        scrollY={scrollY}
        title="Transactions"
        subtitle="Manage your business cash flow"
        leading={<BackButton />}
        bottom={
          <View className="gap-3">
            <View className="px-4">
              <InputGroup className="bg-slate-900/40 border-slate-700 h-[48px] rounded-[14px]">
                <InputGroup.Prefix className="pl-3">
                  <Search color="#64748b" size={18} />
                </InputGroup.Prefix>
                <InputGroup.Input
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search transactions..."
                  placeholderTextColor="rgba(148, 163, 184, 0.4)"
                  className="flex-1 text-white text-sm"
                  style={{ fontSize: 14, lineHeight: 18 }}
                  // @ts-ignore - disabling focus ring for glassmorphic look
                  showSoftInputOnFocus={true}
                />
                {searchQuery.length > 0 && (
                  <InputGroup.Suffix className="pr-3">
                    <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
                      <X color="#64748b" size={16} />
                    </Pressable>
                  </InputGroup.Suffix>
                )}
              </InputGroup>
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
            >
              {(["all", "income", "expense"] as FilterType[]).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  className={`px-6 py-2 rounded-full border ${
                    filter === f
                      ? "bg-emerald-500/20 border-emerald-500/50"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-widest ${
                      filter === f ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {f === "all" ? "All" : f === "income" ? "Sales" : "Expenses"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        }
        bottomHeight={116}
      />

      <Animated.FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: DEFAULT_EXPANDED_HEIGHT + insets.top + 116 + 16,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        ListEmptyComponent={
          <View className="items-center justify-center pt-20 gap-4">
            <View className="w-20 h-20 rounded-full bg-white/5 items-center justify-center">
              <Calendar color="#334155" size={40} />
            </View>
            <View className="items-center">
              <Text className="text-slate-400 font-bold text-lg">No transactions found</Text>
              <Text className="text-slate-600 text-sm text-center px-10 mt-1">
                Try adjusting your filters or add your first business transaction.
              </Text>
            </View>
          </View>
        }
      />

      <View style={{ position: 'absolute', bottom: insets.bottom + 20, right: 20 }}>
        <Pressable
           style={[styles.fab]}
           onPress={() => router.push("/(sme)/add-transaction")}
        >
          <Plus color="white" size={28} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  txCard: {
    padding: 16,
    borderRadius: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
