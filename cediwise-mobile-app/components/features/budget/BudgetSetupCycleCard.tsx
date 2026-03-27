import { memo, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppTextField } from '../../AppTextField';
import { Card } from '../../Card';
import { PrimaryButton } from '../../PrimaryButton';

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

interface BudgetSetupCycleCardProps {
  salary: string;
  onSalaryChange: (v: string) => void;
  salaryError: string | null;
  applyDeductions: boolean;
  onApplyDeductionsChange: (v: boolean) => void;
  paydayDay: string;
  cycleDayError: string | null;
  onPaydayChange: (v: string) => void;
  onCreateBudget: () => Promise<void>;
}

export const BudgetSetupCycleCard = memo(function BudgetSetupCycleCard({
  salary,
  onSalaryChange,
  salaryError,
  applyDeductions,
  onApplyDeductionsChange,
  paydayDay,
  cycleDayError,
  onPaydayChange,
  onCreateBudget,
}: BudgetSetupCycleCardProps) {
  const [paydayOpen, setPaydayOpen] = useState(false);
  const expand = useSharedValue(0);

  useEffect(() => {
    expand.value = withTiming(paydayOpen ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [expand, paydayOpen]);

  const dropdownAnimStyle = useAnimatedStyle(() => ({
    maxHeight: 320 * expand.value,
    opacity: expand.value,
    marginTop: 8 * expand.value,
    transform: [{ translateY: (1 - expand.value) * -8 }],
    overflow: 'hidden',
  }));

  const selectedDay = parseInt(paydayDay || '25', 10);

  return (
    <Card className="">
      <Text className="text-white text-lg font-semibold">Start your budget</Text>
      <Text className="text-muted-foreground text-sm mt-1">
        Set your monthly take-home Pay and payday to get started. 
      </Text>

      <View className="mt-4 gap-4">
        {/* Salary Input */}
        <View>
          <AppTextField
            label="Monthly Salary (GHS)"
            value={salary}
            onChangeText={onSalaryChange}
            keyboardType="decimal-pad"
            placeholder="e.g. 5000"
            error={salaryError ?? undefined}
          />
          <Pressable 
            onPress={() => onApplyDeductionsChange(!applyDeductions)}
            className="flex-row items-center gap-2 mt-2 self-start"
          >
            <View className={`w-5 h-5 rounded border items-center justify-center ${applyDeductions ? 'bg-emerald-500 border-emerald-500' : 'border-slate-400'}`}>
              {applyDeductions && <Text className="text-[10px] text-slate-950 font-bold">✓</Text>}
            </View>
            <Text className="text-slate-400 text-xs">Apply SSNIT + Tax deductions</Text>
          </Pressable>
        </View>

        {/* Payday Selector */}
        <View>
          <Text className="text-slate-400 font-medium text-xs mb-2">Payday Day</Text>
          <Pressable
            onPress={() => setPaydayOpen((prev) => !prev)}
            className="h-12 rounded-xl border border-slate-400/30 bg-slate-500/10 px-4 flex-row items-center justify-between active:bg-slate-500/20"
          >
            <Text className="text-slate-200 font-medium">
              Day {selectedDay} of each month
            </Text>
            <Text className="text-slate-400 text-xs">
              {paydayOpen ? 'Hide' : 'Change'}
            </Text>
          </Pressable>
          
          <Animated.View style={dropdownAnimStyle}>
            <View className="flex-row flex-wrap gap-2 pt-1">
              {DAY_OPTIONS.map((day) => {
                const isSelected = selectedDay === day;
                return (
                  <Pressable
                    key={day}
                    onPress={() => {
                      onPaydayChange(day.toString());
                      setPaydayOpen(false);
                    }}
                    className={`min-w-[42px] px-2 py-2 rounded-lg border items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : 'bg-slate-500/10 border-slate-400/20'
                    }`}
                  >
                    <Text className={`text-xs font-medium ${isSelected ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
          {cycleDayError ? (
            <Text className="text-red-400 text-xs mt-1.5">{cycleDayError}</Text>
          ) : null}
        </View>

        <PrimaryButton 
          onPress={onCreateBudget} 
          disabled={!!cycleDayError || !!salaryError || !salary}
          className="mt-2"
        >
          Create budget
        </PrimaryButton>
      </View>
    </Card>
  );
});
