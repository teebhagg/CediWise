/**
 * Export filtered SME transactions as CSV and open the native share sheet.
 */

import type { PaymentMethod, SMETransaction } from "@/types/sme";
import { PAYMENT_METHOD_LABELS } from "@/types/sme";
import { cacheDirectory, writeAsStringAsync } from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

function csvCell(value: string | number | boolean): string {
  const raw = String(value);
  const neutralized = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  if (/[",\n\r]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }
  return neutralized;
}

function paymentLabel(m: PaymentMethod | null): string {
  if (!m) return "";
  return PAYMENT_METHOD_LABELS[m] ?? m;
}

function buildCsvRows(
  transactions: SMETransaction[],
  businessName: string,
  filterSummaryLines: readonly string[],
): string {
  const exportedAt = new Date();
  const dateLabel = exportedAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const count = transactions.length;
  const displayName = businessName.trim() || "Business";

  const preamble = [
    "CediWise — Business transactions",
    displayName,
    `Exported ${dateLabel} · ${count} transaction${count === 1 ? "" : "s"}`,
    "",
  ].map((line) => csvCell(line));

  const filterBlock = [
    "Filters applied (same as on screen)",
    ...filterSummaryLines,
    "",
  ].map((line) => csvCell(line));

  const headers = [
    "Date",
    "Type",
    "Description",
    "Category",
    "Amount (GHS)",
    "VAT Applicable",
    "VAT Amount (GHS)",
    "Payment Method",
    "Notes",
  ];
  const lines = [...preamble, ...filterBlock, headers.map(csvCell).join(",")];

  for (const t of transactions) {
    const row = [
      t.transactionDate,
      t.type === "income" ? "Income" : "Expense",
      t.description,
      t.category,
      (t.amount ?? 0).toFixed(2),
      t.vatApplicable ? "Yes" : "No",
      (t.vatAmount ?? 0).toFixed(2),
      paymentLabel(t.paymentMethod),
      t.notes ?? "",
    ];
    lines.push(row.map(csvCell).join(","));
  }

  return lines.join("\n");
}

function safeFilenamePart(name: string): string {
  const s = name.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_");
  return s.slice(0, 48) || "business";
}

/**
 * Writes CSV to the app cache dir and invokes the platform share sheet.
 */
export async function exportSMETransactionsCSV(
  transactions: SMETransaction[],
  businessName: string,
  filterSummaryLines: readonly string[],
): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = safeFilenamePart(businessName.trim());
  const filename = `${base}_transactions_${stamp}.csv`;
  const trimmedName = businessName.trim();
  const csv =
    "\uFEFF" +
    buildCsvRows(transactions, trimmedName || "Business", filterSummaryLines);
  const dir = cacheDirectory;
  if (!dir) {
    throw new Error("Cache directory is not available.");
  }
  const uri = dir.endsWith("/") ? `${dir}${filename}` : `${dir}/${filename}`;

  await writeAsStringAsync(uri, csv, {
    encoding: "utf8",
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error(
      "Sharing isn't available on this device, so the export sheet can't open.",
    );
  }

  await Sharing.shareAsync(uri, {
    mimeType: "text/csv",
    dialogTitle: "Export transactions",
    UTI: "public.comma-separated-values-text",
  });
}
