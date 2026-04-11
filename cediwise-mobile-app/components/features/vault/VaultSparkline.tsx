import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

import type { VaultSparklinePoint } from "@/types/budget";

type VaultSparklineProps = {
  points: VaultSparklinePoint[];
  width: number;
  height: number;
  strokeColor?: string;
};

export function VaultSparkline({
  points,
  width,
  height,
  strokeColor = "rgba(34, 197, 94, 0.9)",
}: VaultSparklineProps) {
  const d = useMemo(() => {
    if (points.length === 0) return null;
    const values = points.map((p) => p.cumulativeTotal);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;
    const pad = 4;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const yAt = (cumulative: number) =>
      pad + innerH - ((cumulative - minV) / range) * innerH;

    if (points.length === 1) {
      const y = yAt(points[0].cumulativeTotal);
      return `${pad},${y} ${pad + innerW},${y}`;
    }

    return points
      .map((p, i) => {
        const x = pad + (i / (points.length - 1)) * innerW;
        const y = yAt(p.cumulativeTotal);
        return `${x},${y}`;
      })
      .join(" ");
  }, [points, width, height]);

  if (!d) {
    return (
      <View
        style={{ width, height }}
        className="rounded bg-white/5 border border-white/10"
      />
    );
  }

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
