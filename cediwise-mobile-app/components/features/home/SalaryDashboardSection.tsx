import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { formatCurrency } from '../../../utils/formatCurrency';
import { Card } from '../../Card';
import { ProgressRing } from '../../ProgressRing';
import { SalaryInput } from '../../SalaryInput';
import type { IncomeTaxSummary } from './types';

export interface ProfileVitalsSnapshot {
  stable_salary?: number;
  auto_tax?: boolean;
  setup_completed?: boolean;
}

export interface SalaryDashboardSectionProps {
  incomeTaxSummary: IncomeTaxSummary;
  salary: string;
  onSalaryChange: (value: string) => void;
  estimateTaxEnabled: boolean;
  onToggleTaxEstimate: () => void;
  vitals: ProfileVitalsSnapshot | null;
  animatedStyle?: StyleProp<ViewStyle>;
}

const AnimatedView = Animated.createAnimatedComponent(View);

function SalaryDashboardSectionInner({
  incomeTaxSummary,
  salary,
  onSalaryChange,
  estimateTaxEnabled,
  onToggleTaxEstimate,
  vitals,
  animatedStyle,
}: SalaryDashboardSectionProps) {
  const router = useRouter();

  const handleToggleTax = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    onToggleTaxEstimate();
  }, [onToggleTaxEstimate]);

  const sectionTitle =
    incomeTaxSummary.mode === 'sources'
      ? 'Income & Taxes'
      : incomeTaxSummary.mode === 'vitals'
        ? 'Salary (from vitals)'
        : 'Salary Calculator';

  const sectionSubtitle =
    incomeTaxSummary.mode === 'sources'
      ? 'Taxes are optional per income source, with a global estimate switch.'
      : incomeTaxSummary.mode === 'vitals'
        ? 'This is your saved salary. Update it from Personalization settings.'
        : 'Enter your gross salary to compute SSNIT, PAYE, and net take-home.';

  return (
    <AnimatedView style={animatedStyle} className="mb-7">
      <View className="mb-4">
        <Text className="text-white text-lg font-semibold mb-2">{sectionTitle}</Text>
        <Text className="text-slate-400 text-xs">{sectionSubtitle}</Text>
      </View>

      <Pressable
        onPress={handleToggleTax}
        className={`min-h-[44px] px-3.5 py-3 rounded-[1.75rem] border mb-3 ${estimateTaxEnabled
            ? 'bg-emerald-500/20 border-emerald-500/35'
            : 'bg-slate-400/10 border-slate-400/25'
          }`}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="Toggle tax estimation"
      >
        <Text className="text-slate-200 font-medium text-[13px]">
          Tax estimate: {estimateTaxEnabled ? 'On' : 'Off'}
        </Text>
        <Text className="text-slate-400 text-xs mt-1.5">
          Per-income &quot;Apply deductions&quot; settings still control what&apos;s treated as taxable.
        </Text>
      </Pressable>

      {incomeTaxSummary.mode === 'manual' ? (
        <SalaryInput
          value={salary}
          onChangeText={onSalaryChange}
          placeholder="0.00"
          label="Monthly Salary"
        />
      ) : incomeTaxSummary.mode === 'vitals' ? (
        <Card>
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-slate-200 font-medium text-sm">Monthly Basic Salary</Text>
              <Text className="text-slate-400 text-xs mt-1">
                Apply deductions: {vitals?.auto_tax ? 'On' : 'Off'}
              </Text>
            </View>
            <Text className="text-slate-200 font-bold text-lg">
              ₵{formatCurrency(incomeTaxSummary.gross)}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/vitals?mode=edit')} className="mt-3.5">
            <Text className="text-slate-400 text-xs">Edit vitals →</Text>
          </Pressable>
        </Card>
      ) : (
        <Card>
          <Text className="text-slate-200 font-medium text-sm">Income sources</Text>
          <Text className="text-slate-500 text-xs mt-1.5">
            Some income can be non-taxable. We respect your per-income settings.
          </Text>

          <View className="mt-3.5 gap-3">
            {incomeTaxSummary.breakdowns.map(({ src, taxable }) => (
              <View key={src.id} className="flex-row justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-slate-200 font-medium">{src.name}</Text>
                  <Text className="text-slate-500 text-xs mt-0.5">
                    {src.type === 'primary' ? 'Primary' : 'Side'} •{' '}
                    {taxable ? 'Taxed' : 'Not taxed'}
                  </Text>
                </View>
                <Text className="text-slate-200 font-bold">₵{formatCurrency(src.amount)}</Text>
              </View>
            ))}
          </View>

          <Pressable onPress={() => router.push('/budget')} className="mt-3.5">
            <Text className="text-slate-400 text-xs">Edit income sources →</Text>
          </Pressable>
        </Card>
      )}

      {incomeTaxSummary.gross > 0 && (
        <View className="mt-5">
          <ProgressRing
            salary={incomeTaxSummary.gross}
            breakdown={{
              ssnit: incomeTaxSummary.totalSsnit,
              paye: incomeTaxSummary.totalPaye,
              netTakeHome: incomeTaxSummary.net,
              gross: incomeTaxSummary.gross,
            }}
          />
        </View>
      )}
    </AnimatedView>
  );
}

export const SalaryDashboardSection = memo(SalaryDashboardSectionInner);
