import { useMemo } from "react";
import { Dimensions, PixelRatio, ScaledSize } from "react-native";

type Breakpoint = "nano" | "compact" | "medium" | "expanded";

function breakpointForWidth(w: number): Breakpoint {
  if (w < 360) return "nano";
  if (w < 400) return "compact";
  if (w < 768) return "medium";
  return "expanded";
}

function pickRv(
  bp: Breakpoint,
  opts: Partial<Record<Breakpoint, number>> &
    Record<string, number | undefined>,
): number {
  const order: Breakpoint[] = ["nano", "compact", "medium", "expanded"];
  const at = order.indexOf(bp);
  for (let i = at; i >= 0; i--) {
    const v = opts[order[i]!];
    if (typeof v === "number") return v;
  }
  for (let i = at + 1; i < order.length; i++) {
    const v = opts[order[i]!];
    if (typeof v === "number") return v;
  }
  const first = Object.values(opts).find((x) => typeof x === "number");
  return typeof first === "number" ? first : 0;
}

/**
 * Layout helpers used by Reacticx Chat V1 template (responsive font + breakpoint values).
 */
export function useResponsive(dimensions?: ScaledSize) {
  const { width, height } = dimensions ?? Dimensions.get("window");
  return useMemo(() => {
    const bp = breakpointForWidth(width);
    const baseW = 390;
    return {
      width,
      height,
      breakpoint: bp,
      rf: (size: number) => {
        const scale = width / baseW;
        return Math.max(
          10,
          Math.round(PixelRatio.roundToNearestPixel(size * scale)),
        );
      },
      rv: (opts: Partial<Record<Breakpoint, number>> & Record<string, number>) =>
        pickRv(bp, opts),
    };
  }, [width, height]);
}
