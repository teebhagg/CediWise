import { Pressable, View } from 'react-native';
import { BarChart3, Activity, PieChart } from 'lucide-react-native';

export type ChartType = 'bar' | 'line' | 'donut';

type Props = {
  value: ChartType;
  onChange: (value: ChartType) => void;
};

const ICONS: { key: ChartType; Icon: typeof BarChart3 }[] = [
  { key: 'line', Icon: Activity },
  { key: 'bar', Icon: BarChart3 },
  { key: 'donut', Icon: PieChart },
];

export function InsightsChartToggle({ value, onChange }: Props) {
  return (
    <View className="flex-row items-center bg-white/10 rounded-full p-1">
      {ICONS.map(({ key, Icon }) => {
        const active = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            className={`h-11 w-11 items-center justify-center rounded-full ${active ? 'bg-emerald-500/20' : ''}`}
            accessibilityRole="button"
            accessibilityLabel={`Show ${key} chart`}
          >
            <Icon size={18} color={active ? '#10b981' : '#ffffff'} />
          </Pressable>
        );
      })}
    </View>
  );
}
