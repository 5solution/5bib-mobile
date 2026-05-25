/**
 * apps/mobile/app/tickets/[id]/rolling-bib.tsx — S-TICKETS-06 Rolling BIB Gamification
 *
 * 4-state machine implementation per BR-TICKETS-15:
 *   [NoBIB] → [RollingBIBModal] → [ConfirmBIB] → [Success]
 *
 * Business Rules:
 *  - BR-TICKETS-15: 4-state machine
 *  - BR-TICKETS-17: ConfirmBIB countdown HH:MM:SS gold, auto-expire → S-TICKETS-02
 *
 * Test Cases covered (inline references):
 *  - TC-TICKETS-21 → 29
 *
 * Dependencies:
 *  - Zustand store `useRollingBibStore` (TODO: skeleton — implement in src/stores/rolling-bib.store.ts)
 *  - @5bib/sdk athlete.rollingBib() + athlete.confirmRollingBib() (TODO: SDK extract)
 *  - Custom components: GradientCard, RollingNumber, SlotMachine, BIBNumberCard, CountdownTimer
 *    (TODO: skeleton imports — implement in src/components/domain/)
 *  - react-native-reanimated 3000ms spin animation
 *  - expo-haptics ImpactFeedbackStyle.Light ticks during spin
 *    (TODO: add `expo-haptics` to package.json — fallback no-op if missing)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../../src/components/Header';
import { Button } from '../../../src/components/Button';
import { FullScreenLoading, Spinner } from '../../../src/components/Skeleton';
import { useToast } from '../../../src/components/Toast';
import { useCountdown } from '../../../src/hooks';
import { tokens } from '../../../src/theme/tokens';

// TODO(@5bib/sdk): replace stub once SDK is wired
// import { sdk } from '../../../src/sdk/client';
// import { useRollingBibStore } from '../../../src/stores/rolling-bib.store';

// TODO(@components): real domain components — placeholders below render inline
// import { GradientCard } from '../../../src/components/domain/GradientCard';
// import { RollingNumber } from '../../../src/components/domain/RollingNumber';
// import { SlotMachine } from '../../../src/components/domain/SlotMachine';
// import { BIBNumberCard } from '../../../src/components/domain/BIBNumberCard';
// import { CountdownTimer } from '../../../src/components/domain/CountdownTimer';

// TODO(expo-haptics): add package and replace stub
const Haptics = {
  ImpactFeedbackStyle: { Light: 'light' as const },
  NotificationFeedbackType: { Success: 'success' as const },
  impactAsync: async (_style: string) => {
    /* no-op until expo-haptics installed */
  },
  notificationAsync: async (_type: string) => {
    /* no-op */
  },
};

// ---------------------------------------------------------------------------
// Constants — design system anchors
// ---------------------------------------------------------------------------

const SPIN_DURATION_MS = 3000;
const SETTLE_AT_MS = 2700;
const COUNTDOWN_COLOR = '#FEC84B'; // tokens.color.countdown.text (gold)
const GRADIENT_START = '#5B21B6'; // purple-700
const GRADIENT_END = '#1D4ED8'; // blue-700

