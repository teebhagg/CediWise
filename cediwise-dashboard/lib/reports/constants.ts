/** Shared, non-server constants for website reports. Kept out of "use server" modules, which may only export async functions. */

export const WEBSITE_REPORT_CATEGORY_OPTIONS = [
  { label: "App problem", value: "app_problem" },
  { label: "Account or payment", value: "account_or_payment" },
  { label: "Content or data", value: "content_or_data" },
  { label: "Abuse or safety", value: "safety_or_abuse" },
  { label: "Something else", value: "other" },
] as const;

export const WEBSITE_REPORT_STATUS_OPTIONS = [
  { label: "Open", value: "open" },
  { label: "In review", value: "in_review" },
  { label: "Resolved", value: "resolved" },
] as const;

export type WebsiteReportCategory = (typeof WEBSITE_REPORT_CATEGORY_OPTIONS)[number]["value"];
export type WebsiteReportStatus = (typeof WEBSITE_REPORT_STATUS_OPTIONS)[number]["value"];
export type WebsiteReportEmailStatus = "pending" | "sent" | "failed";

export function websiteReportCategoryLabel(value: string) {
  return WEBSITE_REPORT_CATEGORY_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function websiteReportStatusLabel(value: string) {
  return WEBSITE_REPORT_STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

export function isWebsiteReportStatus(value: string): value is WebsiteReportStatus {
  return WEBSITE_REPORT_STATUS_OPTIONS.some((item) => item.value === value);
}
