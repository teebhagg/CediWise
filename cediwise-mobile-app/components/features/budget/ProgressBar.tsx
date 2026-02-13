import { View } from 'react-native';

interface ProgressBarProps {
  value: number;
}

export function ProgressBar({ value }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View className="h-2.5 rounded-full bg-slate-400/20 overflow-hidden">
      <View className="h-full bg-emerald-500/60" style={{ width: `${clamped * 100}%` }} />
    </View>
  );
}
