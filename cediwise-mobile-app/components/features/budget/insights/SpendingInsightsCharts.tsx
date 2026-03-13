import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { ChartType } from './InsightsChartToggle';
import type { CategoryBreakdown, InsightsSeries } from './insightsData';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CHART_HEIGHT = 190;

type DonutSegmentProps = {
  segment: { color: string; ratio: number };
  size: number;
  radius: number;
  strokeWidth: number;
  ringLength: number;
  circumference: number;
  offset: number;
  progress: SharedValue<number>;
};

function AnimatedDonutSegment({
  segment,
  size,
  radius,
  strokeWidth,
  ringLength,
  circumference,
  offset,
  progress,
}: DonutSegmentProps) {
  const segmentLength = ringLength * segment.ratio;
  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: `${segmentLength * progress.value} ${circumference}`,
    strokeDashoffset: -offset,
  }));
  return (
    <AnimatedCircle
      cx={size / 2}
      cy={size / 2}
      r={radius}
      stroke={segment.color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      animatedProps={animatedProps}
      rotation={-90}
      originX={size / 2}
      originY={size / 2}
    />
  );
}

const formatAxisValue = (value: number) => {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toFixed(2).replace(/\.00$/, '');
};

const useReduceMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => { });
  }, []);
  return reduceMotion;
};

type BarProps = {
  height: number;
  delay: number;
};

function AnimatedBar({ height, delay }: BarProps) {
  const animatedHeight = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = withDelay(
      delay,
      withTiming(height, { duration: 450 }),
    );
  }, [height, delay, animatedHeight]);

  const style = useAnimatedStyle(() => ({
    height: animatedHeight.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 22,
          borderRadius: 8,
          backgroundColor: 'white',
        },
        style,
      ]}
    />
  );
}

type ChartProps = {
  type: ChartType;
  series: InsightsSeries;
  categories: CategoryBreakdown[];
  totalSpent: number;
  dateRangeLabel: string;
};

export function SpendingInsightsChart({
  type,
  series,
  categories,
  totalSpent,
  dateRangeLabel,
}: ChartProps) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const chartWidth = width - 40;
  const rightPadding = 36;
  const plotWidth = Math.max(chartWidth - rightPadding, 120);

  if (type === 'donut') {
    return (
      <DonutChart
        width={chartWidth}
        categories={categories}
        totalSpent={totalSpent}
        dateRangeLabel={dateRangeLabel}
        reduceMotion={reduceMotion}
      />
    );
  }

  if (type === 'line') {
    return (
      <View>
        <LineChart
          width={chartWidth}
          plotWidth={plotWidth}
          height={CHART_HEIGHT}
          series={series}
          reduceMotion={reduceMotion}
        />
        <LineLabels
          plotWidth={plotWidth}
          labels={series.labels}
          count={series.values.length}
        />
      </View>
    );
  }

  return (
    <View>
      <BarChart
        width={chartWidth}
        plotWidth={plotWidth}
        height={CHART_HEIGHT}
        series={series}
        reduceMotion={reduceMotion}
      />
      <BarLabels plotWidth={plotWidth} labels={series.labels} count={series.values.length} />
    </View>
  );
}

function BarChart({
  width,
  plotWidth,
  height,
  series,
  reduceMotion,
}: {
  width: number;
  plotWidth: number;
  height: number;
  series: InsightsSeries;
  reduceMotion: boolean;
}) {
  const max = Math.max(series.maxValue, 1);
  const avg = series.avgValue;
  const mid = max / 2;
  const barWidth = 10;
  const dynamicSpacing =
    series.values.length > 1
      ? Math.max(3, (plotWidth - series.values.length * barWidth) / (series.values.length - 1))
      : 0; // Minimum spacing of 10 units between bars
  const barSpacing = Number.isFinite(dynamicSpacing) ? dynamicSpacing : 3; // Minimum spacing between bars
  const totalBarsWidth = series.values.length * barWidth + (series.values.length - 1) * barSpacing;
  const horizontalPadding = Math.max((plotWidth - totalBarsWidth) / 2, 12);
  const avgY = height - (avg / max) * (height - 24) - 12;

  return (
    <View style={{ height, width }}>
      <Svg width={plotWidth} height={height}>
        <Line
          x1={0}
          y1={height - 12}
          x2={plotWidth}
          y2={height - 12}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1}
        />
        <Line
          x1={0}
          y1={12}
          x2={plotWidth}
          y2={12}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1}
          strokeDasharray="2,6"
        />
        <Line
          x1={0}
          y1={avgY}
          x2={plotWidth}
          y2={avgY}
          stroke="#10b981"
          strokeWidth={1}
          strokeDasharray="2,6"
        />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: horizontalPadding,
          right: width - plotWidth + horizontalPadding,
          bottom: 12,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}
      >
        {series.values.map((value, index) => {
          const targetHeight = reduceMotion ? (value / max) * (height - 24) : (value / max) * (height - 24);
          return (
            <View key={`${index}-${value}`} style={{ height: height - 24, justifyContent: 'flex-end' }}>
              {reduceMotion ? (
                <View
                  style={{
                    width: barWidth,
                    height: targetHeight,
                    borderRadius: 8,
                    backgroundColor: 'white',
                  }}
                />
              ) : (
                <AnimatedBar height={targetHeight} delay={index * 80} />
              )}
            </View>
          );
        })}
      </View>
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 6,
          bottom: 6,
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <Text className="text-white text-xs">{formatAxisValue(max)}</Text>
        <Text className="text-white text-xs">{formatAxisValue(mid)}</Text>
        <Text className="text-white text-xs">0</Text>
      </View>
    </View>
  );
}

