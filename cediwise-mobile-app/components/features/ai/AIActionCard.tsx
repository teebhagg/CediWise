import { resolveCategoryByAiName } from "@/hooks/aiChatTransport";
import type { AIChatStructuredMessage } from "@/types/ai";
import type { BudgetCategory, Debt } from "@/types/budget";
import { formatCurrency } from "@/utils/formatCurrency";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

const INVALID_AMOUNT_LABEL = "—";

/** Finite numeric money from AI payload; avoids passing bad values into formatCurrency / totals. */
function parseFiniteMoney(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

function formatMoneyOrDash(raw: unknown): string {
  const n = parseFiniteMoney(raw);
  return n === null ? INVALID_AMOUNT_LABEL : formatCurrency(n);
}

type BulkTx = { cat?: string; qty?: number; amt?: number; date?: string };

export interface AIActionCardProps {
  message: Extract<AIChatStructuredMessage, { type: "action" }>;
  categories?: BudgetCategory[];
  debts?: Debt[];
  isSkipped?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AIActionCard({
  message,
  categories,
  debts,
  isSkipped,
  onConfirm,
  onCancel,
}: AIActionCardProps) {
  const isApplied = message.status === "applied";
  const effectivelySkipped = message.status === "skipped" || (isSkipped && !isApplied);

  const renderFooter = (
    confirmText: string,
    confirmBgClass: string,
    confirmTextClass: string,
    disabledCondition: boolean = false
  ) => {
    if (isApplied) {
      return (
        <View className="flex-row justify-end mt-1">
          <View className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex-row items-center gap-1.5">
            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            <Text className="text-emerald-400 text-xs font-bold">Applied</Text>
          </View>
        </View>
      );
    }
    if (effectivelySkipped) {
      return (
        <View className="flex-row justify-end mt-1">
          <View className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex-row items-center gap-1.5">
            <Ionicons name="close-circle" size={14} color="#94a3b8" />
            <Text className="text-slate-400 text-xs font-medium">Skipped</Text>
          </View>
        </View>
      );
    }

    return (
      <View className="flex-row gap-2 justify-end flex-wrap mt-1">
        <Pressable onPress={onCancel} className="px-3 py-2 rounded-lg bg-white/10">
          <Text className="text-white text-xs font-medium">Cancel</Text>
        </Pressable>
        <Pressable
          disabled={disabledCondition}
          onPress={onConfirm}
          className={`px-4 py-2 rounded-lg ${confirmBgClass} ${disabledCondition ? "opacity-40" : ""}`}>
          <Text className={`${confirmTextClass} text-xs font-bold`}>{confirmText}</Text>
        </Pressable>
      </View>
    );
  };

  if (message.action === "record_debt_payment") {
    const debt = debts?.find(d => d.id === message.payload.debt_id);
    return (
      <View className="mt-2 rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-3 py-3 gap-3">
        <Text className="text-white text-sm font-semibold">Confirm Debt Payment</Text>
        <View className="gap-1">
          <Text className="text-white/85 text-xs">
            Payment:{" "}
            <Text className="text-emerald-400 font-bold">₵{formatMoneyOrDash(message.payload.amount)}</Text>
          </Text>
          <Text className="text-white/65 text-[11px]">
            To: {debt?.name || (message.payload.debt_name as string) || "Unknown Debt"}
          </Text>
        </View>
        {renderFooter(
          "Confirm Payment",
          "bg-emerald-500",
          "text-slate-900",
          parseFiniteMoney(message.payload.amount) === null,
        )}
      </View>
    );
  }

  if (message.action === "create_debt") {
    return (
      <View className="mt-2 rounded-xl border border-blue-500/35 bg-blue-950/25 px-3 py-3 gap-3">
        <Text className="text-white text-sm font-semibold">Add New Debt</Text>
        <View className="gap-1">
          <Text className="text-white/85 text-xs">Name: {message.payload.name as string}</Text>
          <Text className="text-white/85 text-xs">Amount: ₵{formatMoneyOrDash(message.payload.total_amount)}</Text>
          <Text className="text-white/65 text-[11px]">Interest: {message.payload.interest_rate as string}% APR</Text>
        </View>
        {renderFooter(
          "Create Debt",
          "bg-blue-500",
          "text-white",
          parseFiniteMoney(message.payload.total_amount) === null,
        )}
      </View>
    );
  }

  if (message.action === "update_category_limit") {
    const cat = categories?.find((c) => c.id === message.payload.category_id);
    return (
      <View className="mt-2 rounded-xl border border-indigo-500/35 bg-indigo-950/25 px-3 py-3 gap-3">
        <Text className="text-white text-sm font-semibold">Update Category Limit</Text>
        <View className="gap-1">
          <Text className="text-white/85 text-xs">Category: {cat?.name || (message.payload.category_name as string) || "Unknown"}</Text>
          <Text className="text-white/85 text-xs">
            New Limit:{" "}
            <Text className="text-indigo-400 font-bold">₵{formatMoneyOrDash(message.payload.new_limit)}</Text>
          </Text>
        </View>
        {renderFooter(
          "Update Limit",
          "bg-indigo-500",
          "text-white",
          parseFiniteMoney(message.payload.new_limit) === null,
        )}
      </View>
    );
  }

  if (message.action === "create_category") {
    return (
      <View className="mt-2 rounded-xl border border-teal-500/35 bg-teal-950/25 px-3 py-3 gap-3">
        <Text className="text-white text-sm font-semibold">Create New Category</Text>
        <View className="gap-1">
          <Text className="text-white/85 text-xs">Name: {message.payload.name as string}</Text>
          <Text className="text-white/85 text-xs">Limit: ₵{formatMoneyOrDash(message.payload.limit_amount)}</Text>
          <Text className="text-white/65 text-[11px]">Bucket: {message.payload.bucket as string}</Text>
        </View>
        {renderFooter(
          "Create Category",
          "bg-teal-500",
          "text-white",
          parseFiniteMoney(message.payload.limit_amount) === null,
        )}
      </View>
    );
  }

  if (message.action === "reallocate_budget") {
    const parsePct = (val: any) => {
      if (typeof val === "string") val = val.replace(/%/g, "");
      const n = Number(val);
      if (isNaN(n)) return 0;
      return n <= 1 ? Math.round(n * 100) : Math.round(n);
    };

    const needs = parsePct(message.payload.needs_pct);
    const wants = parsePct(message.payload.wants_pct);
    const savings = parsePct(message.payload.savings_pct);

    return (
      <View className="mt-2 rounded-xl border border-amber-500/35 bg-amber-950/25 px-3 py-3 gap-3">
        <Text className="text-white text-sm font-semibold">Reallocate Budget</Text>
        <View className="gap-1">
          <Text className="text-white/85 text-xs">
            Needs: <Text className="text-amber-400 font-bold">{needs}%</Text>
          </Text>
          <Text className="text-white/85 text-xs">
            Wants: <Text className="text-amber-400 font-bold">{wants}%</Text>
          </Text>
          <Text className="text-white/85 text-xs">
            Savings: <Text className="text-amber-400 font-bold">{savings}%</Text>
          </Text>
        </View>
        {renderFooter("Apply Changes", "bg-amber-500", "text-slate-900")}
      </View>
    );
  }

  if (message.action !== "bulk_create_transactions") {
    return (
      <View className="mt-2 rounded-xl border border-amber-500/35 bg-amber-950/30 px-3 py-3 gap-3">
        <Text className="text-white text-sm font-semibold">Suggested action</Text>
        <Text className="text-white/75 text-xs leading-5">{message.text}</Text>
        <Text className="text-amber-300/90 text-[11px]">
          Confirmation for &quot;{message.action}&quot; is limited in-app — manage from budget
          tools for now.
        </Text>
        {isApplied ? null : effectivelySkipped ? (
          <View className="flex-row justify-end mt-1">
            <View className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 flex-row items-center gap-1.5">
              <Ionicons name="close-circle" size={14} color="#94a3b8" />
              <Text className="text-slate-400 text-xs font-medium">Dismissed</Text>
            </View>
          </View>
        ) : (
          <View className="flex-row gap-2 justify-end mt-1">
            <Pressable onPress={onCancel} className="px-3 py-2 rounded-lg bg-white/10">
              <Text className="text-white text-xs font-medium">Dismiss</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  const raw = message.payload.transactions;
  const list: BulkTx[] = Array.isArray(raw) ? raw : [];

  const lines = list.map((row, idx) => {
    const cat = String(row.cat ?? "");
    const qty = Math.max(1, Math.floor(Number(row.qty) || 1));
    const amtParsed = parseFiniteMoney(row.amt);
    const amtInvalid = amtParsed === null;
    const amt = amtInvalid ? 0 : Math.max(0, amtParsed);
    const date = String(row.date ?? "");
    const match = categories ? resolveCategoryByAiName(cat, categories) : null;
    return {
      cat: cat || `Unknown ${idx + 1}`,
      qty,
      amt,
      amtInvalid,
      date: date.slice(0, 10),
      ok: !!match,
    };
  });

  const blocked = lines.length - lines.filter((x) => x.ok).length;
  const anyAmtInvalid = lines.some((r) => r.amtInvalid);
  const totalAmt = anyAmtInvalid ? null : lines.reduce((s, r) => s + r.qty * r.amt, 0);
  const totalTx = lines.reduce((s, r) => s + r.qty, 0);

  return (
    <View className="mt-2 rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-3 py-3 gap-3">
      <Text className="text-white text-sm font-semibold">{message.text}</Text>
      <View className="gap-1.5">
        {lines.slice(0, 12).map((row, idx) => (
          <View key={`${idx}-${row.cat}`}>
            <Text
              className={`text-xs ${row.ok ? "text-white/85" : "text-amber-300"}`}>
              {row.cat} ×{row.qty} @ ₵
              {row.amtInvalid ? INVALID_AMOUNT_LABEL : formatCurrency(row.amt)}
              {!row.ok ? " (needs category mapping)" : null}
            </Text>
          </View>
        ))}
        {lines.length > 12 ? (
          <Text className="text-white/45 text-[11px]">Showing first 12 lines</Text>
        ) : null}
      </View>
      <View className="border-t border-white/10 pt-2 gap-1 mb-1">
        <Text className="text-white/70 text-[11px]">
          ~{totalTx} transactions · ~₵{totalAmt === null ? INVALID_AMOUNT_LABEL : formatCurrency(totalAmt)}
          {blocked > 0
            ? ` · ${blocked} rows need mapped categories`
            : null}
        </Text>
      </View>
      {renderFooter(
        "Confirm",
        "bg-emerald-500",
        "text-slate-900",
        blocked > 0 || lines.length === 0 || anyAmtInvalid,
      )}
    </View>
  );
}
