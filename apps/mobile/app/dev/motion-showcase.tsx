/**
 * apps/mobile/app/dev/motion-showcase.tsx — internal preview screen.
 *
 * Renders every motion primitive in isolation so Danny can feel each one
 * without needing live backend data. Each section has a re-trigger button
 * (for one-shot effects) or shows the primitive in its idle vs active state.
 *
 * Navigate from the running app via deep-link:
 *
 *   exp+5bib://dev/motion-showcase           (Expo Go / dev client)
 *
 * Or just type the path in the dev-menu address bar.
 *
 * NOT a real product screen — keep this under app/dev/* so it's clearly
 * dev-only and easy to strip before release builds (a single `if (__DEV__)`
 * gate inside the layout could omit the route entirely).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { Skeleton } from '../../src/components/Skeleton';
import { Header } from '../../src/components/Header';
import { tokens } from '../../src/theme/tokens';

import {
  FadeSlideIn,
  StaggerItem,
  PressScale,
  QRPulseRing,
  BadgeShimmer,
  SuccessBurst,
  Flip3D,
  DoubleSidedFlip,
  SwipeActions,
  SkiaConfetti,
  AnimatedLogo,
  IconMorph,
  haptics,
} from '../../src/components/motion';
import { CountdownRing } from '../../src/components/domain/CountdownRing';

/**
 * One section block. Title + description + the actual primitive render +
 * a re-trigger button when the primitive supports it.
 */