function LineChart({
  width,
  plotWidth,
  height,
  series,
  reduceMotion,
}: {
  width: number;
  plotWidth: number;
  height: number;
  series: InsightsSeries;
  reduceMotion: boolean;
}) {
  const max = Math.max(series.maxValue, 1);
  const mid = max / 2;
  const paddingBottom = 18;
  const paddingTop = 16;
  const drawableHeight = height - paddingTop - paddingBottom;
  const { centers } = getLabelLayout(series.values.length, plotWidth);
  const lineLeftOffset = 10;

  const points = series.values.map((value, index) => ({
    x: Math.max(0, centers[index] - lineLeftOffset),
    y: paddingTop + (1 - value / max) * drawableHeight,
  }));

  const path = useMemo(() => {
    if (!points.length) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      d += ` L ${points[i].x} ${points[i - 1].y}`;
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }, [points]);

  const baselineY = height - paddingBottom;
  const hasPositiveValue = series.values.some((v) => v > 0);
  const areaPath = useMemo(() => {
    if (!points.length || !hasPositiveValue) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      d += ` L ${points[i].x} ${points[i - 1].y}`;
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    d += ` L ${points[points.length - 1].x} ${baselineY}`;
    d += ` L ${points[0].x} ${baselineY}`;
    d += ' Z';
    return d;
  }, [points, baselineY, hasPositiveValue]);

  return (
    <View style={{ height, width }}>
      <Svg width={plotWidth} height={height}>
        <Defs>
          <LinearGradient
            id="lineAreaGradient"
            gradientUnits="userSpaceOnUse"
            x1={0}
            y1={paddingTop}
            x2={0}
            y2={baselineY}
          >
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.25} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line
          x1={0}
          y1={height - paddingBottom}
          x2={plotWidth}
          y2={height - paddingBottom}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1}
        />
        <Line
          x1={0}
          y1={paddingTop}
          x2={plotWidth}
          y2={paddingTop}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
          strokeDasharray="2,6"
        />
        {areaPath ? (
          <Path d={areaPath} fill="url(#lineAreaGradient)" />
        ) : null}
        <Path
          d={path}
          fill="none"
          stroke="white"
          strokeWidth={2}
          opacity={reduceMotion ? 1 : 0.9}
        />
      </Svg>
      {points.length > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: plotWidth + 8,
            height,
            zIndex: 1,
          }}
        >
          <View
            style={{
              position: 'absolute',
              left: points[points.length - 1].x - 4,
              top: points[points.length - 1].y - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: 'white',
            }}
          />
        </View>
      ) : null}
      <View
        style={{
          position: 'absolute',
          right: 0,
          top: 6,
          bottom: 6,
          justifyContent: 'center',
          alignItems: 'flex-end',
        }}
      >
        <View style={{ justifyContent: 'space-between', height: '100%' }}>
          <Text className="text-white text-xs">{formatAxisValue(max)}</Text>
          <Text className="text-white text-xs">{formatAxisValue(mid)}</Text>
          <Text className="text-white text-xs">0</Text>
        </View>
      </View>
    </View>
  );
}

function getLabelLayout(count: number, plotWidth: number) {
  if (count <= 0 || plotWidth <= 0) {
    return { centers: [] as number[], labelWidth: 0 };
  }

  const maxBarsWidth = plotWidth * 0.7;
  const idealBarWidth = maxBarsWidth / count;
  const barWidth = Math.min(35, Math.max(10, idealBarWidth));
  const dynamicSpacing =
    count > 1 ? Math.max(5, (plotWidth - count * barWidth) / (count - 1)) : 0;
  const barSpacing = Number.isFinite(dynamicSpacing) ? dynamicSpacing : 5;
  const totalBarsWidth = count * barWidth + (count - 1) * barSpacing;
  const horizontalPadding = Math.max((plotWidth - totalBarsWidth) / 2, 16);
  const stepBetweenCenters = barWidth + barSpacing;
  const rawLabelWidth = Math.max(24, stepBetweenCenters);
  const maxLabelWidthToAvoidOverlap = Math.floor((plotWidth - 24) / count) - 4;
  const labelWidth = Math.min(rawLabelWidth, Math.max(20, maxLabelWidthToAvoidOverlap));
  const centers = Array.from({ length: count }, (_, index) =>
    horizontalPadding + index * stepBetweenCenters + barWidth / 2,
  );
  return { centers, labelWidth };
}

