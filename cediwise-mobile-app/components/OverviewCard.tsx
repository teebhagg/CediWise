import { ReactNode } from 'react';
import { View } from 'react-native';
import { Badge } from './Badge';
import { Card } from './Card';
import { Surface } from 'heroui-native';
import { Typography } from './typography';

type OverviewCardProps = {
  label: string;
  amount: string;
  currency?: string;
  badge?: {
    text: string;
    tone: 'neutral' | 'success' | 'danger';
  };
  icon?: ReactNode;
};

export function OverviewCard({
  label,
  amount,
  currency = '₵',
  badge,
  icon,
}: OverviewCardProps) {
  return (
    <Card blurred={true} className="w-full">
      <View className={`flex-row justify-between items-start ${badge ? 'mb-3' : ''}`}>
        <View className="flex-1">
          <Typography variant="label" className="text-slate-400 mb-2 text-[13px]">
            {label}
          </Typography>
          <View className="flex-row items-baseline">
            <Typography variant="heading" className="text-slate-200 text-[28px]">
              {currency}
            </Typography>
            <Typography variant="heading" className="text-slate-200 text-[32px] ml-1">
              {amount}
            </Typography>
          </View>
        </View>
        {icon && <View className="ml-3">{icon}</View>}
      </View>
      {badge && (
        <Badge tone={badge.tone} className="mt-2 self-start">
          {badge.text}
        </Badge>
      )}
    </Card>
  );
}

