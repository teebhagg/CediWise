import { GlassView } from "@/components/GlassView";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollShadow, Separator } from "heroui-native";
import { X } from "lucide-react-native";
import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { Animated, Keyboard, Modal, PanResponder, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardCenteringScrollView } from "./KeyboardCenteringScrollView";

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

type CustomBottomSheetProps = {
  title: string;
  description?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerComponent?: React.ReactNode;
  children: React.ReactNode;
};

export function CustomBottomSheet({
  title,
  description,
  isOpen: controlledIsOpen,
  onOpenChange,
  triggerComponent,
  children,
}: CustomBottomSheetProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const animatedKeyboardHeight = useRef(new Animated.Value(0)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Keep track of frozen keyboard state during close animation
  const frozenKeyboardHeight = useRef(0);

  const insets = useSafeAreaInsets();

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleOpenChange = (open: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(open);
    }
    onOpenChange?.(open);
  };

  const closeSheet = () => {
    // Freeze keyboard state to prevent layout shifts during close
    frozenKeyboardHeight.current = keyboardHeight;
    setIsClosing(true);
    setKeyboardVisible(false);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(panY, {
        toValue: 1000,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setModalVisible(false);
        setIsClosing(false);
        handleOpenChange(false);
      }
    });
  };

  const closeSheetRef = useRef(closeSheet);
  useEffect(() => {
    closeSheetRef.current = closeSheet;
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // Reset offset to current value to avoid jumps
        panY.setOffset(0);
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow downward movement (positive dy)
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Updated threshold: 250px (as requested) or a sharp flick (0.5 velocity)
        if (gestureState.dy > 250 || gestureState.vy > 0.5) {
          closeSheetRef.current();
        } else {
          // Flatten the offset before spring-back
          panY.flattenOffset();
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        panY.flattenOffset();
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (isOpen) {
      setModalVisible(true);
      panY.setValue(600);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(panY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 90,
          mass: 1,
        }),
      ]).start();
    } else if (modalVisible) {
      closeSheet();
    }
  }, [isOpen]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        if (isClosing) return; // Ignore keyboard events during close animation
        frozenKeyboardHeight.current = e.endCoordinates.height;
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
        Animated.timing(animatedKeyboardHeight, {
          toValue: e.endCoordinates.height,
          duration: e.duration || 250,
          useNativeDriver: false,
        }).start();
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      (e) => {
        if (isClosing) return; // Ignore keyboard events during close animation
        frozenKeyboardHeight.current = 0;
        setKeyboardVisible(false);
        setKeyboardHeight(0);
        Animated.timing(animatedKeyboardHeight, {
          toValue: 0,
          duration: e ? e.duration || 250 : 250,
          useNativeDriver: false,
        }).start();
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isClosing]);

  const renderTrigger = () => {
    if (!triggerComponent) return null;
    if (isValidElement(triggerComponent)) {
      return cloneElement(triggerComponent as React.ReactElement<any>, {
        onPress: (e: any) => {
          handleOpenChange(true);
          if ((triggerComponent.props as any).onPress) {
            (triggerComponent.props as any).onPress(e);
          }
        },
      });
    }
    return triggerComponent;
  };

  const backdropOpacity = panY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <>
      {renderTrigger()}
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => handleOpenChange(false)}
        animationType="none"
      >
        <AnimatedGlassView
          intensity={Platform.OS === 'ios' ? 10 : 0}
          tint="dark"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: Platform.OS === 'ios' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.65)',
              opacity: Animated.multiply(opacity, backdropOpacity)
            }
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => handleOpenChange(false)} />
        </AnimatedGlassView>
        <Animated.View
          style={[styles.keyboardContainer, { paddingBottom: animatedKeyboardHeight }]}
          pointerEvents="box-none"
        >
          <Animated.View
            className="rounded-t-[40px] bg-[rgba(18,22,33,1)] w-full"
            pointerEvents="auto"
            style={[
              {
                // Use frozen height during close to prevent layout shift
                maxHeight: isClosing ? 700 : (isKeyboardVisible ? '85%' : 700),
                paddingTop: 12,
                paddingBottom: isClosing ? Math.max(insets.bottom + 20, 20) : (isKeyboardVisible ? 20 : Math.max(insets.bottom + 20, 20)),
                flexShrink: 1,
                transform: [{ translateY: panY }]
              }
            ]}
          >
            <View
              {...panResponder.panHandlers}
              style={styles.panHandlerArea}
            >
              <View style={styles.dragPill} />
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <Text style={styles.titleText}>{title}</Text>
                  {description ? (
                    <Text style={styles.descriptionText}>{description}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={closeSheet}
                  style={styles.closeButton}
                  hitSlop={15}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <X size={20} color="#94a3b8" />
                </Pressable>
              </View>
            </View>
            <Separator />
            <ScrollShadow color="#121621" LinearGradientComponent={LinearGradient} className="shrink">
              <KeyboardCenteringScrollView
                keyboardHeight={keyboardHeight}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {children}
              </KeyboardCenteringScrollView>
            </ScrollShadow>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panHandlerArea: {
    width: '100%',
    alignItems: 'center',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  dragPill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 16,
  },
  titleRow: {
    flex: 1,
    paddingRight: 16,
  },
  titleText: {
    fontSize: 22,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: "Figtree-Regular",
    color: "#94a3b8",
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 25,
    flexGrow: 1,
  },
});
