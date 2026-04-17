import {
  DEFAULT_BOTTOM_HEIGHT,
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_STANDARD_HEIGHT,
  getExpandedHeaderHeight,
} from "@/components/CediWiseHeader";

/** `ExpandedHeader` `expandedHeight` on Budget → Spending Insights. */
export const INSIGHTS_EXPANDED_HEADER_HEIGHT = 130;

/** Default gap between header chrome and first scroll row. */
export const HEADER_CONTENT_GAP = 20;

/** First content row starts below `StandardHeader` (no `bottom` slot). */
export function getStandardHeaderBodyOffsetTop(
  insetTop: number,
  standardHeight: number = DEFAULT_STANDARD_HEIGHT,
): number {
  return insetTop + standardHeight;
}

/** First content row starts below `StandardHeader` + `bottom` (e.g. filter chips). */
export function getStandardHeaderWithBottomBodyOffsetTop(
  insetTop: number,
  options?: { standardHeight?: number; bottomHeight?: number },
): number {
  const sh = options?.standardHeight ?? DEFAULT_STANDARD_HEIGHT;
  const bh = options?.bottomHeight ?? DEFAULT_BOTTOM_HEIGHT;
  return insetTop + sh + bh;
}

/**
 * `paddingTop` for scroll/list content under an `ExpandedHeader` (expanded state).
 */
export function getExpandedHeaderScrollPaddingTop(
  insetTop: number,
  options?: {
    expandedHeight?: number;
    bottomHeight?: number;
    contentGap?: number;
  },
): number {
  const gap = options?.contentGap ?? HEADER_CONTENT_GAP;
  return (
    getExpandedHeaderHeight({
      expandedHeight: options?.expandedHeight ?? DEFAULT_EXPANDED_HEIGHT,
      bottomHeight: options?.bottomHeight ?? 0,
      insetTop,
    }) + gap
  );
}
