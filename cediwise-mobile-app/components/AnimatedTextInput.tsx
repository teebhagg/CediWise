import { useEffect } from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

const AnimatedView = Animated.createAnimatedComponent(View);

export function AnimatedTextInput({ label, error, onFocus, onBlur, value, ...rest }: Props) {
  const scale = useSharedValue(1);
  const labelY = useSharedValue(0);
  const labelSize = useSharedValue(16);

  useEffect(() => {
    const hasValue = !!value;
    labelY.value = withTiming(hasValue ? -18 : 0, { duration: 160 });
    labelSize.value = withTiming(hasValue ? 12 : 16, { duration: 160 });
  }, [value, labelY, labelSize]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    top: labelY.value,
    fontSize: labelSize.value,
  }));

  return (
    <View style={{ marginBottom: 16 }}>
      <AnimatedView
        style={[
          {
            borderRadius: 16,
            borderWidth: 1,
            borderColor: error ? '#EF4444' : 'rgba(148,163,184,0.5)',
            paddingHorizontal: 16,
            paddingVertical: 12,
          },
          containerStyle,
        ]}
      >
        {label && <Animated.Text
          style={[
            {
              position: 'absolute',
              left: 16,
              color: error ? '#FCA5A5' : '#9CA3AF',
            },
            labelStyle,
          ]}
        >
          {label}
        </Animated.Text>}
        <TextInput
          {...rest}
          value={value}
          style={{
            color: '#E5E7EB',
            paddingTop: 8,
            paddingBottom: 0,
            fontSize: 16,
          }}
          onFocus={(e) => {
            scale.value = withTiming(1.02, { duration: 120 });
            labelY.value = withTiming(-18, { duration: 160 });
            labelSize.value = withTiming(12, { duration: 160 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            scale.value = withTiming(1, { duration: 120 });
            if (!value) {
              labelY.value = withTiming(0, { duration: 160 });
              labelSize.value = withTiming(16, { duration: 160 });
            }
            onBlur?.(e);
          }}
        />
      </AnimatedView>
      {error ? (
        <Text style={{ color: '#FCA5A5', fontSize: 12, marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}


