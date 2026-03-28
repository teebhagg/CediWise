import { FeatureLockSheet } from '@/components/FeatureLockSheet';
import { useTierContext } from '@/contexts/TierContext';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ChevronRight, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

interface BudgetToolsCardProps {
  visible: boolean;
}

type LockedFeature = {
  name: string;
  description: string;
  highlights: string[];
};

const LOCKED_FEATURES: Record<string, LockedFeature> = {
  '/recurring-expenses': {
    name: 'Recurring Expenses',
    description: 'Track subscriptions, rent, and other recurring payments. Auto-deducts from your budget each cycle.',
    highlights: [
      'Auto-allocate from each budget cycle',
      'Monthly recurring totals',
      'Never forget a subscription again',
    ],
  },
  '/debt-dashboard': {
    name: 'Debt Dashboard',
    description: 'Track all debts, record payments, and see payoff projections. Know exactly when you\'ll be debt-free.',
    highlights: [
      'Total debt overview at a glance',
      'Payoff date projections',
      'Interest savings calculator',
    ],
  },
};

export function BudgetToolsCard({ visible }: BudgetToolsCardProps) {
  const router = useRouter();
  const { canAccessBudget } = useTierContext();
  const [lockedFeature, setLockedFeature] = useState<LockedFeature | null>(null);

  if (!visible) return null;

  const handlePress = (path: '/recurring-expenses' | '/debt-dashboard' | '/budget-templates') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });

    if (!canAccessBudget && LOCKED_FEATURES[path]) {
      setLockedFeature(LOCKED_FEATURES[path]);
      return;
    }

    router.push(path);
  };

  const links: { path: '/recurring-expenses' | '/debt-dashboard' | '/budget-templates'; label: string }[] = [
    { path: '/recurring-expenses', label: 'Recurring' },
    { path: '/debt-dashboard', label: 'Debt' },
    { path: '/budget-templates', label: 'Templates' },
  ];

  return (
    <>
      <View className="flex-row flex-wrap gap-2">
        {links.map(({ path, label }) => {
          const isLocked = !canAccessBudget && !!LOCKED_FEATURES[path];
          return (
            <Pressable
              key={path}
              onPress={() => handlePress(path)}
              className={`flex-row items-center gap-1.5 px-3 py-2 rounded-full border active:opacity-70 ${
                isLocked
                  ? 'bg-slate-500/10 border-slate-400/15 opacity-50'
                  : 'bg-slate-500/15 border-slate-400/25'
              }`}
            >
              {isLocked && <Lock color="#6B7280" size={12} />}
              <Text className={`font-medium text-sm ${isLocked ? 'text-slate-500' : 'text-slate-200'}`}>
                {label}
              </Text>
              <ChevronRight color={isLocked ? '#4B5563' : '#94A3B8'} size={14} />
            </Pressable>
          );
        })}
      </View>

      <FeatureLockSheet
        isOpen={lockedFeature !== null}
        onOpenChange={(open) => {
          if (!open) setLockedFeature(null);
        }}
        featureName={lockedFeature?.name ?? ''}
        featureDescription={lockedFeature?.description ?? ''}
        tierRequired="budget"
        highlights={lockedFeature?.highlights}
      />
    </>
  );
}
