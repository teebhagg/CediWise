import { Text, TextProps } from 'react-native';

type Variant = 'heading' | 'body' | 'label';

type TypographyProps = TextProps & {
  variant?: Variant;
  className?: string;
};

const getFontForVariant = (variant: Variant) => {
  switch (variant) {
    case 'heading':
      return 'Figtree-Bold';
    case 'label':
      return 'Figtree-Medium';
    case 'body':
    default:
      return 'Figtree-Regular';
  }
};

export function Typography({ variant = 'body', style, className, ...rest }: TypographyProps) {
  return (
    <Text
      {...rest}
      className={className}
      style={[
        { fontFamily: getFontForVariant(variant), letterSpacing: variant === 'body' ? -0.02 : 0 },
        style,
      ]}
    />
  );
}


