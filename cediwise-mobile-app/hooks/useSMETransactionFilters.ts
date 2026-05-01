/**
 * Filter state + derived list for SME transaction screen.
 */

import type {
  PaymentMethod,
  SMETransaction,
  SMECategory,
  TransactionType,
} from "@/types/sme";
import moment from "moment";
import { useCallback, useMemo, useState } from "react";

export type FilterType = "all" | TransactionType;

export type DatePreset =
  | "all"
  | "today"
  | "week"
  | "month"
  | "last_month"
  | "custom";

/** Default list ordering for SME transaction list. */
export type SMETransactionSortId =
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc";

export const SME_TRANSACTION_SORT_DEFAULT: SMETransactionSortId = "date_desc";

export type DateRangeResolved = { from: string | null; to: string | null };

function compareTransactions(
  a: SMETransaction,
  b: SMETransaction,
  sort: SMETransactionSortId
): number {
  switch (sort) {
    case "date_desc":
      return (
        b.transactionDate.localeCompare(a.transactionDate) ||
        b.id.localeCompare(a.id)
      );
    case "date_asc":
      return (
        a.transactionDate.localeCompare(b.transactionDate) ||
        a.id.localeCompare(b.id)
      );
    case "amount_desc":
      return (
        b.amount - a.amount ||
        b.transactionDate.localeCompare(a.transactionDate)
      );
    case "amount_asc":
      return (
        a.amount - b.amount ||
        a.transactionDate.localeCompare(b.transactionDate)
      );
    default:
      return 0;
  }
}

export function resolveDateRange(
  preset: DatePreset,
  dateFrom: string | null,
  dateTo: string | null
): DateRangeResolved {
  const now = moment();

  switch (preset) {
    case "all":
      return { from: null, to: null };
    case "today": {
      const d = now.format("YYYY-MM-DD");
      return { from: d, to: d };
    }
    case "week": {
      const from = now.clone().startOf("isoWeek").format("YYYY-MM-DD");
      const to = now.clone().endOf("isoWeek").format("YYYY-MM-DD");
      return { from, to };
    }
    case "month": {
      const from = now.clone().startOf("month").format("YYYY-MM-DD");
      const to = now.format("YYYY-MM-DD");
      return { from, to };
    }
    case "last_month": {
      const start = now.clone().subtract(1, "month").startOf("month");
      const end = now.clone().subtract(1, "month").endOf("month");
      return {
        from: start.format("YYYY-MM-DD"),
        to: end.format("YYYY-MM-DD"),
      };
    }
    case "custom":
      if (dateFrom && dateTo) {
        return { from: dateFrom, to: dateTo };
      }
      return { from: null, to: null };
    default:
      return { from: null, to: null };
  }
}

export function useSMETransactionFilters(
  transactions: SMETransaction[],
  categories: SMECategory[]
) {
  const [filterType, setFilterTypeState] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePresetState] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod | null>(null);
  const [sortBy, setSortBy] = useState<SMETransactionSortId>(
    SME_TRANSACTION_SORT_DEFAULT
  );

  const setFilterType = useCallback((t: FilterType) => {
    setFilterTypeState(t);
    setSelectedCategory(null);
  }, []);

  const setDatePreset = useCallback(
    (
      preset: DatePreset,
      opts?: { from?: string | null; to?: string | null }
    ) => {
      setDatePresetState(preset);
      if (preset !== "custom") {
        setDateFrom(null);
        setDateTo(null);
      }
      if (opts?.from !== undefined) setDateFrom(opts.from ?? null);
      if (opts?.to !== undefined) setDateTo(opts.to ?? null);
    },
    []
  );

  const applyCustomRange = useCallback((from: string, to: string) => {
    let a = from;
    let b = to;
    if (a > b) [a, b] = [b, a];
    setDatePresetState("custom");
    setDateFrom(a);
    setDateTo(b);
  }, []);

  const availableCategories = useMemo(() => {
    if (filterType === "all") return [];
    return categories
      .filter((c) => c.type === filterType)
      .map((c) => c.name)
      .sort((x, y) => x.localeCompare(y));
  }, [categories, filterType]);

  const filteredTransactions = useMemo(() => {
    let txs = transactions;

    if (filterType !== "all") {
      txs = txs.filter((t) => t.type === filterType);
    }

    const { from, to } = resolveDateRange(datePreset, dateFrom, dateTo);
    if (from) txs = txs.filter((t) => t.transactionDate >= from);
    if (to) txs = txs.filter((t) => t.transactionDate <= to);

    if (selectedCategory) {
      txs = txs.filter((t) => t.category === selectedCategory);
    }

    if (selectedPaymentMethod) {
      txs = txs.filter((t) => t.paymentMethod === selectedPaymentMethod);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      txs = txs.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }

    return [...txs].sort((a, b) => compareTransactions(a, b, sortBy));
  }, [
    transactions,
    filterType,
    datePreset,
    dateFrom,
    dateTo,
    selectedCategory,
    selectedPaymentMethod,
    searchQuery,
    sortBy,
  ]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filterType !== "all") n++;
    if (datePreset !== "all") n++;
    if (selectedCategory) n++;
    if (selectedPaymentMethod) n++;
    if (searchQuery.trim()) n++;
    if (sortBy !== SME_TRANSACTION_SORT_DEFAULT) n++;
    return n;
  }, [
    filterType,
    datePreset,
    selectedCategory,
    selectedPaymentMethod,
    searchQuery,
    sortBy,
  ]);

  const clearAllFilters = useCallback(() => {
    setFilterTypeState("all");
    setSearchQuery("");
    setDatePresetState("all");
    setDateFrom(null);
    setDateTo(null);
    setSelectedCategory(null);
    setSelectedPaymentMethod(null);
    setSortBy(SME_TRANSACTION_SORT_DEFAULT);
  }, []);

  return {
    filterType,
    setFilterType,
    searchQuery,
    setSearchQuery,
    datePreset,
    dateFrom,
    dateTo,
    setDatePreset,
    applyCustomRange,
    selectedCategory,
    setSelectedCategory,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    filteredTransactions,
    activeFilterCount,
    clearAllFilters,
    availableCategories,
    sortBy,
    setSortBy,
  };
}