type Phase = 'noBib' | 'spinning' | 'settling' | 'confirm' | 'submitting' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RollingBibScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { id: ticketId } = useLocalSearchParams<{ id: string }>();

  const [phase, setPhase] = useState<Phase>('noBib');
  const [newBib, setNewBib] = useState<string | null>(null);
  const [validUntilEpoch, setValidUntilEpoch] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Accessibility: reduce motion detection (TC-TICKETS-29) ---------------
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // ---- Cleanup tick interval on unmount -------------------------------------
  useEffect(
    () => () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    },
    [],
  );

  // ---- Countdown derived seconds (BR-TICKETS-17) ----------------------------
  const secondsLeft = useMemo(() => {
    if (!validUntilEpoch) return 0;
    return Math.max(0, Math.floor((validUntilEpoch - Date.now()) / 1000));
  }, [validUntilEpoch, phase]);

  const { seconds: liveSeconds } = useCountdown(secondsLeft, phase === 'confirm');

  useEffect(() => {
    // TC-TICKETS-24: countdown expired during confirm → auto-back + toast
    if (phase === 'confirm' && validUntilEpoch && liveSeconds <= 0) {
      toast.show({ variant: 'warning', message: t('tickets.rollingBib.expired') });
      router.replace(`/tickets/${ticketId}`);
    }
  }, [liveSeconds, phase, validUntilEpoch, router, ticketId, toast, t]);

  // ---- Handlers --------------------------------------------------------------

  const startSpin = useCallback(async () => {
    // TC-TICKETS-21: State 1 → tap CTA → State 2 + API call fired
    setPhase('spinning');
    if (reduceMotion) {
      // TC-TICKETS-29: skip animation → jump to State 3
      await runRollApiAndGoConfirm();
      return;
    }

    // Haptic ticks during spin (TC-TICKETS-22)
    tickIntervalRef.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 120);

    // Fire API in parallel với spin
    const apiPromise = mockRollingBibApi(ticketId);

    // Settle phase (2700ms in)
    setTimeout(() => setPhase('settling'), SETTLE_AT_MS);

    try {
      const result = await Promise.race([
        apiPromise,
        new Promise<typeof apiPromise extends Promise<infer R> ? R : never>((resolve) =>
          setTimeout(
            () => apiPromise.then((r) => resolve(r as never)),
            SPIN_DURATION_MS + 200,
          ),
        ),
      ]);

      setNewBib(result.bib);
      setValidUntilEpoch(Date.parse(result.validUntil));
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      setPhase('confirm');
    } catch (err) {
      // TC-TICKETS-28: network fail mid-roll → toast + back to State 1
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      toast.show({ variant: 'error', message: t('errors.network') });
      setPhase('noBib');
    }
  }, [reduceMotion, ticketId, toast, t]);

  const runRollApiAndGoConfirm = useCallback(async () => {
    try {
      const result = await mockRollingBibApi(ticketId);
      setNewBib(result.bib);
      setValidUntilEpoch(Date.parse(result.validUntil));
      setPhase('confirm');
    } catch {
      toast.show({ variant: 'error', message: t('errors.network') });
      setPhase('noBib');
    }
  }, [ticketId, toast, t]);

  const cancelSpin = useCallback(() => {
    // TC-TICKETS-23: cancel mid-spin → confirm dialog
    Alert.alert(
      t('tickets.rollingBib.cancelTitle'),
      t('tickets.rollingBib.cancelMsg'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: () => {
            if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
            router.back();
          },
        },
      ],
    );
  }, [router, t]);

  const reroll = useCallback(() => {
    // TC-TICKETS-25: tap "Chọn lại" → confirm → State 2 reset
    Alert.alert(
      t('tickets.rollingBib.rerollTitle'),
      t('tickets.rollingBib.rerollMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => {
            setNewBib(null);
            setValidUntilEpoch(null);
            startSpin();
          },
        },
      ],
    );
  }, [startSpin, t]);

  const confirmBib = useCallback(async () => {
    // TC-TICKETS-26: tap "Xác nhận" → success → State 4 + haptic
    setPhase('submitting');
    try {
      // TODO(@5bib/sdk): PAUSE-EPIC4-09 — confirm endpoint TBD
      // await sdk.athlete.confirmRollingBib({ ticketId, bib: newBib });
      await new Promise((r) => setTimeout(r, 700));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase('success');
    } catch {
      toast.show({ variant: 'error', message: t('errors.generic') });
      setPhase('confirm');
    }
  }, [toast, t]);

  const goToTicket = useCallback(() => {
    // TC-TICKETS-27: tap "Xem chi tiết vé" → S-TICKETS-02 với refreshed data
    router.replace(`/tickets/${ticketId}`);
  }, [router, ticketId]);

  // ---- Render branches -------------------------------------------------------

  return (
    <View style={styles.screen}>
      {phase === 'noBib' && (
        <NoBibState onStart={startSpin} onBack={() => router.back()} t={t} />
      )}
      {(phase === 'spinning' || phase === 'settling') && (
        <SpinningState
          phase={phase}
          onCancel={cancelSpin}
          newBib={newBib}
          t={t}
        />
      )}
      {(phase === 'confirm' || phase === 'submitting') && newBib && (
        <ConfirmState
          bib={newBib}
          secondsLeft={liveSeconds}
          submitting={phase === 'submitting'}
          onReroll={reroll}
          onConfirm={confirmBib}
          onBack={reroll}
          t={t}
        />
      )}
      {phase === 'success' && newBib && (
        <SuccessState bib={newBib} onView={goToTicket} t={t} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// State 1: NoBIB
// ---------------------------------------------------------------------------

function NoBibState({
  onStart,
  onBack,
  t,
}: {
  onStart: () => void;
  onBack: () => void;
  t: (k: string) => string;
}) {
  return (
    <>
      <Header
        title={t('tickets.rollingBib.title')}
        leading="back"
        onLeadingPress={onBack}
      />
      <ScrollView contentContainerStyle={styles.bodyPad}>
        <View style={[styles.gradientCard, { padding: tokens.space[7] }]}>
          <Text style={styles.gradientHeading}>🎲 {t('tickets.rollingBib.randomBib')}</Text>
          <View style={styles.placeholderRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Text key={i} style={styles.placeholderDigit}>
                ?
              </Text>
            ))}
          </View>
          <Text style={styles.gradientHelp}>{t('tickets.rollingBib.tagline')}</Text>
        </View>
        <Text style={styles.warningText} accessibilityLabel={t('tickets.rollingBib.onceWarning')}>
          ⚠ {t('tickets.rollingBib.onceWarning')}
        </Text>
      </ScrollView>
      <View style={styles.stickyBottom}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={onStart}
          accessibilityLabel={t('tickets.rollingBib.tryNowCta')}
        >
          {t('tickets.rollingBib.tryNowCta')} 🎲
        </Button>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// State 2: RollingBIBModal (spin animation)
// ---------------------------------------------------------------------------

function SpinningState({
  phase,
  onCancel,
  newBib,
  t,
}: {
  phase: Phase;
  onCancel: () => void;
  newBib: string | null;
  t: (k: string) => string;
}) {
  const settled = phase === 'settling';
  const displayDigits = useMemo(() => {
    // While spinning show random; while settling show portion of final
    if (settled && newBib) {
      return newBib.padStart(4, '0').split('');
    }
    return [0, 1, 2, 3].map(() => String(Math.floor(Math.random() * 10)));
  }, [phase, settled, newBib]);

  return (
    <>
      <Header
        title={t('tickets.rollingBib.spinning')}
        leading="close"
        onLeadingPress={onCancel}
      />
      <View style={[styles.screen, styles.spinBody]}>
        <View style={styles.slotRow}>
          {displayDigits.map((d, i) => (
            <SpinningDigit key={i} digit={d} animate={!settled} staggerMs={i * 100} />
          ))}
        </View>
        <Text style={styles.spinCaption}>{t('tickets.rollingBib.choosing')}</Text>
      </View>
      <View style={styles.stickyBottom}>
        <Button variant="ghost" size="lg" fullWidth onPress={onCancel}>
          {t('common.cancel')}
        </Button>
      </View>
    </>
  );
}

function SpinningDigit({
  digit,
  animate,
  staggerMs,
}: {
  digit: string;
  animate: boolean;
  staggerMs: number;
}) {
  const offset = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      offset.value = withRepeat(
        withSequence(
          withTiming(40, { duration: 100, easing: Easing.linear }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      );
    } else {
      cancelAnimation(offset);
      offset.value = withTiming(0, { duration: 200 + staggerMs });
    }
    return () => cancelAnimation(offset);
  }, [animate, offset, staggerMs]);

  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));

  return (
    <View style={styles.slotBox} accessibilityLabel={`digit ${digit}`}>
      <Animated.Text style={[styles.slotDigit, aStyle]}>{digit}</Animated.Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// State 3: ConfirmBIB
// ---------------------------------------------------------------------------

function ConfirmState({
  bib,
  secondsLeft,
  submitting,
  onReroll,
  onConfirm,
  onBack,
  t,
}: {
  bib: string;
  secondsLeft: number;
  submitting: boolean;
  onReroll: () => void;
  onConfirm: () => void;
  onBack: () => void;
  t: (k: string) => string;
}) {
  const hh = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
  const mm = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <>
      <Header
        title={t('tickets.rollingBib.newBibTitle')}
        leading="back"
        onLeadingPress={onBack}
      />
      <ScrollView contentContainerStyle={styles.bodyPad}>
        <View style={[styles.gradientCard, { padding: tokens.space[7] }]}>
          <Text style={styles.gradientHeading}>🎉 {t('tickets.rollingBib.luckyBib')}</Text>
          <Text style={styles.gradientBigBib} accessibilityRole="text">
            {bib}
          </Text>
          <Text style={styles.gradientHelp}>{t('tickets.rollingBib.contextLine')}</Text>
          <Text
            style={[styles.countdown, { color: COUNTDOWN_COLOR }]}
            accessibilityLabel={`${t('tickets.rollingBib.timeLeft')} ${hh}:${mm}:${ss}`}
          >
            ⏱ {t('tickets.rollingBib.timeLeft')}: {hh}:{mm}:{ss}
          </Text>
        </View>
      </ScrollView>
      <View style={[styles.stickyBottom, { flexDirection: 'row', gap: tokens.space[3] }]}>
        <View style={{ flex: 1 }}>
          <Button variant="ghost" size="lg" fullWidth onPress={onReroll} disabled={submitting}>
            {t('tickets.rollingBib.rerollCta')}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={onConfirm}
            loading={submitting}
            disabled={submitting}
          >
            {t('tickets.rollingBib.confirmCta')}
          </Button>
        </View>
      </View>
      {submitting && <FullScreenLoading />}
    </>
  );
}

// ---------------------------------------------------------------------------
// State 4: Success
// ---------------------------------------------------------------------------

function SuccessState({
  bib,
  onView,
  t,
}: {
  bib: string;
  onView: () => void;
  t: (k: string) => string;
}) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
  }, [opacity]);
  const aStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <>
      <Header
        title={t('tickets.rollingBib.successTitle')}
        leading="back"
        onLeadingPress={onView}
      />
      <ScrollView contentContainerStyle={styles.bodyPad}>
        <Animated.View style={[styles.successCard, aStyle]}>
          <View style={styles.successHeaderBar}>
            <Text style={styles.successHeaderText}>BIB · 5 KM</Text>
          </View>
          <Text style={styles.successBig}>{bib}</Text>
          <Text style={styles.successRace}>Saigon Marathon 2026</Text>
          <View style={styles.successFooterBar} />
        </Animated.View>
        <Text style={styles.successConfirmation}>
          ✅ {t('tickets.rollingBib.confirmedToast')}
        </Text>
      </ScrollView>
      <View style={styles.stickyBottom}>
        <Button variant="primary" size="lg" fullWidth onPress={onView}>
          {t('tickets.rollingBib.viewTicketCta')}
        </Button>
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Mock API (TODO: @5bib/sdk)
// ---------------------------------------------------------------------------

