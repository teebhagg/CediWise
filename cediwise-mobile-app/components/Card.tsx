import { GlassView } from '@/components/GlassView';
import { Surface } from 'heroui-native';
import { ReactNode } from 'react';
import { ViewProps } from 'react-native';

type CardProps = ViewProps & {
  children: ReactNode;
  blurred?: boolean;
};

const cardBaseClass = 'rounded bg-[rgba(18,22,33,0.9)] p-5';

export function Card({ children, style, className, blurred = true, ...rest }: CardProps) {
  const content = (
    <Surface variant='tertiary' {...rest} className={className ? `${cardBaseClass} ${className}` : cardBaseClass} style={style}>
      {children}
    </Surface>
  );

  if (!blurred) {
    return content;
  }

  return (
    <GlassView intensity={30} tint="dark" className="rounded-lg overflow-hidden">
      {content}
    </GlassView>
  );
}


