import * as Haptics from 'expo-haptics';
import { ChevronDown, LucideIcon, Trash2 } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { formatCurrency } from '../utils/formatCurrency';
import { Card } from './Card';

const AnimatedCard = Animated.createAnimatedComponent(Card);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedChevron = Animated.createAnimatedComponent(ChevronDown);

export type TransactionCardProps = {
  id: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  icon: LucideIcon;
  color: string;
  date?: string;
  description?: string;
  vat?: number;
  onRequestDelete?: () => void;
};

export function TransactionCard({
  id,
  category,
  amount,
  type,
  icon: Icon,
  color,
  date,
  description,
  vat,
  onRequestDelete,
}: TransactionCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const expandAnim = useSharedValue(0);
  const heightAnim = useSharedValue(80);

  const handlePress = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore haptics failure
    }

    setIsExpanded(!isExpanded);
    expandAnim.value = withTiming(isExpanded ? 0 : 1, { duration: 300 });
    heightAnim.value = withTiming(isExpanded ? 80 : 160, { duration: 300 });
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(expandAnim.value, [0, 1], [1, 1.02], Extrapolate.CLAMP),
      },
    ],
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(expandAnim.value, [0, 1], [0, 180])}deg`,
      },
    ],
  }));

  const detailsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandAnim.value, [0, 1], [0, 1], Extrapolate.CLAMP),
    maxHeight: interpolate(expandAnim.value, [0, 1], [0, 100], Extrapolate.CLAMP),
  }));

  const amountColor = type === 'income' ? '#22C55E' : '#FCA5A5';
  const amountPrefix = type === 'income' ? '+' : '-';
  const backgroundColor = `${color}15`; // 15% opacity

  const renderRightActions = () => (
    <View
      style={{
        width: 60,
        height: 60,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 50,
        marginHorizontal: 12,
        marginVertical: 12,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <Pressable
        onPress={() => {
          swipeableRef.current?.close();
          onRequestDelete?.();
        }}
        style={({ pressed }) => ({
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: pressed ? 'rgba(255,255,255,0.15)' : 'transparent',
          transform: pressed ? [{ scale: 0.95 }] : [{ scale: 1 }],
        })}
      >
        <Trash2 color="#FFF" size={24} />
        {/* <Text style={{ color: '#FFF', fontWeight: '700', letterSpacing: 0.4 }}>
          Remove
        </Text> */}
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      friction={0.6}
      overshootFriction={12}
      leftThreshold={16}
      renderRightActions={renderRightActions}
    >
      <AnimatedCard
        blurred={true}
        style={[
          cardAnimatedStyle,
          {
            width: '100%',
            backgroundColor,
            marginBottom: 12,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 }}>
          {/* Icon */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: `${color}30`,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Icon color={color} size={24} />
          </View>

          {/* Category and Amount */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#E5E7EB',
                fontSize: 14,
                fontWeight: '600',
                fontFamily: 'Figtree-Medium',
                marginBottom: 4,
              }}
            >
              {category}
            </Text>
            {date && (
              <Text
                style={{
                  color: '#9CA3AF',
                  fontSize: 11,
                  fontFamily: 'Figtree-Regular',
                }}
              >
                {date}
              </Text>
            )}
          </View>

          {/* Amount */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                color: amountColor,
                fontSize: 16,
                fontWeight: '700',
                fontFamily: 'Figtree-Bold',
                marginLeft: 12,
              }}
            >
              {amountPrefix}₵{formatCurrency(amount)}
            </Text>
            <AnimatedView style={[chevronStyle, { marginLeft: 6 }]}>
              <Pressable
                onPress={handlePress}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <AnimatedChevron color="#94A3AF" size={20} />
              </Pressable>
            </AnimatedView>
          </View>
        </View>

        {/* Expandable Details */}
        {isExpanded && (
          <AnimatedView
            style={[
              detailsAnimatedStyle,
              {
                borderTopWidth: 1,
                borderTopColor: 'rgba(255,255,255,0.1)',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: 'rgba(18,22,33,0.4)',
              },
            ]}
          >
            {description && (
              <View style={{ marginBottom: 8 }}>
                <Text
                  style={{
                    color: '#9CA3AF',
                    fontSize: 11,
                    fontFamily: 'Figtree-Regular',
                    marginBottom: 2,
                  }}
                >
                  Description
                </Text>
                <Text
                  style={{
                    color: '#E5E7EB',
                    fontSize: 13,
                    fontFamily: 'Figtree-Regular',
                  }}
                >
                  {description}
                </Text>
              </View>
            )}
            {vat !== undefined && (
              <View>
                <Text
                  style={{
                    color: '#9CA3AF',
                    fontSize: 11,
                    fontFamily: 'Figtree-Regular',
                    marginBottom: 2,
                  }}
                >
                  VAT (20%)
                </Text>
                <Text
                  style={{
                    color: '#FCA5A5',
                    fontSize: 13,
                    fontFamily: 'Figtree-Medium',
                  }}
                >
                  ₵{formatCurrency(vat)}
                </Text>
              </View>
            )}
          </AnimatedView>
        )}
      </AnimatedCard>
    </Swipeable>
  );
}

