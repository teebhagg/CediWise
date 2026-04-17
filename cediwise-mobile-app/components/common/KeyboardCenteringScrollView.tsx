import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { ScrollView, ScrollViewProps, LayoutChangeEvent } from 'react-native';

type KeyboardCenteringContextType = {
  /** Call on TextInput focus to smoothly scroll that input into the center of the visible area. */
  scrollToCenter: (nodeRef: React.RefObject<any>) => void;
};

type KeyboardCenteringScrollViewProps = ScrollViewProps & {
  /**
   * Current keyboard height in pixels.
   * Required ONLY when the scroll view is inside a container that manually pads for
   * the keyboard (e.g. CustomBottomSheet). When the parent uses KeyboardAvoidingView
   * this is not needed: KAV already shrinks the layout, so onLayout gives the correct
   * reduced height automatically.
   */
  keyboardHeight?: number;
};

// Context that gives any child TextInput the ability to trigger centering.
const KeyboardCenteringContext =
  createContext<KeyboardCenteringContextType | null>(null);

/** Call inside any child component (e.g. AppTextField) to get the scrollToCenter helper. */
export const useKeyboardCentering = () => useContext(KeyboardCenteringContext);

/**
 * A ScrollView that centers the focused text field in the visible area above the keyboard.
 *
 * ## Two-path centering strategy
 *
 * ### Path A — onFocus → InteractionManager (covers KAV screens & dialogs)
 * When a field is focused and KeyboardAvoidingView is the keyboard handler, KAV
 * physically shrinks the scroll view's layout. By the time InteractionManager fires,
 * `scrollViewHeight.current` (from onLayout) is already the reduced height with the
 * keyboard accounted for. We pass `keyboardHeight=0` (the prop default) and the
 * math works out automatically.
 *
 * ### Path B — keyboardHeight prop change → useEffect (covers CustomBottomSheet)
 * CustomBottomSheet does NOT use KAV — it adds `paddingBottom` on an outer container.
 * The ScrollView's own height never changes, so `scrollViewHeight.current` stays at
 * the full pre-keyboard height. And `onFocus` fires BEFORE the keyboard appears, so
 * at focus time both `keyboardHeight` (in the closure) and `scrollViewHeight` are stale.
 *
 * The fix: store the last-focused ref as "pending". When `keyboardHeight` prop changes
 * from 0 → non-zero (i.e. the keyboard has fully appeared and CustomBottomSheet has
 * called `setKeyboardHeight`), a useEffect re-runs centering with the now-correct
 * values: `scrollViewHeight - keyboardHeight = true visible area`.
 *
 * This also handles the "switching fields" case: if the keyboard is already open
 * (keyboardHeight > 0) when a new field is focused, Path A fires immediately with
 * the correct height (the KAV screen's layout is already shrunk; for bottom sheets,
 * keyboardHeight is already correct in the closure because it hasn't changed).
 */
export const KeyboardCenteringScrollView = React.forwardRef<
  ScrollView,
  KeyboardCenteringScrollViewProps
