/**
 * apps/mobile/src/components/motion/SwipeActions.tsx
 *
 * iOS-Mail-style swipe-to-reveal action row, built on Reanimated 3 +
 * gesture-handler v2 (the new `Gesture.Pan()` API).
 *
 * Design choices
 * ──────────────
 * 1. **Two-layer composition**: the action buttons live in an absolutely-
 *    positioned row pinned to the right edge of the container. The row
 *    content (children) sits on top in a `translateX`-animated layer. As
 *    the user drags left, the top layer slides over the buttons — same
 *    effect as iOS Mail, with the cheapest possible render cost (no
 *    per-button layout calc on every frame).
 *
 * 2. **`Gesture.Pan()` (v2 API)** rather than the legacy
 *    `PanGestureHandler`. Activation is delayed by a 10 px horizontal
 *    threshold + a `failOffsetY` so vertical FlatList scroll wins the
 *    gesture arbitration — critical when this wraps a list row.
 *
 * 3. **Three states for translateX**:
 *      • 0 (closed)
 *      • -openWidth (snapped open, exactly the actions tray width)
 *      • -screenWidth*FULL_SWIPE_PCT (full-swipe → fires action[0])
 *    `withSpring` is used for the snap so it feels physical, not robotic.
 *
 * 4. **Haptics map** (the wrist matters more than the eye):
 *      • light  → first cross of the reveal threshold (during drag)
 *      • medium → snap-open / snap-close release
 *      • success → full-swipe auto-trigger of the leading action
 *    All fired via `runOnJS` from the worklet so we don't hop threads
 *    twice.
 *
 * 5. **Imperative `close()`**: parents holding a `ref` can dismiss the
 *    row — useful for "only one row open at a time" patterns in a list
 *    (FlatList parent tracks the currently-open ref and closes the
 *    previous one on a new pan start).
 *
 * 6. **Right-side actions only** (Vietnamese reading direction is LTR;
 *    matches iOS Mail). RTL not handled — file a follow-up if needed.
 *
 * Usage
 * ─────
 *   const ref = useRef<SwipeActionsHandle>(null);
 *   <SwipeActions
 *     ref={ref}
 *     actions={[
 *       { label: 'Chia sẻ', icon: '⤴', color: tokens.color.brandPrimary, onPress: handleShare },
 *       { label: 'Chuyển nhượng', icon: '↗', color: tokens.color.warning, onPress: handleTransfer },
 *     ]}
 *   >
 *     <TicketCard ticket={ticket} onPress={handleOpen} />
 *   </SwipeActions>
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { tokens } from '../../theme/tokens';
import { haptics } from './haptics';

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type SwipeAction = {
  /** Label shown under the icon. Keep it short — 1-2 words. */
  label: string;
  /** Glyph string or icon node (e.g. Ionicons). String glyphs render white over `color`. */
  icon?: string | React.ReactNode;
  /** Background colour of the action tile. Usually `tokens.color.*`. */
  color: string;
  /** Tap handler. Closes the row before firing. */
  onPress: () => void;
};

export type SwipeActionsProps = {
  /** Row content (a card, list item, etc.). */
  children: React.ReactNode;
  /** 1–3 actions. More than 3 will overflow on small phones. */
  actions: SwipeAction[];
  /**
   * Override the per-action tile width. Default 72 px matches Apple HIG
   * minimum tap target (44 pt) with comfortable padding.
   */
  actionWidth?: number;
  /**
   * Disable the gesture entirely (e.g. while the row is in an async
   * pending state). The row stays closed and ignores pans.
   */
  disabled?: boolean;
  /** Style passthrough for the outer container. */
  containerStyle?: ViewStyle;
};

export type SwipeActionsHandle = {
  /** Snap closed imperatively. Useful for "only one open at a time". */
  close: () => void;
};

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_ACTION_WIDTH = 72;
/** Snap-open trigger: row is opened if dragged past 50% of tray width. */
const SNAP_OPEN_RATIO = 0.5;
/** Full-swipe trigger: cross 80% of screen → auto-fire leading action. */
const FULL_SWIPE_PCT = 0.8;
/** Min horizontal travel before pan claims the gesture (vs vertical scroll). */
const ACTIVE_OFFSET_X = 10;
/** Vertical travel that fails the pan, releasing it to the parent scroller. */
const FAIL_OFFSET_Y = 12;

