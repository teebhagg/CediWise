import { Pressable, Text, View } from 'react-native';
import type { InsightsRangeKey } from './insightsData';

const OPTIONS: InsightsRangeKey[] = ['1W', '1M', '6M', '1Y'];

type Props = {
  value: InsightsRangeKey;
  onChange: (value: InsightsRangeKey) => void;
  onMorePress?: () => void;
};

export function InsightsRangeSelector({ value, onChange, onMorePress }: Props) {
  return (
    <View className="flex-row items-center">
      <View className="flex-1 flex-row items-center bg-white/10 rounded-full p-1">
        {OPTIONS.map((option) => {
          const active = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              className={`flex-1 h-11 items-center justify-center rounded-full ${active ? 'bg-emerald-500/20' : ''}`}
              accessibilityRole="button"
              accessibilityLabel={`Show ${option} range`}
            >
              <Text className={`text-sm font-medium ${active ? 'text-emerald-500' : 'text-white'}`}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {/* More range options – reserved for later use
      <Pressable
        onPress={onMorePress}
        className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
        accessibilityRole="button"
        accessibilityLabel="More range options"
      >
        <Text className="text-white text-lg">···</Text>
      </Pressable>
      */}
    </View>
  );
}
