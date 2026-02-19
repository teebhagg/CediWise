import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { BlurView } from "expo-blur";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef
} from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

type GlassBottomSheetProps = {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  initialIndex?: number;
  onClose?: () => void;
  /** Resize sheet when keyboard opens. Use "extend" for forms with inputs. */
  keyboardBehavior?: "extend" | "fillParent" | "interactive";
  /** Behavior when keyboard is dismissed */
  keyboardBlurBehavior?: "none" | "restore";
};

export type GlassBottomSheetHandle = {
  expand: () => void;
  collapse: () => void;
  close: () => void;
  snapToIndex: (index: number) => void;
};

export const GlassBottomSheet = forwardRef<
  GlassBottomSheetHandle,
  GlassBottomSheetProps
>(({ children, snapPoints = ["40%"], initialIndex = -1, onClose, keyboardBehavior, keyboardBlurBehavior = "restore" }, ref) => {
  const innerRef = useRef<BottomSheet>(null);

  useImperativeHandle(ref, () => ({
    expand: () => innerRef.current?.expand(),
    collapse: () => innerRef.current?.collapse(),
    close: () => innerRef.current?.close(),
    snapToIndex: (i: number) => innerRef.current?.snapToIndex(i),
  }));

  const snap = useMemo(() => snapPoints, [snapPoints]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1 && onClose) onClose();
    },
    [onClose]
  );

  return (
    <BottomSheet
      ref={innerRef}
      index={initialIndex}
      // snapPoints={snap}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onChange={handleSheetChanges}
      backgroundStyle={styles.transparent}
      // handleIndicatorStyle={styles.indicator}
      {...(keyboardBehavior && {
        keyboardBehavior,
        keyboardBlurBehavior,
      })}
    >
      <BottomSheetView style={styles.contentContainer}>
        <BlurView intensity={70} tint="dark" style={styles.blurContainer}>
          <View style={styles.glassCard}>
            {/* Indicator */}
            <View style={styles.indicatorContainer}>
              <View style={styles.indicator} />
            </View>
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={{ flex: 1 }}
            >
              {children}
            </Animated.View>
          </View>
        </BlurView>
      </BottomSheetView>
    </BottomSheet>
  );
});

GlassBottomSheet.displayName = "GlassBottomSheet";

const styles = StyleSheet.create({
  transparent: { backgroundColor: "transparent" },
  indicatorContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  indicator: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1,
    marginHorizontal: 20,
    paddingBottom: 20,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 40,
    overflow: "hidden",
  },
  glassCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 40,
    padding: 20,
  },
});
