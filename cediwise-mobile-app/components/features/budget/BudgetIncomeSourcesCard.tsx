import * as Haptics from 'expo-haptics';
import { Pencil, Plus, Trash2 } from 'lucide-react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { formatCurrency } from '../../../utils/formatCurrency';
import { AppTextField } from '../../AppTextField';
import { Card } from '../../Card';
import { PrimaryButton } from '../../PrimaryButton';
import { BucketChip } from './BucketChip';

interface IncomeSource {
  id: string;
  name: string;
  type: 'primary' | 'side';
  amount: number;
  applyDeductions: boolean;
}

interface BudgetIncomeSourcesCardProps {
  cycleIsSet: boolean;
  showIncomeForm: boolean;
  incomeToggleChevronStyle?: StyleProp<ViewStyle>;
  onToggleIncomeForm: () => void;
  incomeName: string;
  setIncomeName: (v: string) => void;
  incomeType: 'primary' | 'side';
  setIncomeType: (v: 'primary' | 'side') => void;
  incomeAmount: string;
  setIncomeAmount: (v: string) => void;
  applyDeductions: boolean;
  setApplyDeductions: (v: boolean) => void;
  incomeSources: IncomeSource[];
  incomeAccentColors: string[];
  onAddIncome: () => Promise<void>;
  onEditIncome: (src: IncomeSource) => void;
  onDeleteIncome: (src: { id: string; name: string }) => void;
}

export function BudgetIncomeSourcesCard({
  cycleIsSet,
  showIncomeForm,
  incomeToggleChevronStyle,
  onToggleIncomeForm,
  incomeName,
  setIncomeName,
  incomeType,
  setIncomeType,
  incomeAmount,
  setIncomeAmount,
  applyDeductions,
  setApplyDeductions,
  incomeSources,
  incomeAccentColors,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
}: BudgetIncomeSourcesCardProps) {
  return (
    <Card className="">
      <View className="flex-row justify-between items-center gap-3">
        <View className="flex-1">
          <Text className="text-white text-lg font-semibold">Income sources</Text>
          <Text className="text-muted-foreground text-sm mt-1">
            Keep salary + hustles here so allocations stay realistic.
          </Text>
        </View>
        <Pressable
          onPress={onToggleIncomeForm}
          accessibilityRole="button"
          accessibilityLabel={showIncomeForm ? 'Hide income form' : 'Add income source'}
          className={`w-9 h-9 rounded-full justify-center items-center border ${showIncomeForm ? 'border-sky-500/60 bg-sky-500/30' : 'border-sky-500/40 bg-sky-500/20'
            } active:bg-sky-500/40`}
          style={({ pressed }) => (Platform.OS === 'android' ? { elevation: pressed ? 6 : 3 } : undefined)}
        >
          <Animated.View style={incomeToggleChevronStyle}>
            <Plus size={16} color="#E0F2FE" />
          </Animated.View>
        </Pressable>
      </View>

      {showIncomeForm && (
        <View className="mt-3.5 gap-2.5">
          <AppTextField
            label="Name"
            value={incomeName}
            onChangeText={setIncomeName}
            placeholder="Primary Salary"
            returnKeyType="done"
          />

          <Text className="text-slate-400 font-medium text-xs uppercase tracking-wide">Type</Text>
          <View className="flex-row gap-2.5">
            <BucketChip
              label="Primary"
              active={incomeType === 'primary'}
              onPress={() => cycleIsSet && setIncomeType('primary')}
            />
            <BucketChip
              label="Side"
              active={incomeType === 'side'}
              onPress={() => cycleIsSet && setIncomeType('side')}
            />
          </View>

          {incomeType === 'primary' ? (
            <Pressable
              onPress={() => setApplyDeductions(!applyDeductions)}
              className={`mt-0.5 px-3 py-3 rounded-2xl border ${applyDeductions
                ? 'bg-emerald-500/20 border-emerald-500/35'
                : 'bg-slate-400/10 border-slate-400/25'
                }`}
            >
              <Text className="text-slate-200 font-medium text-[13px]">
                Apply SSNIT/PAYE deductions: {applyDeductions ? 'On' : 'Off'}
              </Text>
            </Pressable>
          ) : null}

          <AppTextField
            label="Monthly amount (GHS)"
            value={incomeAmount}
            onChangeText={setIncomeAmount}
            editable={cycleIsSet}
            keyboardType="decimal-pad"
            placeholder="0.00"
            inputClassName={cycleIsSet ? '' : 'opacity-50'}
          />

          <PrimaryButton onPress={onAddIncome} disabled={!cycleIsSet}>
            Add income
          </PrimaryButton>
        </View>
      )}

      {incomeSources.length > 0 ? (
        <View className="mt-3 gap-3">
          {incomeSources.slice(0, 5).map((src, idx) => {
            const accent = incomeAccentColors[idx % incomeAccentColors.length];
            return (
              <View
                key={src.id}
                className="rounded-[20px] p-3.5 border bg-slate-950/95"
                style={{ borderColor: `${accent}40` }}
              >
                {/* TODO: Add edit and delete buttons */}
                <View className="absolute top-2.5 right-2.5 flex-row gap-2.5">
                  <Pressable
                    onPress={async () => {
                      if (!cycleIsSet) return;
                      try { await Haptics.selectionAsync(); } catch { /* ignore */ }
                      onEditIncome(src);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${src.name}`}
                    className={`w-9 h-9 rounded-full justify-center items-center bg-slate-400/20 border border-slate-400/25 active:bg-slate-400/30 ${cycleIsSet ? 'opacity-100' : 'opacity-40'
                      }`}
                  >
                    <Pencil size={16} color="#CBD5F5" />
                  </Pressable>

                  <Pressable
                    onPress={async () => {
                      if (!cycleIsSet) return;
                      try { await Haptics.selectionAsync(); } catch { /* ignore */ }
                      onDeleteIncome({ id: src.id, name: src.name });
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${src.name}`}
                    className={`w-9 h-9 rounded-full justify-center items-center bg-red-500/20 border border-red-500/25 active:bg-red-500/30 ${cycleIsSet ? 'opacity-100' : 'opacity-40'
                      }`}
                  >
                    <Trash2 size={16} color="#FCA5A5" />
                  </Pressable>
                </View>
                <View className="flex-row justify-between items-start gap-2.5">
                  <View className="flex-1 pr-11">
                    <Text className="text-slate-200 font-medium text-[15px]">{src.name}</Text>
                    <View className="flex-row flex-wrap gap-2 mt-1.5">
                      <View
                        className="px-2.5 py-1.5 rounded-full border"
                        style={{ backgroundColor: `${accent}20`, borderColor: `${accent}40` }}
                      >
                        <Text className="text-slate-200 font-medium text-xs">
                          {src.type === 'primary' ? 'Primary' : 'Side'}
                        </Text>
                      </View>
                      {src.type === 'primary' ? (
                        <View className="px-2.5 py-1.5 rounded-full bg-slate-400/20 border border-slate-400/25">
                          <Text className="text-slate-300 font-medium text-xs">
                            Deductions: {src.applyDeductions ? 'On' : 'Off'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View className="items-end justify-between min-h-[110px]">
                    <View />
                    <View className="items-end">
                      <Text className="font-bold text-base" style={{ color: accent }}>
                        ₵{formatCurrency(src.amount)}
                      </Text>
                      <Text className="text-slate-500 text-xs mt-1">per month</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </Card>
  );
}