function Section({
  title,
  description,
  onTrigger,
  triggerLabel = 'Phát lại',
  children,
}: {
  title: string;
  description?: string;
  onTrigger?: () => void;
  triggerLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card padding="none" style={{ overflow: 'hidden' }}>
      <View style={{ padding: tokens.space[4], gap: tokens.space[2] }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: tokens.fontSize.bodyLg,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.neutral900,
            }}
          >
            {title}
          </Text>
          {onTrigger ? (
            <Pressable
              onPress={() => {
                haptics.light();
                onTrigger();
              }}
              style={({ pressed }) => ({
                paddingHorizontal: tokens.space[3],
                paddingVertical: tokens.space[1],
                borderRadius: tokens.radius.full,
                backgroundColor: pressed
                  ? tokens.color.brandPrimaryLight
                  : tokens.color.brandPrimary,
              })}
            >
              <Text
                style={{
                  color: tokens.color.neutral0,
                  fontSize: tokens.fontSize.labelSm,
                  fontWeight: tokens.fontWeight.semibold,
                }}
              >
                {triggerLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {description ? (
          <Text
            style={{
              fontSize: tokens.fontSize.bodySm,
              color: tokens.color.neutral600,
              lineHeight: tokens.lineHeight.bodySm,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          backgroundColor: tokens.color.neutral50,
          padding: tokens.space[4],
          minHeight: 120,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </Card>
  );
}

export default function MotionShowcaseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();

  // ---- Re-trigger keys (changing the key remounts the child for one-shots).
  const [confettiKey, setConfettiKey] = useState(0);
  const [flipKey, setFlipKey] = useState(0);
  const [doubleFlipped, setDoubleFlipped] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const [staggerKey, setStaggerKey] = useState(0);
  const [iconActive, setIconActive] = useState(false);
  const [logoKey, setLogoKey] = useState(0);

  // Target 14 days from now so the countdown ring sits in the "amber" tier.
  const countdownTarget = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    d.setHours(7, 30, 0, 0);
    return d.toISOString();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title="Motion showcase"
        leading="back"
        onLeadingPress={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={{
          padding: tokens.space[4],
          paddingBottom: insets.bottom + tokens.space[6],
          gap: tokens.space[4],
        }}
      >
        <Text style={{ color: tokens.color.neutral600 }}>
          Mỗi block dưới là 1 motion primitive độc lập. Bấm "Phát lại" để
          xem lại one-shot animation.
        </Text>

        {/* ---------------- 1. AnimatedLogo (5BIB letterforms) ---------------- */}
        <Section
          title="AnimatedLogo — 5BIB stroke-by-stroke"
          description="Vẽ từng chữ + fill-flash brand color. Dùng cho splash khi mở app."
          onTrigger={() => setLogoKey((k) => k + 1)}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <AnimatedLogo key={logoKey} size={160} />
          </View>
        </Section>

        {/* ---------------- 2. SuccessBurst (icon spring + halo) ---------------- */}
        <Section
          title="SuccessBurst — icon spring-in + halo"
          description="Spring overshoot + ripple ring + ambient glow. Dùng cho ✓ tick ở màn payment success."
          onTrigger={() => setBurstKey((k) => k + 1)}
        >
          <SuccessBurst key={burstKey} color={tokens.color.success} size={96}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: tokens.color.successBg,
              }}
            >
              <Text style={{ fontSize: 48 }}>✓</Text>
            </View>
          </SuccessBurst>
        </Section>

        {/* ---------------- 3. SkiaConfetti (particle burst) ---------------- */}
        <Section
          title="SkiaConfetti — 90 particles physics"
          description="Real-time particle burst trên @shopify/react-native-skia. Gravity 800px/s². Cần native rebuild để chạy."
          onTrigger={() => setConfettiKey((k) => k + 1)}
        >
          <View
            style={{
              width: '100%',
              height: 220,
              borderRadius: tokens.radius.lg,
              backgroundColor: tokens.color.neutral900,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: tokens.color.neutral400 }}>
              🎉 Bấm "Phát lại" để bắn confetti
            </Text>
            <SkiaConfetti
              key={confettiKey}
              trigger={confettiKey > 0}
              duration={2800}
              particleCount={80}
              origin={{ x: winW / 2 - tokens.space[4], y: 100 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          </View>
        </Section>

        {/* ---------------- 4. Flip3D (one-shot flip-in) ---------------- */}
        <Section
          title="Flip3D — card flip-in spring overshoot"
          description="Dùng cho màn 'Quay BIB' khi reveal số BIB may mắn. Spring landing ~10° overshoot."
          onTrigger={() => setFlipKey((k) => k + 1)}
        >
          <Flip3D key={flipKey} trigger axis="y" perspective={1200} duration={900}>
            <View
              style={{
                width: 220,
                height: 140,
                borderRadius: tokens.radius.lg,
                backgroundColor: tokens.color.brandPrimary,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Text
                style={{
                  color: tokens.color.neutral0,
                  fontSize: 12,
                  letterSpacing: 1,
                }}
              >
                🎉 BIB MAY MẮN
              </Text>
              <Text
                style={{
                  color: tokens.color.neutral0,
                  fontSize: 56,
                  fontWeight: tokens.fontWeight.bold,
                  fontFamily: 'Menlo',
                }}
              >
                A-1024
              </Text>
            </View>
          </Flip3D>
        </Section>

        {/* ---------------- 5. DoubleSidedFlip (controlled flip) ---------------- */}
        <Section
          title="DoubleSidedFlip — front ↔ back toggle"
          description="Có 2 mặt, flip qua lại. Như card lật trong game memory."
          onTrigger={() => setDoubleFlipped((f) => !f)}
          triggerLabel={doubleFlipped ? 'Lật về' : 'Lật'}
        >
          <DoubleSidedFlip
            flipped={doubleFlipped}
            axis="y"
            front={
              <View
                style={{
                  width: 200,
                  height: 130,
                  borderRadius: tokens.radius.lg,
                  backgroundColor: tokens.color.brandSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{ color: tokens.color.neutral0, fontSize: 18, fontWeight: '600' }}
                >
                  FRONT
                </Text>
              </View>
            }
            back={
              <View
                style={{
                  width: 200,
                  height: 130,
                  borderRadius: tokens.radius.lg,
                  backgroundColor: tokens.color.magenta,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{ color: tokens.color.neutral0, fontSize: 18, fontWeight: '600' }}
                >
                  BACK
                </Text>
              </View>
            }
          />
        </Section>

        {/* ---------------- 6. QRPulseRing (breathing rings) ---------------- */}
        <Section
          title="QRPulseRing — breathing rings"
          description="2 vòng tròn nhấp nháy quanh QR khi vé live (CHECKED_IN). Lệch pha → cảm giác 'thở'."
        >
          <QRPulseRing color={tokens.color.brandPrimary}>
            <View
              style={{
                width: 180,
                height: 180,
                borderRadius: tokens.radius.xl,
                backgroundColor: tokens.color.surfaceCard,
                alignItems: 'center',
                justifyContent: 'center',
                ...tokens.elevation[2],
              }}
            >
              <Text style={{ fontSize: 80 }}>▦</Text>
              <Text
                style={{
                  fontSize: 12,
                  color: tokens.color.neutral500,
                  fontFamily: 'Menlo',
                  marginTop: 4,
                }}
              >
                MOCK-QR-123
              </Text>
            </View>
          </QRPulseRing>
        </Section>

        {/* ---------------- 7. BadgeShimmer (action-needed shine) ---------------- */}
        <Section
          title="BadgeShimmer — periodic shine sweep"
          description="Vệt sáng quét chéo qua badge mỗi ~3.6s. Dùng cho status 'cần action' như NEW / REMIND_CHECK_IN."
        >
          <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
            <BadgeShimmer>
              <Badge variant="warning">Chờ xác nhận</Badge>
            </BadgeShimmer>
            <BadgeShimmer>
              <Badge variant="warning">Chưa ghi danh</Badge>
            </BadgeShimmer>
          </View>
        </Section>

        {/* ---------------- 8. CountdownRing (5 SVG rings) ---------------- */}
        <Section
          title="CountdownRing — 5 SVG progress rings"
          description="Thay text countdown ở race detail. Color tier shifts urgency theo số ngày còn lại (xanh → vàng → đỏ)."
        >
          <View style={{ width: '100%' }}>
            <CountdownRing targetIso={countdownTarget} />
          </View>
        </Section>

        {/* ---------------- 9. FadeSlideIn (mount fade + slide-up) ---------------- */}
        <Section
          title="FadeSlideIn — mount fade + slide-up"
          description="Section trượt lên fade in khi mount. Apply cho mọi card / section detail."
          onTrigger={() => setFadeKey((k) => k + 1)}
        >
          <View key={fadeKey} style={{ width: '100%', gap: tokens.space[2] }}>
            <FadeSlideIn delay={0}>
              <View
                style={{
                  height: 40,
                  borderRadius: tokens.radius.md,
                  backgroundColor: tokens.color.brandPrimaryLight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text>Block 1 (delay 0)</Text>
              </View>
            </FadeSlideIn>
            <FadeSlideIn delay={120}>
              <View
                style={{
                  height: 40,
                  borderRadius: tokens.radius.md,
                  backgroundColor: tokens.color.successBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text>Block 2 (delay 120)</Text>
              </View>
            </FadeSlideIn>
            <FadeSlideIn delay={240}>
              <View
                style={{
                  height: 40,
                  borderRadius: tokens.radius.md,
                  backgroundColor: tokens.color.warningBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text>Block 3 (delay 240)</Text>
              </View>
            </FadeSlideIn>
          </View>
        </Section>

        {/* ---------------- 10. StaggerItem (list mount cascade) ---------------- */}
        <Section
          title="StaggerItem — list mount cascade"
          description="Mỗi item trong list trượt vào lần lượt theo index. Cap 320ms cho list dài."
          onTrigger={() => setStaggerKey((k) => k + 1)}
        >
          <View key={staggerKey} style={{ width: '100%', gap: tokens.space[1] }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <StaggerItem key={i} index={i}>
                <View
                  style={{
                    height: 36,
                    borderRadius: tokens.radius.md,
                    backgroundColor: tokens.color.neutral100,
                    paddingHorizontal: tokens.space[3],
                    justifyContent: 'center',
                  }}
                >
                  <Text>Item #{i + 1}</Text>
                </View>
              </StaggerItem>
            ))}
          </View>
        </Section>

        {/* ---------------- 11. PressScale (tactile press) ---------------- */}
        <Section
          title="PressScale — tactile press-down spring"
          description="Bấm xuống scale 0.96, thả ra spring back. Áp dụng tự động cho Card chung."
        >
          <PressScale
            onPress={() => {
              haptics.success();
            }}
            style={{ width: 220 }}
          >
            <View
              style={{
                padding: tokens.space[5],
                borderRadius: tokens.radius.lg,
                backgroundColor: tokens.color.brandPrimary,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: tokens.color.neutral0,
                  fontSize: tokens.fontSize.bodyLg,
                  fontWeight: '600',
                }}
              >
                Bấm tao
              </Text>
              <Text
                style={{
                  color: tokens.color.neutral0,
                  fontSize: 11,
                  opacity: 0.8,
                  marginTop: 4,
                }}
              >
                Có haptic success
              </Text>
            </View>
          </PressScale>
        </Section>

        {/* ---------------- 12. IconMorph (icon flip-swap) ---------------- */}
        <Section
          title="IconMorph — flip + swap icon"
          description="Lật quanh trục Y rồi swap icon. Dùng cho toggle yêu thích / bookmark."
          onTrigger={() => setIconActive((a) => !a)}
          triggerLabel={iconActive ? 'Tắt' : 'Bật'}
        >
          <IconMorph
            iconOff="🤍"
            iconOn="❤️"
            active={iconActive}
            size={64}
            onPress={() => setIconActive((a) => !a)}
          />
        </Section>

        {/* ---------------- 13. SwipeActions (swipe-to-action) ---------------- */}
        <Section
          title="SwipeActions — vuốt sang trái reveal action"
          description="Như iOS Mail. Vuốt full → auto trigger action đầu. Áp dụng cho ticket list + order list."
        >
          <View style={{ width: '100%' }}>
            <SwipeActions
              actions={[
                {
                  label: 'Chia sẻ',
                  icon: '⤴',
                  color: tokens.color.brandPrimary,
                  onPress: () => haptics.success(),
                },
                {
                  label: 'Xoá',
                  icon: '🗑',
                  color: tokens.color.error,
                  onPress: () => haptics.warning(),
                },
              ]}
            >
              <View
                style={{
                  padding: tokens.space[4],
                  backgroundColor: tokens.color.surfaceCard,
                  borderRadius: tokens.radius.lg,
                  borderWidth: 1,
                  borderColor: tokens.color.neutral200,
                }}
              >
                <Text
                  style={{
                    fontSize: tokens.fontSize.bodyLg,
                    fontWeight: '600',
                  }}
                >
                  Mock ticket card
                </Text>
                <Text style={{ color: tokens.color.neutral600, marginTop: 4 }}>
                  ← Vuốt sang trái để xem action
                </Text>
              </View>
            </SwipeActions>
          </View>
        </Section>

        {/* ---------------- 14. Shimmer Skeleton ---------------- */}
        <Section
          title="Skeleton — diagonal shimmer sweep"
          description="Vệt sáng quét chéo qua placeholder. Replace cho mọi loading state."
        >
          <View style={{ width: '100%', gap: tokens.space[2] }}>
            <Skeleton height={18} width="70%" />
            <Skeleton height={14} width="50%" />
            <Skeleton height={120} />
            <Skeleton height={20} width={100} borderRadius={tokens.radius.full} />
          </View>
        </Section>

        {/* ---------------- 15. Button gradient sweep ---------------- */}
        <Section
          title="Button — CTA gradient sweep"
          description="Vệt sáng quét liên tục trên primary / destructive CTA. Haptic medium khi press."
        >
          <View style={{ width: '100%', gap: tokens.space[2] }}>
            <Button variant="primary" size="lg" fullWidth onPress={() => {}}>
              Primary CTA
            </Button>
            <Button variant="destructive" size="lg" fullWidth onPress={() => {}}>
              Destructive CTA
            </Button>
            <Button variant="secondary" size="lg" fullWidth onPress={() => {}}>
              Secondary (no sweep)
            </Button>
          </View>
        </Section>

        <Text
          style={{
            color: tokens.color.neutral400,
            textAlign: 'center',
            paddingVertical: tokens.space[6],
            fontSize: tokens.fontSize.bodySm,
          }}
        >
          Hết. Còn AppLaunchIntro — chỉ thấy khi mở app cold start.
        </Text>
      </ScrollView>
    </View>
  );
}
