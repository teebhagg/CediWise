import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { formatCurrency } from '../utils/formatCurrency';
import { Badge } from './Badge';
import { Card } from './Card';

const AnimatedView = Animated.createAnimatedComponent(View);

const RING_SIZE = 200;
const STROKE_WIDTH = 8;
const CENTER = RING_SIZE / 2;
const RADIUS = CENTER - STROKE_WIDTH / 2;
const START_ANGLE = -90;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const sweep = endAngle - startAngle;
  if (sweep <= 0) return '';

  const clampedSweep = Math.min(sweep, 359.999);
  const adjustedEndAngle = startAngle + clampedSweep;

  const start = polarToCartesian(cx, cy, radius, adjustedEndAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = clampedSweep > 180 ? '1' : '0';

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

type TaxBreakdown = {
  ssnit: number;
  paye: number;
  netTakeHome: number;
  gross: number;
};

type ProgressRingProps = {
  salary: number;
  breakdown: TaxBreakdown;
};

export function ProgressRing({ salary, breakdown }: ProgressRingProps) {
  const ringProgress = useSharedValue(0);
  const computedGross =
    breakdown.gross && breakdown.gross > 0
      ? breakdown.gross
      : salary > 0
        ? salary
        : breakdown.netTakeHome + breakdown.ssnit + breakdown.paye;
  const salaryCurrency = computedGross > 0 ? computedGross : 0;

  useEffect(() => {
    if (salary > 0) {
      ringProgress.value = withSpring(1, {
        damping: 8,
        mass: 1,
        overshootClamping: false,
      });
    } else {
      ringProgress.value = 0;
    }
  }, [salary, ringProgress]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringProgress.value, [0, 1], [0.5, 1], Extrapolate.CLAMP),
    transform: [
      {
        scale: interpolate(ringProgress.value, [0, 1], [0.95, 1], Extrapolate.CLAMP),
      },
    ],
  }));

  const totalDeductions = breakdown.ssnit + breakdown.paye;
  const netAmount = Math.max(0, salaryCurrency - totalDeductions);

  const ssnitPctRaw = salaryCurrency > 0 ? (breakdown.ssnit / salaryCurrency) * 100 : 0;
  const payePctRaw = salaryCurrency > 0 ? (breakdown.paye / salaryCurrency) * 100 : 0;
  const netPctRaw = salaryCurrency > 0 ? (netAmount / salaryCurrency) * 100 : 0;

  const rawTotal = ssnitPctRaw + payePctRaw + netPctRaw;
  const scale = rawTotal > 0 ? 100 / rawTotal : 1;

  const ssnitPct = clamp(ssnitPctRaw * scale, 0, 100);
  const payePct = clamp(payePctRaw * scale, 0, 100);
  const netPct = clamp(netPctRaw * scale, 0, 100);
  const deductionPct = clamp(ssnitPct + payePct, 0, 100);

  const netAngle = 360 * (netPct / 100);
  const deductionAngle = 360 * (deductionPct / 100);
  const netPath = netPct > 0 ? describeArc(CENTER, CENTER, RADIUS, START_ANGLE, START_ANGLE + netAngle) : '';
  const deductionPath =
    deductionPct > 0
      ? describeArc(CENTER, CENTER, RADIUS, START_ANGLE + netAngle, START_ANGLE + netAngle + deductionAngle)
      : '';

  return (
    <Card className="w-full items-center py-8">
      <Text className="text-slate-400 text-[13px] mb-5 uppercase tracking-wide">
        Tax Breakdown
      </Text>

      <AnimatedView style={ringAnimatedStyle} className="items-center mb-8">
        <View className="w-[220px] h-[220px] rounded-[110px] bg-slate-400/10 justify-center items-center border-[3px] border-slate-400/20">
          <View className="w-[200px] h-[200px] rounded-[100px] bg-emerald-500/10 justify-center items-center relative">
            <Svg width={RING_SIZE} height={RING_SIZE} style={{
              position: 'absolute',
              top: 0,
              left: 0,
            }} className="absolute top-0 left-0">
              <SvgCircle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                stroke="rgba(148,163,184,0.18)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {deductionPath ? (
                <Path
                  d={deductionPath}
                  stroke="rgba(239,68,68,0.4)"
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  fill="none"
                />
              ) : null}
              {netPath ? (
                <Path
                  d={netPath}
                  stroke="rgba(34,197,94,0.65)"
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  fill="none"
                />
              ) : null}
            </Svg>

            <View className="items-center">
              <Text className="text-emerald-500 text-[28px] font-bold">
                ₵{formatCurrency(breakdown.netTakeHome)}
              </Text>
              <Text className="text-slate-400 text-[11px] mt-1">Net Take-Home</Text>
            </View>
          </View>
        </View>
      </AnimatedView>

      <View className="w-full gap-3">
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-slate-400 text-xs mb-1">Gross Salary</Text>
            <Text className="text-slate-200 text-base font-bold">
              ₵{formatCurrency(salaryCurrency)}
            </Text>
          </View>
          <Badge tone="neutral">100%</Badge>
        </View>

        <View className="h-px bg-white/10 my-2" />

        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-slate-400 text-xs mb-1">SSNIT (5.5%)</Text>
            <Text className="text-red-300 text-base font-bold">
              ₵{formatCurrency(breakdown.ssnit)}
            </Text>
          </View>
          <Badge tone="danger">{ssnitPct.toFixed(1)}%</Badge>
        </View>

        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-slate-400 text-xs mb-1">PAYE Tax</Text>
            <Text className="text-red-300 text-base font-bold">
              ₵{formatCurrency(breakdown.paye)}
            </Text>
          </View>
          <Badge tone="danger">{payePct.toFixed(1)}%</Badge>
        </View>

        <View className="h-px bg-white/10 my-2" />

        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-slate-400 text-xs mb-1">Net Take-Home</Text>
            <Text className="text-emerald-500 text-base font-bold">
              ₵{formatCurrency(breakdown.netTakeHome)}
            </Text>
          </View>
          <Badge tone="success">{netPct.toFixed(1)}%</Badge>
        </View>
      </View>
    </Card>
  );
}

