import { ReactNode } from 'react';
import { Text, View, ViewProps } from 'react-native';

type Props = ViewProps & {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'danger';
};

const toneClasses = {
  neutral: 'bg-slate-400/20 border-slate-400/30',
  success: 'bg-emerald-500/15 border-emerald-500/30',
  danger: 'bg-red-500/15 border-red-400/30',
};

const textToneClasses = {
  neutral: 'text-slate-200',
  success: 'text-emerald-400',
  danger: 'text-red-300',
};

export function Badge({ children, tone = 'neutral', style, className, ...rest }: Props) {
  return (
    <View
      {...rest}
      className={`px-3 py-1.5 rounded-full border ${toneClasses[tone]} ${className ?? ''}`}
      style={style}
    >
      <Text className={`text-xs font-medium ${textToneClasses[tone]}`}>
        {children}
      </Text>
    </View>
  );
}