const SPRING_CONFIG = {
  damping: 22,
  stiffness: 220,
  mass: 0.7,
} as const;

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export const SwipeActions = forwardRef<SwipeActionsHandle, SwipeActionsProps>(
  function SwipeActions(
    { children, actions, actionWidth = DEFAULT_ACTION_WIDTH, disabled, containerStyle },
    ref,
  ) {
    // Width of the entire actions tray (right side).
    const trayWidth = actionWidth * actions.length;
    // Screen width memoised so a rotation doesn't stale-close the row.
    const screenWidth = useMemo(() => Dimensions.get('window').width, []);
    const fullSwipeThreshold = screenWidth * FULL_SWIPE_PCT;

    // Shared values
    // `translateX` is the live drag/spring position. It's negative when
    // open (row pulled left). `startX` snapshots the value at pan begin so
    // re-pans resume from the current resting offset instead of jumping.
    // `hasCrossedReveal` is a 0/1 latch so we fire the light reveal haptic
    // exactly once per drag, not on every frame past the threshold.
    const translateX = useSharedValue(0);
    const startX = useSharedValue(0);
    const hasCrossedReveal = useSharedValue(0);

    // ── JS-side helpers (called from worklets via runOnJS) ──────────────

    const fireLeadingAction = useCallback(() => {
      // Used by the full-swipe gesture. Reset the row, then invoke the
      // leading action on the next tick so any unmounts (e.g. row removed
      // from a list) happen after the spring settles visually.
      haptics.success();
      actions[0]?.onPress();
    }, [actions]);

    const fireHapticLight = useCallback(() => haptics.light(), []);
    const fireHapticMedium = useCallback(() => haptics.medium(), []);

    // ── Imperative API ──────────────────────────────────────────────────

    const closeProgrammatic = useCallback(() => {
      translateX.value = withSpring(0, SPRING_CONFIG);
      hasCrossedReveal.value = 0;
    }, [translateX, hasCrossedReveal]);

    useImperativeHandle(ref, () => ({ close: closeProgrammatic }), [
      closeProgrammatic,
    ]);

    // ── Pan gesture ─────────────────────────────────────────────────────

    const pan = useMemo(
      () =>
        Gesture.Pan()
          .enabled(!disabled)
          // Horizontal-bias so vertical scrolling wins on a FlatList parent.
          .activeOffsetX([-ACTIVE_OFFSET_X, ACTIVE_OFFSET_X])
          .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
          .onStart(() => {
            'worklet';
            startX.value = translateX.value;
          })
          .onUpdate((e) => {
            'worklet';
            // Clamp: don't let the row pull right past 0 (no left-side
            // actions in this component), and add a soft cap at the full
            // swipe distance so the rubber-band doesn't run off-screen.
            const next = Math.min(0, startX.value + e.translationX);
            translateX.value = Math.max(next, -screenWidth);

            // Light haptic on the first frame we cross the reveal threshold.
            const past = -translateX.value > actionWidth;
            if (past && hasCrossedReveal.value === 0) {
              hasCrossedReveal.value = 1;
              runOnJS(fireHapticLight)();
            } else if (!past && hasCrossedReveal.value === 1) {
              // Reset latch if user drags back closed mid-pan.
              hasCrossedReveal.value = 0;
            }
          })
          .onEnd((e) => {
            'worklet';
            const dragged = -translateX.value; // positive magnitude
            const velocity = -e.velocityX;     // positive = leftward
            const isFullSwipe =
              dragged > fullSwipeThreshold || velocity > 1200;
            const isSnapOpen =
              dragged > trayWidth * SNAP_OPEN_RATIO || velocity > 400;

            if (isFullSwipe) {
              // Slam off-screen, then fire the leading action.
              translateX.value = withTiming(
                -screenWidth,
                { duration: 180 },
                (finished) => {
                  if (finished) runOnJS(fireLeadingAction)();
                },
              );
              return;
            }
            if (isSnapOpen) {
              translateX.value = withSpring(-trayWidth, SPRING_CONFIG);
              runOnJS(fireHapticMedium)();
            } else {
              translateX.value = withSpring(0, SPRING_CONFIG);
              hasCrossedReveal.value = 0;
              runOnJS(fireHapticMedium)();
            }
          }),
      [
        disabled,
        startX,
        translateX,
        screenWidth,
        actionWidth,
        hasCrossedReveal,
        fireHapticLight,
        fireHapticMedium,
        fullSwipeThreshold,
        trayWidth,
        fireLeadingAction,
      ],
    );

    // ── Animated styles ─────────────────────────────────────────────────

    const rowStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    // Tap handler — tapping an action closes the row, then fires onPress.
    // The close animation runs concurrently with the consumer's handler;
    // if they pop the screen the spring is harmless (component unmounts).
    const handleActionPress = useCallback(
      (action: SwipeAction) => {
        haptics.medium();
        translateX.value = withSpring(0, SPRING_CONFIG);
        hasCrossedReveal.value = 0;
        action.onPress();
      },
      [translateX, hasCrossedReveal],
    );

    // ── Render ──────────────────────────────────────────────────────────

    return (
      <View style={[styles.container, containerStyle]}>
        {/* Action tray — absolutely positioned, revealed as the row slides over. */}
        <View
          style={[styles.actionsTray, { width: trayWidth }]}
          pointerEvents="box-none"
        >
          {actions.map((action, i) => (
            <Pressable
              key={`${action.label}-${i}`}
              onPress={() => handleActionPress(action)}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  width: actionWidth,
                  backgroundColor: action.color,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              {action.icon ? (
                typeof action.icon === 'string' ? (
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                ) : (
                  action.icon
                )
              ) : null}
              <Text style={styles.actionLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Foreground row — the user's children, translated by the gesture. */}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.row, rowStyle]}>{children}</Animated.View>
        </GestureDetector>
      </View>
    );
  },
);

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: tokens.color.surfaceBg,
    borderRadius: tokens.radius.lg,
  },
  actionsTray: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  actionButton: {
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingHorizontal: tokens.space[1],
    gap: tokens.space[1],
  },
  actionIcon: {
    color: tokens.color.neutral0,
    fontSize: tokens.iconSize.lg,
    lineHeight: tokens.iconSize.lg + 2,
    textAlign: 'center',
  },
  actionLabel: {
    color: tokens.color.neutral0,
    fontSize: tokens.fontSize.labelSm,
    fontWeight: tokens.fontWeight.semibold,
    textAlign: 'center',
  },
  row: {
    backgroundColor: tokens.color.surfaceBg,
  },
});

export default SwipeActions;
