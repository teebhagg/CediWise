import { Text, View } from 'react-native';
import { AppTextField } from '../../AppTextField';
import { Card } from '../../Card';
import { PrimaryButton } from '../../PrimaryButton';

interface BudgetSetupCycleCardProps {
  paydayDay: string;
  cycleDayError: string | null;
  onPaydayChange: (v: string) => void;
  onCreateBudget: () => Promise<void>;
}

export function BudgetSetupCycleCard({
  paydayDay,
  cycleDayError,
  onPaydayChange,
  onCreateBudget,
}: BudgetSetupCycleCardProps) {
  return (
    <Card className="">
      <Text className="text-white text-lg font-semibold">Setup your budget cycle</Text>
      <Text className="text-muted-foreground text-sm mt-1">
        Choose the day you usually get paid. We&apos;ll build a monthly cycle from that.
      </Text>

      <View className="mt-3.5 gap-2.5">
        <AppTextField
          label="Payday day (1–31)"
          value={paydayDay}
          onChangeText={onPaydayChange}
          keyboardType="number-pad"
          placeholder="25"
          error={cycleDayError ?? undefined}
        />

        <PrimaryButton onPress={onCreateBudget} disabled={!!cycleDayError}>
          Create budget
        </PrimaryButton>
      </View>
    </Card>
  );
}
