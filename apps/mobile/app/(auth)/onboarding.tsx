/**
 * apps/mobile/app/(auth)/onboarding.tsx
 *
 * Three-slide parallax onboarding for first-launch. Full-bleed (no Header)
 * gradient slides, horizontal pager driven by Reanimated's
 * `useAnimatedScrollHandler` so the foreground icon and dot indicators can
 * track `scrollX` natively without bouncing through JS.
 *
 * Layout per slide:
 *   - Background: `expo-linear-gradient` (full-bleed)
 *   - Foreground glyph (emoji) → translates at 0.6x the page rate, giving
 *     a depth-of-field parallax effect when you swipe.
 *   - Title (h1, white) + body text (white @ 0.85 opacity).
 *
 * Bottom controls:
 *   - 3 dot indicators — active dot expands to 16px wide in brandPrimary,
 *     others stay 6px in neutral300, driven off scrollX.
 *   - "Bỏ qua" link, top-right — jumps straight to the last slide.
 *   - Primary CTA — "Tiếp theo" until the final slide where it switches to
 *     "Bắt đầu" and routes to /login (after persisting `seenOnboarding`).
 *
 * Note on copy: this is a prototype screen — strings are inlined VN-only.
 * When the broader app is i18n'd in Wave 2 we'll migrate these into
 * `onboarding.*` keys (the existing welcome.tsx already does this).
 */

import React, { useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Button } from '../../src/components/Button';
import { tokens } from '../../src/theme/tokens';

const AnimatedScrollView = Animated.ScrollView;

/**
 * Async-storage key for "user has finished onboarding". When this is `'true'`
 * the root layout should skip onboarding and go straight to the entry route.
 */
const SEEN_ONBOARDING_KEY = 'seenOnboarding';

/** Parallax rate — foreground glyph translates at -0.4x the scroll rate per page. */
const PARALLAX_RATE = -0.4;

/** Dot indicator sizes. */
const DOT_ACTIVE_WIDTH = 16;
const DOT_INACTIVE_WIDTH = 6;
const DOT_HEIGHT = 6;

interface SlideContent {
  title: string;
  body: string;
  glyph: string;
  gradient: readonly [string, string];
}