const MIN_LABEL_WIDTH = 32;
const LABEL_H_PADDING = 20;

function getVisibleLabelIndices(count: number, plotWidth: number): number[] {
  const maxLabelsThatFit = Math.max(1, Math.floor(plotWidth / MIN_LABEL_WIDTH));
  let step = Math.max(1, Math.ceil(count / maxLabelsThatFit));
  if (count === 7 && plotWidth < 280) {
    step = 2;
  }
  const indices: number[] = [];
  for (let i = 0; i < count; i += step) {
    indices.push(i);
  }
  return indices;
}

function BarLabels({
  plotWidth,
  labels,
  count,
}: {
  plotWidth: number;
  labels: string[];
  count: number;
}) {
  const { labelWidth } = getLabelLayout(count, plotWidth);
  const indices = getVisibleLabelIndices(count, plotWidth);
  const span = plotWidth - 2 * LABEL_H_PADDING;
  const n = indices.length;

  return (
    <View style={{ height: 20, marginTop: 10, width: plotWidth }}>
      {indices.map((dataIndex, i) => {
        const label = labels[dataIndex];
        if (label == null) return null;
        const centerX =
          n <= 1
            ? plotWidth / 2
            : LABEL_H_PADDING + (i / (n - 1)) * span;
        const left = Math.max(
          0,
          Math.min(centerX - labelWidth / 2, plotWidth - labelWidth)
        );
        return (
          <View
            key={`${label}-${dataIndex}`}
            style={{
              position: 'absolute',
              left,
              width: labelWidth,
              alignItems: 'center',
            }}
          >
            <Text className="text-white text-xs" numberOfLines={1} ellipsizeMode="clip">
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function LineLabels({
  plotWidth,
  labels,
  count,
}: {
  plotWidth: number;
  labels: string[];
  count: number;
}) {
  const { labelWidth } = getLabelLayout(count, plotWidth);
  const indices = getVisibleLabelIndices(count, plotWidth);
  const span = plotWidth - 2 * LABEL_H_PADDING;
  const n = indices.length;

  return (
    <View style={{ height: 20, marginTop: 10, width: plotWidth }}>
      {indices.map((dataIndex, i) => {
        const label = labels[dataIndex];
        if (label == null) return null;
        const centerX =
          n <= 1
            ? plotWidth / 2
            : LABEL_H_PADDING + (i / (n - 1)) * span;
        const left = Math.max(
          0,
          Math.min(centerX - labelWidth / 2, plotWidth - labelWidth)
        );
        return (
          <View
            key={`${label}-${dataIndex}`}
            style={{
              position: 'absolute',
              left,
              width: labelWidth,
              alignItems: 'center',
            }}
          >
            <Text className="text-white text-xs" numberOfLines={1} ellipsizeMode="clip">
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function DonutChart({
  width,
  categories,
  totalSpent,
  dateRangeLabel,
  reduceMotion,
}: {
  width: number;
  categories: CategoryBreakdown[];
  totalSpent: number;
  dateRangeLabel: string;
  reduceMotion: boolean;
}) {
  const size = Math.min(width, 220);
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const totalAmount = categories.reduce((sum, item) => sum + item.amount, 0);
  const segments = totalAmount
    ? categories.map((item) => ({
      color: item.color,
      ratio: item.amount / totalAmount,
    }))
    : [];

  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withTiming(1, { duration: 650 });
  }, [progress, reduceMotion]);

  const gapAngle = 0.20; // radians
  const gapLength = radius * gapAngle;
  const ringLength = Math.max(circumference - gapLength * segments.length, 0);

  let offset = 0;
  const segmentData = segments.map((segment) => {
    const data = { segment, offset };
    offset += ringLength * segment.ratio + gapLength;
    return data;
  });

  return (
    <View className="items-center justify-center" style={{ height: CHART_HEIGHT }}>
      <Svg width={size} height={size}>
        {segmentData.map(({ segment, offset }, index) => (
          <AnimatedDonutSegment
            key={`${segment.color}-${index}`}
            segment={segment}
            size={size}
            radius={radius}
            strokeWidth={strokeWidth}
            ringLength={ringLength}
            circumference={circumference}
            offset={offset}
            progress={progress}
          />
        ))}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text className="text-white text-sm">Spent</Text>
        <Text className="text-white text-3xl font-semibold mt-1">
          ₵{formatAxisValue(totalSpent)}
        </Text>
        {dateRangeLabel ? (
          <Text className="text-white text-sm mt-1">{dateRangeLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}
