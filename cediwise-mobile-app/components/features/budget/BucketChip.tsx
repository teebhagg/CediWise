import { Pressable, Text } from 'react-native';

interface BucketChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export function BucketChip({ label, active, onPress }: BucketChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3 py-2.5 rounded-full border ${active ? 'bg-white/90 border-white/35' : 'bg-slate-400/20 border-slate-400/25'
        }`}
    >
      <Text
        className={
          active ? 'text-slate-900 font-medium text-[13px]' : 'text-slate-300 font-medium text-[13px]'
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