const SLIDES: ReadonlyArray<SlideContent> = [
  {
    title: 'Tìm giải chạy phù hợp',
    body: 'Hơn 200 giải khắp Việt Nam, lọc theo cự ly, ngày, địa điểm',
    glyph: '🏃‍♂️',
    gradient: [tokens.color.brandPrimary, tokens.color.brandPrimaryDark],
  },
  {
    title: 'Đăng ký nhanh chóng',
    body: 'Thanh toán 1 chạm, e-waiver số, BIB ngay trên app',
    glyph: '🎫',
    gradient: [tokens.color.brandSecondary, tokens.color.magenta],
  },
  {
    title: 'Race-day không lo',
    body: 'QR check-in offline, kết quả live, chia sẻ tới bạn bè',
    glyph: '🏆',
    gradient: [tokens.color.brandAccent, tokens.color.warning],
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Imperative ref for "Bỏ qua" jump-to-last and "Tiếp theo" page-advance.
  const scrollRef = useRef<Animated.ScrollView>(null);

  // UI-thread scroll offset, drives parallax / dots / title fade.
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  const goToPage = (index: number) => {
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
  };

  const handleSkip = () => {
    // Jump to the last slide instead of finishing — gives the user a chance
    // to see the final CTA, which is friendlier than a hard cut to /login.
    goToPage(SLIDES.length - 1);
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem(SEEN_ONBOARDING_KEY, 'true');
    } catch {
      // Storage failures shouldn't block first-launch flow — worst case the
      // user sees onboarding again, which is recoverable.
    }
    router.replace('/login');
  };

  return (
    <View style={styles.root}>
      {/* Horizontal pager */}
      <AnimatedScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        // Disable bounce so the parallax math doesn't have to handle
        // negative offsets at slide 0.
        bounces={false}
        accessibilityLabel="Giới thiệu ứng dụng"
      >
        {SLIDES.map((slide, i) => (
          <Slide
            key={i}
            slide={slide}
            index={i}
            width={width}
            scrollX={scrollX}
          />
        ))}
      </AnimatedScrollView>

      {/* "Bỏ qua" — top right, above the safe area. White on gradient. */}
      <View
        style={[styles.skipWrap, { top: insets.top + tokens.space[3] }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={handleSkip}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Bỏ qua giới thiệu"
        >
          <Text style={styles.skipText}>Bỏ qua</Text>
        </Pressable>
      </View>

      {/* Bottom controls: dot indicators + CTA */}
      <View
        style={[
          styles.bottomWrap,
          { paddingBottom: insets.bottom + tokens.space[5] },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.dotRow} accessibilityElementsHidden>
          {SLIDES.map((_, i) => (
            <Dot key={i} index={i} width={width} scrollX={scrollX} />
          ))}
        </View>

        <CTAButton
          width={width}
          scrollX={scrollX}
          onNext={() => {
            // Heuristic: use the current scrollX to pick the next page —
            // works even if the user is mid-swipe when they tap.
            const currentPage = Math.round(scrollX.value / width);
            if (currentPage >= SLIDES.length - 1) {
              void handleFinish();
            } else {
              goToPage(currentPage + 1);
            }
          }}
          onFinish={handleFinish}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Slide — single page with gradient background + parallax glyph + copy.
// ---------------------------------------------------------------------------

interface SlideProps {
  slide: SlideContent;
  index: number;
  width: number;
  scrollX: Animated.SharedValue<number>;
}

function Slide({ slide, index, width, scrollX }: SlideProps) {
  // Distance of this slide from center: -1 = one page left, 0 = centered, 1 = right.
  const inputRange = [
    (index - 1) * width,
    index * width,
    (index + 1) * width,
  ];

  // Foreground glyph parallax — translates against the scroll direction.
  const glyphStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          scrollX.value,
          inputRange,
          [-width * PARALLAX_RATE, 0, width * PARALLAX_RATE],
          Extrapolation.CLAMP,
        ),
      },
      {
        // Scale slightly when centered for an extra cue.
        scale: interpolate(
          scrollX.value,
          inputRange,
          [0.85, 1, 0.85],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Title fades out as the slide moves off-center.
  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          scrollX.value,
          inputRange,
          [16, 0, 16],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={slide.gradient as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.slideContent}>
        <Animated.View style={[styles.glyphWrap, glyphStyle]}>
          <Text style={styles.glyph} accessibilityElementsHidden>
            {slide.glyph}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.copyWrap, titleStyle]}>
          <Text style={styles.title} accessibilityRole="header">
            {slide.title}
          </Text>
          <Text style={styles.body}>{slide.body}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Dot indicator — expands when its slide is centered.
// ---------------------------------------------------------------------------

interface DotProps {
  index: number;
  width: number;
  scrollX: Animated.SharedValue<number>;
}

function Dot({ index, width, scrollX }: DotProps) {
  const inputRange = [
    (index - 1) * width,
    index * width,
    (index + 1) * width,
  ];

  const dotStyle = useAnimatedStyle(() => ({
    width: interpolate(
      scrollX.value,
      inputRange,
      [DOT_INACTIVE_WIDTH, DOT_ACTIVE_WIDTH, DOT_INACTIVE_WIDTH],
      Extrapolation.CLAMP,
    ),
    backgroundColor: interpolateColor(
      scrollX.value,
      inputRange,
      [
        tokens.color.neutral300,
        tokens.color.brandPrimary,
        tokens.color.neutral300,
      ],
    ),
  }));

  return <Animated.View style={[styles.dot, dotStyle]} />;
}

// ---------------------------------------------------------------------------
// CTA — label morphs from "Tiếp theo" to "Bắt đầu" on the last slide.
// ---------------------------------------------------------------------------

interface CTAButtonProps {
  width: number;
  scrollX: Animated.SharedValue<number>;
  onNext: () => void;
  onFinish: () => void;
}

function CTAButton({ width, scrollX, onNext, onFinish }: CTAButtonProps) {
  // We swap label based on JS-side state, but keep it cheap by only updating
  // when the page index changes. `useAnimatedReaction` would be ideal here
  // but for prototype simplicity we hold state in React.
  const [isLast, setIsLast] = React.useState(false);

  // Drive the page-index reaction without a re-render storm.
  React.useEffect(() => {
    const id = setInterval(() => {
      const page = Math.round(scrollX.value / width);
      setIsLast(page >= SLIDES.length - 1);
    }, 120);
    return () => clearInterval(id);
  }, [scrollX, width]);

  return (
    <View style={styles.ctaWrap}>
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={isLast ? onFinish : onNext}
        accessibilityLabel={isLast ? 'Bắt đầu' : 'Tiếp theo'}
      >
        {isLast ? 'Bắt đầu' : 'Tiếp theo'}
      </Button>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.color.surfaceBg,
  },
  slide: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.space[6],
    paddingTop: tokens.space[10],
    paddingBottom: tokens.space[10] + 80, // leave room for bottom controls
    gap: tokens.space[8],
  },
  glyphWrap: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 96,
    // Drop shadow to lift glyph off the gradient — small detail, big effect.
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  copyWrap: {
    gap: tokens.space[3],
    alignItems: 'center',
  },
  title: {
    fontSize: tokens.fontSize.displayMd,
    lineHeight: tokens.lineHeight.displayMd,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.color.neutral0,
    textAlign: 'center',
  },
  body: {
    fontSize: tokens.fontSize.bodyLg,
    lineHeight: tokens.lineHeight.bodyLg,
    color: tokens.color.neutral0,
    opacity: 0.85,
    textAlign: 'center',
    maxWidth: 320,
  },
  skipWrap: {
    position: 'absolute',
    right: tokens.space[4],
    zIndex: 10,
  },
  skipText: {
    color: tokens.color.neutral0,
    fontSize: tokens.fontSize.labelMd,
    fontWeight: tokens.fontWeight.semibold,
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1],
  },
  bottomWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: tokens.space[4],
    gap: tokens.space[4],
  },
  dotRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
    justifyContent: 'center',
    alignItems: 'center',
    height: DOT_HEIGHT + 4,
  },
  dot: {
    height: DOT_HEIGHT,
    borderRadius: DOT_HEIGHT / 2,
  },
  ctaWrap: {
    width: '100%',
  },
});
