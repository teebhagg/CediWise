import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/Card';
import { ProgressRing } from '@/components/ProgressRing';
import { SalaryInput } from '@/components/SalaryInput';
import { useAuth } from '@/hooks/useAuth';
import { useProfileVitals } from '@/hooks/useProfileVitals';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { computeGhanaTax2026Monthly } from '@/utils/ghanaTax';

const stripFormatting = (text: string) => text.replace(/[,₵\s]/g, '');
const toNumber = (s: string) => {
  const n = parseFloat(stripFormatting(s));
  return Number.isFinite(n) ? n : 0;
};

export default function SalaryCalculatorScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { vitals } = useProfileVitals(user?.id);
  const [salary, setSalary] = useState('');
  const [estimateTaxEnabled, setEstimateTaxEnabled] = useState(true);

  useEffect(() => {
    if (vitals?.setup_completed && (vitals.stable_salary ?? 0) > 0) {
      setSalary(String(vitals.stable_salary));
      setEstimateTaxEnabled(vitals.auto_tax ?? true);
    }
  }, [vitals?.setup_completed, vitals?.stable_salary, vitals?.auto_tax]);

  const gross = toNumber(salary);
  const breakdown = gross > 0
    ? computeGhanaTax2026Monthly(gross)
    : { ssnit: 0, paye: 0, netTakeHome: 0 };
  const net = estimateTaxEnabled ? breakdown.netTakeHome : gross;

  const handleToggleTax = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    setEstimateTaxEnabled((v) => !v);
  };

  const handleSaveToVitals = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    router.push('/vitals?mode=edit');
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: 'black' }}
      className="flex-1 bg-background"
    >
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View className="px-5 pt-3 pb-2 flex-row items-center justify-between">
          <BackButton onPress={() => router.back()} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-white text-xl font-bold">Tax & salary calculator</Text>
          <Text className="text-slate-400 text-sm mt-1">
            Estimate SSNIT and PAYE from your monthly gross salary.
          </Text>

          <View className="mt-6">
            <SalaryInput
              value={salary}
              onChangeText={setSalary}
              placeholder="0.00"
              label="Monthly gross salary (GHS)"
            />
          </View>

          <Pressable
            onPress={handleToggleTax}
            className={`min-h-[44px] px-3.5 py-3 rounded-[1.75rem] border mt-4 ${estimateTaxEnabled ? 'bg-emerald-500/20 border-emerald-500/35' : 'bg-slate-400/10 border-slate-400/25'}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            accessibilityRole="button"
            accessibilityLabel="Toggle tax estimation"
          >
            <Text className="text-slate-200 font-medium text-[13px]">
              Apply SSNIT & PAYE: {estimateTaxEnabled ? 'On' : 'Off'}
            </Text>
            <Text className="text-slate-400 text-xs mt-1.5">
              Turn off if your salary is already net.
            </Text>
          </Pressable>

          {gross > 0 && (
            <View className="mt-6">
              <ProgressRing
                salary={gross}
                breakdown={{
                  ssnit: estimateTaxEnabled ? breakdown.ssnit : 0,
                  paye: estimateTaxEnabled ? breakdown.paye : 0,
                  netTakeHome: net,
                  gross,
                }}
              />
            </View>
          )}

          <Card className="mt-6">
            <Text className="text-slate-400 text-xs">
              For educational purposes only. This is not financial, legal, or tax advice. Verify with GRA or a qualified advisor.
            </Text>
          </Card>

          {vitals?.setup_completed && (
            <Pressable
              onPress={handleSaveToVitals}
              className="mt-4 flex-row items-center justify-center min-h-[44px]"
              accessibilityRole="button"
              accessibilityLabel="Save to profile"
            >
              <Text className="text-emerald-400 text-sm font-medium">Save to profile →</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
