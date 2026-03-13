import { Text, View } from 'react-native';
import { CategoryIcon } from '@/components/CategoryIcon';
import { formatCurrency } from '@/utils/formatCurrency';
import type { CategoryBreakdown } from './insightsData';

export function CategoryBreakdownRow({ item }: { item: CategoryBreakdown }) {
  return (
    <View className="flex-row items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <View className="min-w-0 flex-1 flex-row items-center gap-3" style={{ flexShrink: 1 }}>
        <CategoryIcon icon={item.icon} size={36} backgroundColor={item.color} />
        <View className="min-w-0 flex-1">
          <Text className="text-white text-sm font-semibold" numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text className="text-white text-xs">
            {item.count} transaction{item.count === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
      <View className="items-end" style={{ flexShrink: 0, minWidth: 72 }}>
        <Text
          className="text-white text-sm font-semibold"
          numberOfLines={1}
          ellipsizeMode="tail">
          -{formatCurrency(item.amount)}
        </Text>
        <Text className="text-white text-xs" numberOfLines={1} ellipsizeMode="tail">
          {Math.round(item.percent * 100)}%
        </Text>
      </View>
    </View>
  );
}