>(({ keyboardHeight = 0, ...props }, forwardedRef) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Merge the internal ref with the forwarded ref so parents can also access it.
  const setRef = useCallback(
    (node: ScrollView | null) => {
      (scrollViewRef as React.MutableRefObject<ScrollView | null>).current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<ScrollView | null>).current = node;
      }
    },
    [forwardedRef],
  );

  // Track current scroll offset so we can compute relative movement.
  const currentScrollY = useRef(0);

  // Track the visible height of this scroll view (its layout height).
  const scrollViewHeight = useRef(0);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      scrollViewHeight.current = e.nativeEvent.layout.height;
      props.onLayout?.(e);
    },
    [props.onLayout],
  );

  // Stores the last field that called scrollToCenter.
  // Used by Path B (useEffect) to re-run centering once keyboardHeight is known.
  const pendingFocusRef = useRef<React.RefObject<any> | null>(null);

  /**
   * The core measurement + scroll calculation.
   * Takes `kbHeight` explicitly so it is never stale — callers pass the current value
   * rather than relying on a closure captured at focus time.
   */
  const runCentering = useCallback(
    (nodeRef: React.RefObject<any>, kbHeight: number) => {
      const scrollNode = scrollViewRef.current;
      const targetNode = nodeRef.current;
      if (!scrollNode || !targetNode) return;

      targetNode.measureLayout(
        scrollNode as any,
        (
          _x: number,
          fieldY: number,      // top of field relative to ScrollView content
          _width: number,
          fieldHeight: number, // height of the field
        ) => {
          // visibleAreaHeight is the space above the keyboard that the user can see.
          // • For KAV screens/dialogs: kbHeight=0 and scrollViewHeight is already
          //   shrunk by KAV → visibleAreaHeight = scrollViewHeight correctly.
          // • For bottom sheets: kbHeight > 0 and scrollViewHeight is the full
          //   sheet content height → subtracting kbHeight gives the visible area.
          const visibleAreaHeight = scrollViewHeight.current - kbHeight;
          if (visibleAreaHeight <= 0) return;

          // Target: place the vertical center of the field at the center of visible area.
          const fieldCenter = fieldY + fieldHeight / 2;
          const targetScrollY = fieldCenter - visibleAreaHeight / 2;

          // Clamp to [0, ∞) — scrollTo handles the upper bound automatically.
          const clampedY = Math.max(0, targetScrollY);

          // Comfortable-zone guard: skip if the field is already fully visible with
          // ≥16px breathing room on both edges. Prevents top fields from being
          // unnecessarily scrolled when they're already in view.
          const topEdgeVisible = fieldY - currentScrollY.current;
          const bottomEdgeVisible = topEdgeVisible + fieldHeight;
          const isAlreadyComfortablyVisible =
            topEdgeVisible >= 16 && bottomEdgeVisible <= visibleAreaHeight - 16;

          if (isAlreadyComfortablyVisible) return;

          scrollNode.scrollTo({ y: clampedY, animated: true });
        },
        // Failure noop — node may not be mounted yet; focus will re-fire if needed.
        () => {},
      );
    },
    [],
  );

  // ─── Path A ───────────────────────────────────────────────────────────────
  // Called by AppTextField on every focus. Stores the ref (for Path B) and
  // attempts centering immediately via setTimeout.
  //
  // • KAV screens/dialogs: by the time setTimeout fires, KAV has already
  //   applied its layout change and scrollViewHeight.current is correct. ✓
  // • Bottom sheets (keyboard not yet visible): scrollViewHeight is stale and
  //   keyboardHeight is 0. The comfortable-zone guard will likely return true
  //   (field looks visible in the un-shrunk view), so this is a safe no-op.
  //   Path B then fires the correct centering. ✓
  // • Bottom sheets (keyboard already visible, switching fields): keyboardHeight
  //   is already correct in the closure (it hasn't changed since the last update),
  //   so this fires correctly without needing Path B. ✓
  const scrollToCenter = useCallback(
    (nodeRef: React.RefObject<any>) => {
      // Always record intent — Path B reads this.
      pendingFocusRef.current = nodeRef;

      // Attempt immediately (works for KAV; safe no-op for bottom sheets).
      setTimeout(() => {
        runCentering(nodeRef, keyboardHeight);
      }, 50);
    },
    [keyboardHeight, runCentering],
  );

  // ─── Path B ───────────────────────────────────────────────────────────────
  // Fires when keyboardHeight prop changes. This is the authoritative centering
  // path for CustomBottomSheet, which updates `keyboardHeight` state via its
  // own keyboard listener after the keyboard has appeared.
  //
  // At this point:
  //   • keyboardHeight = the real keyboard height (e.g. 336px on iPhone 14)
  //   • scrollViewHeight.current = the scroll view's full content height
  //   • visibleAreaHeight = scrollViewHeight - keyboardHeight = correct visible area
  //   • pendingFocusRef.current = the field that was focused (set in Path A)
  useEffect(() => {
    if (keyboardHeight > 0 && pendingFocusRef.current) {
      // Small delay to let any re-renders triggered by the height change
      // (e.g. maxHeight: 85% kicking in) flush to native before measuring.
      const timer = setTimeout(() => {
        if (pendingFocusRef.current) {
          runCentering(pendingFocusRef.current, keyboardHeight);
        }
      }, 80);
      return () => clearTimeout(timer);
    }
    if (keyboardHeight === 0) {
      // Keyboard dismissed — clear intent so a future focus starts fresh.
      pendingFocusRef.current = null;
    }
  }, [keyboardHeight, runCentering]);

  return (
    <KeyboardCenteringContext.Provider value={{ scrollToCenter }}>
      <ScrollView
        {...props}
        ref={setRef}
        keyboardShouldPersistTaps="handled"
        onLayout={handleLayout}
        scrollEventThrottle={16}
        onScroll={(e) => {
          currentScrollY.current = e.nativeEvent.contentOffset.y;
          props.onScroll?.(e);
        }}
      >
        {props.children}
      </ScrollView>
    </KeyboardCenteringContext.Provider>
  );
});

KeyboardCenteringScrollView.displayName = 'KeyboardCenteringScrollView';