async function mockRollingBibApi(ticketId: string | undefined) {
  await new Promise((r) => setTimeout(r, 1200));
  const bib = String(Math.floor(1000 + Math.random() * 9000));
  const validUntil = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
  return { ticketId, bib, validUntil };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.surfaceBg },
  bodyPad: {
    padding: tokens.space[4],
    paddingBottom: tokens.space[10],
    gap: tokens.space[4],
  },
  gradientCard: {
    borderRadius: 24,
    backgroundColor: GRADIENT_START,
    // TODO: replace with expo-linear-gradient (GRADIENT_START → GRADIENT_END)
    overflow: 'hidden',
    gap: tokens.space[4],
    alignItems: 'center',
  },
  gradientHeading: {
    color: tokens.color.neutral0,
    fontSize: tokens.fontSize.h2,
    fontWeight: tokens.fontWeight.bold,
    textAlign: 'center',
  },
  placeholderRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
  },
  placeholderDigit: {
    color: tokens.color.neutral0,
    fontSize: 24,
    fontWeight: tokens.fontWeight.bold,
  },
  gradientHelp: {
    color: tokens.color.neutral0,
    opacity: 0.9,
    textAlign: 'center',
    fontSize: tokens.fontSize.bodyMd,
  },
  gradientBigBib: {
    color: tokens.color.neutral0,
    fontSize: 60,
    fontWeight: tokens.fontWeight.bold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  countdown: {
    fontSize: tokens.fontSize.bodyMd,
    fontWeight: tokens.fontWeight.bold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  warningText: {
    color: tokens.color.warning,
    fontSize: tokens.fontSize.bodySm,
    textAlign: 'center',
  },
  spinBody: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.space[5],
  },
  slotRow: { flexDirection: 'row', gap: tokens.space[3] },
  slotBox: {
    width: 64,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#36BFFA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  slotDigit: {
    color: tokens.color.neutral0,
    fontSize: 40,
    fontWeight: tokens.fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  spinCaption: {
    color: tokens.color.neutral700,
    fontSize: tokens.fontSize.bodyMd,
    textAlign: 'center',
  },
  stickyBottom: {
    padding: tokens.space[4],
    borderTopWidth: 1,
    borderTopColor: tokens.color.neutral200,
    backgroundColor: tokens.color.surfaceBg,
  },
  successCard: {
    borderRadius: 16,
    backgroundColor: tokens.color.surfaceCard,
    overflow: 'hidden',
    alignItems: 'center',
    ...tokens.elevation[2],
  },
  successHeaderBar: {
    backgroundColor: tokens.color.brandPrimary,
    paddingVertical: tokens.space[3],
    width: '100%',
    alignItems: 'center',
  },
  successHeaderText: {
    color: tokens.color.neutral0,
    fontWeight: tokens.fontWeight.semibold,
    fontSize: tokens.fontSize.labelLg ?? 16,
  },
  successBig: {
    fontSize: 60,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.color.brandPrimaryDark,
    paddingVertical: tokens.space[5],
    fontVariant: ['tabular-nums'],
  },
  successRace: {
    fontSize: tokens.fontSize.h2,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.color.neutral900,
    paddingBottom: tokens.space[4],
  },
  successFooterBar: {
    height: 12,
    width: '100%',
    backgroundColor: GRADIENT_END,
  },
  successConfirmation: {
    color: tokens.color.success,
    fontSize: tokens.fontSize.bodyLg ?? 16,
    fontWeight: tokens.fontWeight.semibold,
    textAlign: 'center',
    marginTop: tokens.space[4],
  },
});
