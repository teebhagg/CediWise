import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { Card } from '../../Card';

interface BudgetToolsCardProps {
  visible: boolean;
}

export function BudgetToolsCard({ visible }: BudgetToolsCardProps) {
  const router = useRouter();

  if (!visible) return null;

  const handlePress = (path: '/recurring-expenses' | '/debt-dashboard' | '/budget-templates') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    router.push(path);
  };

  return (
    <Card className="">
      <Text className="text-white text-base font-semibold mb-3">Budget tools</Text>
      <View>
        <Pressable
          onPress={() => handlePress('/recurring-expenses')}
          className="py-3 flex-row items-center justify-between"
        >
          <Text className="text-slate-200 font-medium text-[15px]">Recurring Expenses</Text>
          <ChevronRight color="#94A3B8" size={16} />
        </Pressable>
        <View className="h-px bg-slate-400/20" />
        <Pressable
          onPress={() => handlePress('/debt-dashboard')}
          className="py-3 flex-row items-center justify-between"
        >
          <Text className="text-slate-200 font-medium text-[15px]">Debt Dashboard</Text>
          <ChevronRight color="#94A3B8" size={16} />
        </Pressable>
        <View className="h-px bg-slate-400/20" />
        <Pressable
          onPress={() => handlePress('/budget-templates')}
          className="py-3 flex-row items-center justify-between"
        >
          <Text className="text-slate-200 font-medium text-[15px]">Budget Templates</Text>
          <ChevronRight color="#94A3B8" size={16} />
        </Pressable>
      </View>
    </Card>
  );
}
