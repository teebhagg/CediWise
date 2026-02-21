import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

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

  const links: { path: '/recurring-expenses' | '/debt-dashboard' | '/budget-templates'; label: string }[] = [
    { path: '/recurring-expenses', label: 'Recurring' },
    { path: '/debt-dashboard', label: 'Debt' },
    { path: '/budget-templates', label: 'Templates' },
  ];

  return (
    <View className="flex-row flex-wrap gap-2">
      {links.map(({ path, label }) => (
        <Pressable
          key={path}
          onPress={() => handlePress(path)}
          className="flex-row items-center gap-1.5 px-3 py-2 rounded-full bg-slate-500/15 border border-slate-400/25 active:bg-slate-500/25"
        >
          <Text className="text-slate-200 font-medium text-sm">{label}</Text>
          <ChevronRight color="#94A3B8" size={14} />
        </Pressable>
      ))}
    </View>
  );
}
