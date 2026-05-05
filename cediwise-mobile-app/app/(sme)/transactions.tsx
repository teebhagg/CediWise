/**
 * SME Ledger - Transaction List
 * Filtering, date range, CSV export.
 */

import { BackButton } from "@/components/BackButton";
import { Card } from "@/components/Card";
import {
  CediCalendarPickerModal,
  cediCalendarPickerStyles,
} from "@/components/CediCalendarPickerModal";
import {
  DEFAULT_EXPANDED_HEIGHT,
  ExpandedHeader,
  getExpandedHeaderHeight,
} from "@/components/CediWiseHeader";
import { PULL_REFRESH_EMERALD } from "@/constants/pullToRefresh";
import {
  type DatePreset,
  SME_TRANSACTION_SORT_DEFAULT,
  type SMETransactionSortId,
  useSMETransactionFilters
} from "@/hooks/useSMETransactionFilters";
import { useSmeLedger } from "@/hooks/useSmeLedger";
import { useSMELedgerStore } from "@/stores/smeLedgerStore";
import type { PaymentMethod, SMETransaction } from "@/types/sme";
import { PAYMENT_METHOD_LABELS } from "@/types/sme";
import { exportSMETransactionsCSV } from "@/utils/smeExport";
import { waitWhile } from "@/utils/waitWhile";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { InputGroup } from "heroui-native";
import {
  ArrowDownRight,
  ArrowDownWideNarrow,
  ArrowUpRight,
  ArrowUpWideNarrow,
  Banknote,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  Calendar as CalendarIcon,
  CalendarRange,
  Check,
  ChevronLeft,
  CreditCard,
  FileText,
  LayoutGrid,
  ListFilter,
  PencilLine,
  Plus,
  Search,
  Share2,
  Smartphone,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react-native";
import moment, { type Moment } from "moment";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Calendar from "react-native-calendar-datepicker";
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * ExpandedHeader bottom slot: search + active filter pills row.
 */
const SME_TX_FILTERS_SEARCH_H = 48;
const SME_TX_FILTERS_GAP = 12;
const SME_TX_FILTERS_PILLS_ROW_H = 40;
const SME_TX_FILTERS_BOTTOM_BUFFER = 10;

const SME_TX_HEADER_BOTTOM_HEIGHT =
  SME_TX_FILTERS_SEARCH_H +
  SME_TX_FILTERS_GAP +
  SME_TX_FILTERS_PILLS_ROW_H +
  SME_TX_FILTERS_BOTTOM_BUFFER;

const ICON_MUTED = "#64748B";
const ICON_ACTIVE = "#6EE7B7";

/** Lucide icon component (shared props: size, color, strokeWidth). */
type TxIcon = typeof LayoutGrid;

const PAYMENT_METHOD_ORDER: PaymentMethod[] = [
  "cash",
  "momo",
  "bank",
  "card",
  "cheque",
  "other",
];

const PAYMENT_METHOD_ICONS: Record<PaymentMethod, TxIcon> = {
  cash: Banknote,
  momo: Smartphone,
  bank: Building2,
  card: CreditCard,
  cheque: FileText,
  other: Wallet,
};

const SME_SORT_OPTIONS: {
  id: SMETransactionSortId;
  label: string;
  Icon: TxIcon;
}[] = [
    { id: "date_desc", label: "Newest first", Icon: ArrowDownWideNarrow },
    { id: "date_asc", label: "Oldest first", Icon: ArrowUpWideNarrow },
    { id: "amount_desc", label: "Highest amount", Icon: TrendingDown },
    { id: "amount_asc", label: "Lowest amount", Icon: TrendingUp },
  ];

function sortPillLabel(id: SMETransactionSortId): string {
  return SME_SORT_OPTIONS.find((o) => o.id === id)?.label ?? "Sort";
}

const DATE_PRESET_META: {
  key: DatePreset | "custom";
  label: string;
  Icon: TxIcon;
}[] = [
    { key: "all", label: "Any time", Icon: CalendarIcon },
    { key: "today", label: "Today", Icon: CalendarCheck2 },
    { key: "week", label: "This week", Icon: CalendarRange },
    { key: "month", label: "Month (so far)", Icon: CalendarDays },
    { key: "last_month", label: "Last month", Icon: CalendarClock },
    { key: "custom", label: "Custom range…", Icon: PencilLine },
  ];

type HeaderPill = {
  key: string;
  kind: "sort" | "type" | "date" | "category" | "payment";
  label: string;
  onRemove: () => void;
  filterType?: "income" | "expense";
  paymentMethod?: PaymentMethod;
};

function TxFilterPillGlyph({
  pill,
  sortBy,
}: {
  pill: HeaderPill;
  sortBy: SMETransactionSortId;
}) {
  const size = 17;
  switch (pill.kind) {
    case "sort": {
      const I =
        SME_SORT_OPTIONS.find((o) => o.id === sortBy)?.Icon ?? ListFilter;
      return <I size={size} color={ICON_ACTIVE} strokeWidth={2.2} />;
    }
    case "type":
      return pill.filterType === "income" ? (
        <ArrowUpRight size={size} color="#34D399" strokeWidth={2.2} />
      ) : (
        <ArrowDownRight size={size} color="#FB7185" strokeWidth={2.2} />
      );
    case "date":
      return <CalendarIcon size={size} color={ICON_ACTIVE} strokeWidth={2.2} />;
    case "category":
      return <Tag size={size} color={ICON_ACTIVE} strokeWidth={2.2} />;
    case "payment": {
      const I = pill.paymentMethod
        ? PAYMENT_METHOD_ICONS[pill.paymentMethod]
        : Wallet;
      return <I size={size} color={ICON_ACTIVE} strokeWidth={2.2} />;
    }
  }
}

function dateChipLabel(
  preset: DatePreset,
  dateFrom: string | null,
  dateTo: string | null
): string {
  switch (preset) {
    case "all":
      return "Any time";
    case "today":
      return "Today";
    case "week":
      return "This week";
    case "month":
      return "Month (so far)";
    case "last_month":
      return "Last month";
    case "custom":
      if (dateFrom && dateTo) {
        const a = moment(dateFrom, "YYYY-MM-DD").format("D MMM");
        const b = moment(dateTo, "YYYY-MM-DD").format("D MMM yy");
        return `${a} – ${b}`;
      }
      return "Custom";
    default:
      return "Date";
  }
}

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sme = useSmeLedger();
  const { transactions, categories, profile, hydrate } = sme;

  const filters = useSMETransactionFilters(transactions, categories);
  const filteredTransactions = filters.filteredTransactions;

  const headerBottomHeight = SME_TX_HEADER_BOTTOM_HEIGHT;

  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [dateModalStep, setDateModalStep] = useState<
    "presets" | "from" | "to"
  >("presets");
  const [draftRangeDate, setDraftRangeDate] = useState<string | null>(null);
  const [pendingRangeFrom, setPendingRangeFrom] = useState<string | null>(null);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const listPaddingTop = useMemo(
    () =>
      getExpandedHeaderHeight({
        expandedHeight: DEFAULT_EXPANDED_HEIGHT,
        bottomHeight: headerBottomHeight,
        insetTop: insets.top,
      }) + 16,
    [insets.top, headerBottomHeight]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const start = Date.now();
    try {
      await hydrate();
    } finally {
      await waitWhile(() => useSMELedgerStore.getState().isLoading, {
        timeoutMs: 15_000,
        intervalMs: 48,
      });
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise<void>((r) => setTimeout(r, 500 - elapsed));
      }
      setRefreshing(false);
    }
  }, [hydrate]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const calendarBoundsWide = useMemo(() => {
    const minDate = moment("1990-01-01", "YYYY-MM-DD").startOf("day");
    const maxDate = moment().endOf("day");
    return { minDate, maxDate };
  }, []);

  const selectedMomentPreset = useMemo((): Moment => {
    const raw = draftRangeDate ?? moment().format("YYYY-MM-DD");
    const m = moment(raw, "YYYY-MM-DD", true);
    return m.isValid() ? m : moment().startOf("day");
  }, [draftRangeDate]);

  const calendarBoundsToStep = useMemo(() => {
    const minDate = pendingRangeFrom
      ? moment(pendingRangeFrom, "YYYY-MM-DD").startOf("day")
      : calendarBoundsWide.minDate;
    return { minDate, maxDate: calendarBoundsWide.maxDate };
  }, [calendarBoundsWide, pendingRangeFrom]);

  const resetDateModal = useCallback(() => {
    setDateModalStep("presets");
    setDraftRangeDate(null);
    setPendingRangeFrom(null);
  }, []);

  const closeDateModal = useCallback(() => {
    setDateModalVisible(false);
    resetDateModal();
  }, [resetDateModal]);

  const handlePresetPick = useCallback(
    (p: DatePreset) => {
      if (p === "custom") {
        setDateModalStep("from");
        setDraftRangeDate(moment().format("YYYY-MM-DD"));
        setPendingRangeFrom(null);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      filters.setDatePreset(p);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      closeDateModal();
    },
    [closeDateModal, filters]
  );

  const handleCalendarDraftChange = useCallback((date: Moment) => {
    setDraftRangeDate(date.format("YYYY-MM-DD"));
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const goNextFromStep = useCallback(() => {
    const d = draftRangeDate ?? moment().format("YYYY-MM-DD");
    setPendingRangeFrom(d);
    setDateModalStep("to");
    setDraftRangeDate(
      moment(d, "YYYY-MM-DD").isAfter(moment())
        ? moment().format("YYYY-MM-DD")
        : d
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [draftRangeDate]);

  const confirmToStep = useCallback(() => {
    const end = draftRangeDate ?? moment().format("YYYY-MM-DD");
    const start = pendingRangeFrom ?? end;
    filters.applyCustomRange(start, end);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeDateModal();
  }, [draftRangeDate, pendingRangeFrom, filters, closeDateModal]);

  const backFromToStep = useCallback(() => {
    setDateModalStep("from");
    if (pendingRangeFrom) {
      setDraftRangeDate(pendingRangeFrom);
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [pendingRangeFrom]);

  const closeFilterModal = useCallback(() => {
    setFilterModalVisible(false);
  }, []);

  const openFiltersSheet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilterModalVisible(true);
  }, []);

  const handleFilterSheetDatePreset = useCallback(
    (p: DatePreset) => {
      if (p === "custom") {
        setFilterModalVisible(false);
        setTimeout(() => {
          // Allow filter modal close animation to complete before opening date modal
          resetDateModal();
          setDateModalStep("from");
          setDraftRangeDate(moment().format("YYYY-MM-DD"));
          setPendingRangeFrom(null);
          setDateModalVisible(true);
        }, 320);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return;
      }
      filters.setDatePreset(p);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [filters, resetDateModal]
  );

  const csvFilterSummaryLines = useMemo(() => {
    const typeLabel =
      filters.filterType === "all"
        ? "All"
        : filters.filterType === "income"
          ? "Income (sales)"
          : "Expenses";
    const paymentLabel = filters.selectedPaymentMethod
      ? PAYMENT_METHOD_LABELS[filters.selectedPaymentMethod]
      : "All methods";
    const searchLabel = filters.searchQuery.trim()
      ? filters.searchQuery.trim()
      : "None";
    return [
      `Transaction type: ${typeLabel}`,
      `Date range: ${dateChipLabel(filters.datePreset, filters.dateFrom, filters.dateTo)}`,
      `Category: ${filters.selectedCategory ?? "All categories"}`,
      `Payment method: ${paymentLabel}`,
      `Search text: ${searchLabel}`,
      `Sort order: ${sortPillLabel(filters.sortBy)}`,
    ];
  }, [
    filters.filterType,
    filters.datePreset,
    filters.dateFrom,
    filters.dateTo,
    filters.selectedCategory,
    filters.selectedPaymentMethod,
    filters.searchQuery,
    filters.sortBy,
  ]);

  const onExportCsv = useCallback(async () => {
    if (filteredTransactions.length === 0) return;
    const name = profile?.businessName?.trim() || "Business";
    try {
      await exportSMETransactionsCSV(
        filteredTransactions,
        name,
        csvFilterSummaryLines
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Could not prepare the CSV file. Please try again.";
      Alert.alert("Export failed", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [filteredTransactions, profile?.businessName, csvFilterSummaryLines]);

  const formatGHS = useCallback(
    (amount: number) =>
      `GH₵ ${amount.toLocaleString("en-GH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    []
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const activePills = useMemo((): HeaderPill[] => {
    const pills: HeaderPill[] = [
      {
        key: "sort",
        kind: "sort",
        label: sortPillLabel(filters.sortBy),
        onRemove: () => filters.setSortBy(SME_TRANSACTION_SORT_DEFAULT),
      },
    ];

    if (filters.filterType !== "all") {
      pills.push({
        key: "type",
        kind: "type",
        filterType: filters.filterType,
        label: filters.filterType === "income" ? "Sales" : "Expenses",
        onRemove: () => filters.setFilterType("all"),
      });
    }

    if (filters.datePreset !== "all") {
      pills.push({
        key: "date",
        kind: "date",
        label: dateChipLabel(
          filters.datePreset,
          filters.dateFrom,
          filters.dateTo
        ),
        onRemove: () => filters.setDatePreset("all"),
      });
    }

    if (filters.selectedCategory) {
      pills.push({
        key: "category",
        kind: "category",
        label: filters.selectedCategory,
        onRemove: () => filters.setSelectedCategory(null),
      });
    }

    if (filters.selectedPaymentMethod) {
      pills.push({
        key: "payment",
        kind: "payment",
        paymentMethod: filters.selectedPaymentMethod,
        label: PAYMENT_METHOD_LABELS[filters.selectedPaymentMethod],
        onRemove: () => filters.setSelectedPaymentMethod(null),
      });
    }

    return pills;
  }, [filters]);

  const renderTransaction = useCallback(
    ({ item, index }: { item: SMETransaction; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 30).duration(300)}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(sme)/transaction/[id]",
              params: { id: item.id },
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`View transaction, ${item.description}`}
        >
          <Card style={styles.txCard} className="flex-row items-center gap-3">
            <View
              className={`w-11 h-11 rounded-2xl items-center justify-center ${item.type === "income"
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
              <Text
                className="text-white font-semibold text-sm"
                numberOfLines={1}
              >
                {item.description}
              </Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <Text className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">
                  {item.category}
                </Text>
                <Text className="text-slate-700 text-[11px]">•</Text>
                <Text className="text-slate-500 text-[11px] font-medium">
                  {formatDate(item.transactionDate)}
                </Text>
              </View>
            </View>

            <View className="items-end">
              <Text
                className={`font-bold text-base ${item.type === "income" ? "text-emerald-400" : "text-rose-400"
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

  const presetChipsRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: 8,
        paddingVertical: 4,
      }}
    >
      {(
        [
          ["all", "Any time"],
          ["today", "Today"],
          ["week", "This week"],
          ["month", "Month (so far)"],
          ["last_month", "Last month"],
        ] as const
      ).map(([key, label]) => (
        <Pressable
          key={key}
          onPress={() => {
            if (key === "all") {
              filters.setDatePreset("all");
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              closeDateModal();
              return;
            }
            handlePresetPick(key);
          }}
          className="px-4 py-2 rounded-full border bg-white/5 border-white/10"
        >
          <Text className="text-xs font-semibold text-slate-300">{label}</Text>
        </Pressable>
      ))}
      <Pressable
        onPress={() => handlePresetPick("custom")}
        className="px-4 py-2 rounded-full border border-emerald-500/35 bg-emerald-500/10"
      >
        <Text className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
          Custom…
        </Text>
      </Pressable>
    </ScrollView>
  );

  const dateModalFooter =
    dateModalStep === "presets" ? null : dateModalStep === "from" ? (
      <View style={modalFooter.row}>
        <Pressable style={modalFooter.btnGhost} onPress={closeDateModal}>
          <Text style={modalFooter.btnGhostText}>Cancel</Text>
        </Pressable>
        <Pressable style={modalFooter.btnSolid} onPress={goNextFromStep}>
          <Text style={modalFooter.btnSolidText}>Next</Text>
        </Pressable>
      </View>
    ) : (
      <View style={modalFooter.row}>
        <Pressable style={modalFooter.btnGhost} onPress={backFromToStep}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ChevronLeft color="#CBD5F5" size={18} />
            <Text style={modalFooter.btnGhostText}>Back</Text>
          </View>
        </Pressable>
        <Pressable style={modalFooter.btnSolid} onPress={confirmToStep}>
          <Text style={modalFooter.btnSolidText}>Confirm</Text>
        </Pressable>
      </View>
    );

  const dateModalTitle =
    dateModalStep === "presets"
      ? "Date range"
      : dateModalStep === "from"
        ? "From date"
        : "To date";

  const dateModalSubtitle =
    dateModalStep === "presets"
      ? "Choose a preset or pick a custom range."
      : dateModalStep === "from"
        ? "Transactions on or after this day."
        : "Transactions on or before this day.";

  return (
    <View style={styles.container}>
      <ExpandedHeader
        scrollY={scrollY}
        title="Transactions"
        subtitle="Manage your business cash flow"
        leading={<BackButton />}
        actions={[
          <Pressable
            key="filters"
            accessibilityRole="button"
            accessibilityLabel="Filters and sort"
            accessibilityHint="Transaction type, date range, category, payment method, and sort order"
            hitSlop={12}
            onPress={openFiltersSheet}
          >
            <View className="w-11 h-11 items-center justify-center">
              <ListFilter
                color={
                  filters.activeFilterCount > 0 ? ICON_ACTIVE : ICON_MUTED
                }
                size={22}
              />
              {filters.activeFilterCount > 0 ? (
                <View className="absolute top-1 right-1 bg-emerald-500/25 border border-emerald-500/40 px-1 min-w-[18px] h-[18px] rounded-full items-center justify-center">
                  <Text className="text-emerald-300 text-[10px] font-bold leading-none">
                    {filters.activeFilterCount > 99
                      ? "99+"
                      : filters.activeFilterCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>,
          ...(filteredTransactions.length > 0
            ? [
              <Pressable
                key="csv"
                accessibilityRole="button"
                accessibilityLabel="Export filtered transactions as CSV"
                hitSlop={12}
                onPress={() => void onExportCsv()}
              >
                <Share2 color="#6EE7B7" size={22} />
              </Pressable>,
            ]
            : []),
        ]}
        refreshing={refreshing}
        refreshTintColor={PULL_REFRESH_EMERALD}
        bottom={
          <View className="gap-3 px-4 flex-1 justify-center">
            <InputGroup className="bg-slate-900/40 border-slate-700 h-[48px] rounded-[14px]">
              <InputGroup.Prefix className="pl-3">
                <Search color="#64748b" size={18} />
              </InputGroup.Prefix>
              <InputGroup.Input
                value={filters.searchQuery}
                onChangeText={filters.setSearchQuery}
                placeholder="Search transactions..."
                placeholderTextColor="rgba(148, 163, 184, 0.4)"
                className="flex-1 text-white text-sm"
                style={{ fontSize: 14, lineHeight: 18 }}
                // @ts-ignore
                showSoftInputOnFocus={true}
              />
              {filters.searchQuery.length > 0 && (
                <InputGroup.Suffix className="pr-3">
                  <Pressable
                    onPress={() => filters.setSearchQuery("")}
                    hitSlop={10}
                  >
                    <X color="#64748b" size={16} />
                  </Pressable>
                </InputGroup.Suffix>
              )}
            </InputGroup>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsScrollContent}
            >
              {activePills.map((pill) => {
                const showRemove =
                  pill.kind !== "sort" ||
                  filters.sortBy !== SME_TRANSACTION_SORT_DEFAULT;
                return (
                  <View
                    key={pill.key}
                    className="flex-row items-center rounded-full border border-white/12 bg-slate-900/55 max-w-[300px]"
                  >
                    <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center ml-1 my-1">
                      <TxFilterPillGlyph pill={pill} sortBy={filters.sortBy} />
                    </View>
                    <Text
                      className="text-slate-200 text-xs font-semibold px-2.5 flex-shrink"
                      numberOfLines={1}
                      style={{ maxWidth: 200 }}
                    >
                      {pill.label}
                    </Text>
                    {showRemove ? (
                      <Pressable
                        onPress={() => {
                          void Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          pill.onRemove();
                        }}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${pill.label}`}
                        className="w-10 h-10 rounded-full items-center justify-center mr-0.5 bg-white/5"
                      >
                        <X color="#94A3B8" size={15} strokeWidth={2.5} />
                      </Pressable>
                    ) : (
                      <View className="w-2" />
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        }
        bottomHeight={headerBottomHeight}
      />

      <Modal
        visible={filterModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeFilterModal}
      >
        <SafeAreaView
          style={filterSheet.safe}
          edges={["top", "left", "right"]}
        >
          <View style={filterSheet.headerRow}>
            <Text style={filterSheet.headerTitle}>Filters & sort</Text>
            <Pressable
              onPress={closeFilterModal}
              style={filterSheet.doneBtn}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={filterSheet.doneBtnText}>Done</Text>
            </Pressable>
          </View>

          <ScrollView
            style={filterSheet.scroll}
            contentContainerStyle={filterSheet.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[filterSheet.sectionLabel, { marginTop: 6 }]}>
              Sort
            </Text>
            <View style={filterSheet.pillRowWrap}>
              {SME_SORT_OPTIONS.map((opt) => {
                const on = filters.sortBy === opt.id;
                const Icon = opt.Icon;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      filters.setSortBy(opt.id);
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      );
                    }}
                    style={[
                      filterSheet.selectorPill,
                      on && filterSheet.selectorPillSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Icon
                      size={18}
                      color={on ? ICON_ACTIVE : ICON_MUTED}
                      strokeWidth={2.2}
                    />
                    <Text
                      style={[
                        filterSheet.selectorPillLabel,
                        on && filterSheet.selectorPillLabelSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {on ? (
                      <Check
                        color={ICON_ACTIVE}
                        size={17}
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Text style={filterSheet.sectionLabel}>Transaction type</Text>
            <View style={filterSheet.pillRowWrap}>
              {(
                [
                  ["all", "All", LayoutGrid] as const,
                  ["income", "Sales", ArrowUpRight] as const,
                  ["expense", "Expenses", ArrowDownRight] as const,
                ] as const
              ).map(([value, label, Icon]) => {
                const on = filters.filterType === value;
                const iconColor =
                  on && value === "income"
                    ? "#34D399"
                    : on && value === "expense"
                      ? "#FB7185"
                      : on
                        ? ICON_ACTIVE
                        : ICON_MUTED;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      filters.setFilterType(value);
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      );
                    }}
                    style={[
                      filterSheet.selectorPill,
                      on && filterSheet.selectorPillSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Icon
                      size={18}
                      color={iconColor}
                      strokeWidth={2.2}
                    />
                    <Text
                      style={[
                        filterSheet.selectorPillLabel,
                        on && filterSheet.selectorPillLabelSelected,
                      ]}
                    >
                      {label}
                    </Text>
                    {on ? (
                      <Check
                        color={ICON_ACTIVE}
                        size={17}
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Text style={filterSheet.sectionLabel}>Date range</Text>
            <View style={filterSheet.pillRowWrap}>
              {DATE_PRESET_META.map(({ key, label, Icon }) => {
                const on =
                  key === "custom"
                    ? filters.datePreset === "custom"
                    : filters.datePreset === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() =>
                      key === "custom"
                        ? handleFilterSheetDatePreset("custom")
                        : handleFilterSheetDatePreset(key)
                    }
                    style={[
                      filterSheet.selectorPill,
                      on && filterSheet.selectorPillSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Icon
                      size={18}
                      color={on ? ICON_ACTIVE : ICON_MUTED}
                      strokeWidth={2.2}
                    />
                    <Text
                      style={[
                        filterSheet.selectorPillLabel,
                        on && filterSheet.selectorPillLabelSelected,
                      ]}
                    >
                      {label}
                    </Text>
                    {on ? (
                      <Check
                        color={ICON_ACTIVE}
                        size={17}
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {filters.filterType !== "all" &&
              filters.availableCategories.length > 0 ? (
              <>
                <Text style={filterSheet.sectionLabel}>Category</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={filterSheet.chipsRow}
                >
                  {filters.availableCategories.map((cat) => {
                    const on = filters.selectedCategory === cat;
                    return (
                      <Pressable
                        key={cat}
                        onPress={() => {
                          filters.setSelectedCategory(on ? null : cat);
                          void Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                        }}
                        style={[
                          filterSheet.chip,
                          on ? filterSheet.chipOn : filterSheet.chipOff,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                      >
                        <Tag
                          size={16}
                          color={on ? ICON_ACTIVE : ICON_MUTED}
                          strokeWidth={2.2}
                        />
                        <Text
                          style={[
                            filterSheet.chipText,
                            on
                              ? filterSheet.chipTextOn
                              : filterSheet.chipTextOff,
                          ]}
                          numberOfLines={1}
                        >
                          {cat}
                        </Text>
                        {on ? (
                          <Check
                            color={ICON_ACTIVE}
                            size={16}
                            strokeWidth={2.5}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}

            <Text style={filterSheet.sectionLabel}>Payment method</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={filterSheet.chipsRow}
            >
              {PAYMENT_METHOD_ORDER.map((m) => {
                const on = filters.selectedPaymentMethod === m;
                const G = PAYMENT_METHOD_ICONS[m];
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      filters.setSelectedPaymentMethod(on ? null : m);
                      void Haptics.impactAsync(
                        Haptics.ImpactFeedbackStyle.Light
                      );
                    }}
                    style={[
                      filterSheet.chip,
                      on ? filterSheet.chipOn : filterSheet.chipOff,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <G
                      size={16}
                      color={on ? ICON_ACTIVE : ICON_MUTED}
                      strokeWidth={2.2}
                    />
                    <Text
                      style={[
                        filterSheet.chipText,
                        on
                          ? filterSheet.chipTextOn
                          : filterSheet.chipTextOff,
                      ]}
                      numberOfLines={1}
                    >
                      {PAYMENT_METHOD_LABELS[m]}
                    </Text>
                    {on ? (
                      <Check
                        color={ICON_ACTIVE}
                        size={16}
                        strokeWidth={2.5}
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={filterSheet.clearAll}
              onPress={() => {
                filters.clearAllFilters();
                void Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success
                );
              }}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters and reset sort"
            >
              <Trash2 color="#FCA5A5" size={18} strokeWidth={2.2} />
              <Text style={filterSheet.clearAllText}>Clear all</Text>
            </Pressable>
          </ScrollView>
          <SafeAreaView edges={["bottom"]} style={filterSheet.bottomSafe} />
        </SafeAreaView>
      </Modal>

      <Animated.FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === "android"}
        contentContainerStyle={{
          paddingTop: listPaddingTop,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 100,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PULL_REFRESH_EMERALD}
            colors={[PULL_REFRESH_EMERALD]}
          />
        }
        ListEmptyComponent={
          <View className="items-center justify-center pt-20 gap-4 px-4">
            <View className="w-20 h-20 rounded-full bg-white/5 items-center justify-center">
              <CalendarIcon color="#334155" size={40} />
            </View>
            <View className="items-center gap-2">
              <Text className="text-slate-400 font-bold text-lg text-center">
                No transactions found
              </Text>
              {filters.activeFilterCount > 0 ? (
                <>
                  <Text className="text-slate-500 text-sm text-center">
                    {filters.activeFilterCount} filter
                    {filters.activeFilterCount !== 1 ? "s" : ""} applied — try
                    clearing filters.
                  </Text>
                  <Pressable
                    onPress={filters.clearAllFilters}
                    className="mt-1 px-5 py-3 rounded-full bg-emerald-500/15 border border-emerald-500/40"
                  >
                    <Text className="text-emerald-400 font-bold text-sm">
                      Clear filters
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Text className="text-slate-600 text-sm text-center px-6">
                  Try adjusting your search or add your first business
                  transaction.
                </Text>
              )}
            </View>
          </View>
        }
      />

      <CediCalendarPickerModal
        visible={dateModalVisible}
        onRequestClose={closeDateModal}
        title={dateModalTitle}
        subtitle={dateModalSubtitle}
        footer={
          dateModalStep === "presets" ? (
            <Pressable style={modalFooter.singleCancel} onPress={closeDateModal}>
              <Text style={modalFooter.btnGhostText}>Cancel</Text>
            </Pressable>
          ) : (
            dateModalFooter
          )
        }
      >
        {dateModalStep === "presets" ? (
          <View>{presetChipsRow}</View>
        ) : (
          <Calendar
            selected={selectedMomentPreset}
            onChange={handleCalendarDraftChange}
            minDate={
              dateModalStep === "to"
                ? calendarBoundsToStep.minDate
                : calendarBoundsWide.minDate
            }
            maxDate={
              dateModalStep === "to"
                ? calendarBoundsToStep.maxDate
                : calendarBoundsWide.maxDate
            }
            showArrows
            style={cediCalendarPickerStyles.calendarWrap}
            barView={cediCalendarPickerStyles.calendarBar}
            barText={cediCalendarPickerStyles.calendarBarText}
            stageView={cediCalendarPickerStyles.calendarStage}
            dayHeaderText={cediCalendarPickerStyles.calendarDayHeader}
            dayRowView={cediCalendarPickerStyles.calendarDayRow}
            dayText={cediCalendarPickerStyles.calendarDayText}
            dayTodayText={cediCalendarPickerStyles.calendarDayToday}
            daySelectedText={cediCalendarPickerStyles.calendarDaySelected}
            daySelectedView={cediCalendarPickerStyles.calendarDaySelectedView}
            dayDisabledText={cediCalendarPickerStyles.calendarDayDisabled}
            monthText={cediCalendarPickerStyles.calendarMonthText}
            monthDisabledText={cediCalendarPickerStyles.calendarMonthDisabled}
            monthSelectedText={cediCalendarPickerStyles.calendarMonthSelected}
            yearMinTintColor="#34D399"
            yearMaxTintColor="#475569"
          />
        )}
      </CediCalendarPickerModal>

      <View
        style={{ position: "absolute", bottom: insets.bottom + 20, right: 20 }}
      >
        <Pressable
          style={[styles.fab]}
          onPress={() => router.push("/(sme)/batch-transaction")}
        >
          <Plus color="white" size={28} />
        </Pressable>
      </View>
    </View>
  );
}

const filterSheet = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#020617",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.22)",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F8FAFC",
    letterSpacing: -0.35,
  },
  doneBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#6EE7B7",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginTop: 22,
    marginBottom: 10,
  },
  pillRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  selectorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  selectorPillSelected: {
    borderColor: "rgba(52, 211, 153, 0.45)",
    backgroundColor: "rgba(16, 185, 129, 0.14)",
  },
  selectorPillLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#94A3B8",
    flexShrink: 1,
  },
  selectorPillLabelSelected: {
    color: "#F1F5F9",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
    paddingVertical: 4,
    marginBottom: 6,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  chipOff: {
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  chipOn: {
    borderColor: "rgba(52, 211, 153, 0.45)",
    backgroundColor: "rgba(16, 185, 129, 0.14)",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    maxWidth: 140,
  },
  chipTextOff: {
    color: "#94A3B8",
  },
  chipTextOn: {
    color: "#6EE7B7",
  },
  clearAll: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(248, 113, 113, 0.35)",
    backgroundColor: "rgba(248, 113, 113, 0.08)",
  },
  clearAllText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FCA5A5",
  },
  bottomSafe: {
    backgroundColor: "#020617",
  },
});

const modalFooter = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    minWidth: 120,
  },
  btnGhost: {
    backgroundColor: "rgba(148, 163, 184, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: "center",
    flex: 1,
  },
  btnSolid: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.35)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    alignItems: "center",
    flex: 1,
  },
  btnGhostText: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "600",
  },
  btnSolidText: {
    color: "#6EE7B7",
    fontSize: 15,
    fontWeight: "700",
  },
  singleCancel: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  pillsScrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: SME_TX_FILTERS_PILLS_ROW_H,
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
