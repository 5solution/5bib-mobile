/**
 * apps/mobile/app/events/[path].tsx — S-BROWSE-03 Event Detail.
 *
 * States: Loading | Filled | Not found | Open (CTA: register) | Closed/Finished
 * (CTA: results) | bib_set_up=false (disabled).
 *
 * Data flow:
 *  - `path` route param = slug → `race.getRaceBySlug(slug)` (deep-link friendly)
 *  - Fallback: if slug looks numeric, try `race.getRaceById(id)` for /race-detail/[id] reuse
 *  - Courses → use `race.courses` if populated; else fetch via
 *    `raceCourse.listCoursesByRace(raceId)`.
 *  - Share → `expo-sharing` with universal link `https://5bib.com/events/{slug}`.
 *  - Closed/Finished → push WebView for `result.5bib.com/event/{raceId}` (EPIC-5).
 *  - Anonymous tap CTA → redirect login with return path (BR-BROWSE-11).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Image, Pressable, Share } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { Skeleton } from '../../src/components/Skeleton';
import { Banner } from '../../src/components/ErrorState';
import { CourseCard } from '../../src/components/domain/CourseCard';
import { CountdownRing } from '../../src/components/domain/CountdownRing';
import { FadeSlideIn, StaggerItem } from '../../src/components/motion';
import { useOnline } from '../../src/hooks';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useToast } from '../../src/components';
import { tokens } from '../../src/theme/tokens';
import { race as raceSdk } from '../../src/sdk/services/race';
import { raceCourse as raceCourseSdk } from '../../src/sdk/services/race-course';
import { FetcherError } from '../../src/sdk/core';
import type { Race, RaceCourse } from '../../src/sdk/models';

export default function EventDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const { show: showToast } = useToast();
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const { path } = useLocalSearchParams<{ path: string }>();

  const [race, setRace] = useState<Race | null>(null);
  const [courses, setCourses] = useState<RaceCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  // Composite selection key: `${courseId}:${ticketTypeId}` (or just courseId
  // when a course has no ticket_types — single-tier legacy fallback).
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  /**
   * Flatten courses × ticket_types into a single picker list. Web shows ALL
   * tiers per course (Family/ELB/Ultra/Thường) — mobile MUST match or users
   * can't buy higher tiers. For courses with no ticket_types data, emit a
   * single row keyed by courseId so single-tier races still work.
   */
  type PickerRow = {
    key: string; // `${courseId}:${ticketTypeId}` or just courseId
    courseId: string;
    ticketTypeId?: string;
    distance: string;
    tierName?: string;
    price: number;
    availableSlots: number | null;
  };
  /**
   * Tier label resolution (verified 2026-05-28 via web compare):
   *   - When course has MULTIPLE ticket_types → use ticket_type.type_name
   *     (e.g. "Early Bird"/"Regular" for Techcombank-style tiered pricing).
   *   - When course has 1 ticket_type → use course.name as the distinguishing
   *     label (race 305: courses are "Thường"/"Ultra"/"Family" but all share
   *     ticket_type.type_name="ELB", so falling back to course.name is what
   *     matches the web layout).
   *   - Hide the badge entirely when the label collapses to just the distance
   *     number (no extra info to convey).
   */
  const pickerRows: PickerRow[] = useMemo(() => {
    const rows: PickerRow[] = [];
    for (const c of courses) {
      const tts = c.ticketTypes ?? [];
      if (tts.length > 1) {
        for (const tt of tts) {
          rows.push({
            key: `${c.id}:${tt.id}`,
            courseId: c.id,
            ticketTypeId: tt.id,
            distance: c.distance || c.name,
            tierName: tt.typeName || undefined,
            price: tt.price,
            availableSlots: tt.remainedTicket ?? null,
          });
        }
      } else if (tts.length === 1) {
        const tt = tts[0]!;
        const tierName =
          c.name && c.name !== c.distance ? c.name : undefined;
        rows.push({
          key: `${c.id}:${tt.id}`,
          courseId: c.id,
          ticketTypeId: tt.id,
          distance: c.distance || c.name,
          tierName,
          price: tt.price,
          availableSlots: tt.remainedTicket ?? null,
        });
      } else {
        rows.push({
          key: c.id,
          courseId: c.id,
          distance: c.distance || c.name,
          tierName: c.name && c.name !== c.distance ? c.name : undefined,
          price: c.price,
          availableSlots: c.availableSlots ?? null,
        });
      }
    }
    return rows;
  }, [courses]);
  const selectedRow = pickerRows.find((r) => r.key === selectedKey) ?? null;

  const fetchDetail = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setNotFound(false);
    try {
      const r = await raceSdk.getRaceBySlug(String(path));
      if (!r || !r.id) {
        setNotFound(true);
        setRace(null);
        return;
      }
      setRace(r);

      // Courses: prefer embedded; fallback to dedicated endpoint
      if (r.courses && r.courses.length > 0) {
        setCourses(r.courses as RaceCourse[]);
      } else if (r.id) {
        try {
          const list = await raceCourseSdk.listCoursesByRace(r.id);
          setCourses(list);
        } catch {
          // empty list — UI just hides section
          setCourses([]);
        }
      }
    } catch (err) {
      if (err instanceof FetcherError && err.status === 404) {
        setNotFound(true);
      } else {
        const msg =
          err instanceof FetcherError ? err.message : t('browse.fetchError');
        showToast({ variant: 'error', message: msg });
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [path, showToast, t]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onShare = async () => {
    if (!race) return;
    try {
      const url = `https://5bib.com/events/${race.slug}`;
      await Share.share({
        message: t('browse.shareMessageFmt', { title: race.title, url }),
        url,
        title: race.title,
      });
    } catch {
      // user dismissed — ignore
    }
  };

  const onRegister = () => {
    if (!race) return;
    if (!isAuthed) {
      showToast({
        variant: 'info',
        message: t('browse.needLoginToRegister'),
      });
      router.push({
        pathname: '/login',
        params: { redirect: `/events/${race.slug}` },
      });
      return;
    }
    if (!selectedRow) return;
    router.push({
      pathname: '/checkout',
      params: {
        race_id: race.id,
        course_id: selectedRow.courseId,
        ...(selectedRow.ticketTypeId
          ? { ticket_type_id: selectedRow.ticketTypeId }
          : {}),
      },
    });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header leading="back" onLeadingPress={() => router.back()} title="" />
        <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          <Skeleton height={220} />
          <Skeleton height={28} width="80%" />
          <Skeleton height={16} width="60%" />
          <Skeleton height={16} width="50%" />
          <Skeleton height={120} />
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </ScrollView>
      </View>
    );
  }

  if (notFound || !race) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header leading="back" onLeadingPress={() => router.back()} />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: tokens.space[6],
            gap: tokens.space[3],
          }}
        >
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text
            style={{
              fontSize: tokens.fontSize.h3,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.neutral900,
              marginTop: tokens.space[3],
            }}
          >
            {t('browse.notFoundRace')}
          </Text>
          <Button variant="ghost" size="md" onPress={() => router.back()}>
            {t('common.back')}
          </Button>
        </View>
      </View>
    );
  }

  const fmtDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  // Backend uses `COMPLETE` (not `FINISHED`/`CLOSED`). Verified 2026-05-27 —
  // status enum: GENERATED_CODE = open for sale; COMPLETE = past race.
  const closedStatuses = new Set(['CLOSED', 'FINISHED', 'COMPLETE', 'CANCELLED']);
  const isClosed = closedStatuses.has(String(race.status));
  // DO NOT gate on `race.bibSetUp` — verified 2026-05-27 across all 6 active
  // races on DEV: every one has bib_set_up=false even when sales are LIVE
  // (race 305 has remained_ticket=3 + sales_count=7). The flag is an admin
  // toggle that's never set. Source of truth for availability = per-tier
  // remained_ticket on the selected picker row.
  const selectedHasStock =
    selectedRow?.availableSlots == null /* unknown → trust */ ||
    selectedRow.availableSlots > 0;
  const ctaDisabled = isClosed
    ? false
    : !selectedRow || !selectedHasStock;

  // --- Scroll-driven motion --------------------------------------------------
  // scrollY drives 3 effects:
  //   1) hero parallax: image translates DOWN at half rate so it feels deep
  //   2) hero scale: image scales UP when overscrolled past 0 (rubber-band)
  //   3) sticky header reveal: a white bar fades in once user scrolls past
  //      the hero, with the race title appearing underneath the round buttons
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });
  const HERO_HEIGHT = 240;
  const heroStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-HERO_HEIGHT, 0, HERO_HEIGHT],
      [-HERO_HEIGHT / 2, 0, HERO_HEIGHT / 2],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [-HERO_HEIGHT, 0],
      [1.5, 1],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateY }, { scale }] };
  });
  const stickyStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [HERO_HEIGHT - 120, HERO_HEIGHT - 40],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Animated.ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Hero — parallax: image moves at half scroll rate + scales on
           overscroll. The dark scrim is a separate layer that does NOT
           translate so the cover dives behind it gracefully. */}
        <View style={{ height: HERO_HEIGHT, backgroundColor: tokens.color.neutral300, overflow: 'hidden' }}>
          {race.coverImageUrl ? (
            <Animated.View style={[{ width: '100%', height: '100%' }, heroStyle]}>
              <Image
                source={{ uri: race.coverImageUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </Animated.View>
          ) : null}
          {/* overlay header — buttons stay put as the image parallaxes */}
          <View
            style={{
              position: 'absolute',
              top: insets.top,
              left: 0,
              right: 0,
              height: tokens.layout.headerHeight,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: tokens.space[2],
              justifyContent: 'space-between',
            }}
          >
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel={t('common.back')}
              accessibilityRole="button"
              hitSlop={8}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
              </View>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
              <Pressable
                onPress={onShare}
                accessibilityLabel={t('common.share')}
                accessibilityRole="button"
                hitSlop={8}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 16 }}>⤴</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

        <View style={{ padding: tokens.space[4], gap: tokens.space[4] }}>
          <FadeSlideIn delay={0}>
          <View>
            {/* Race-type badge above title (web: "TRAIL RACE" / "ROAD MARATHON"
               in red pill, top of hero). Surfaced from race.raceType. */}
            {race.raceType ? (
              <View style={{ marginBottom: tokens.space[2], alignSelf: 'flex-start' }}>
                <Badge variant="error">{formatRaceType(race.raceType)}</Badge>
              </View>
            ) : null}
            <Text
              style={{
                fontSize: tokens.fontSize.h1,
                fontWeight: tokens.fontWeight.bold,
                color: tokens.color.neutral900,
              }}
              accessibilityRole="header"
            >
              {race.title}
            </Text>
            {race.isHighlight && (
              <View style={{ marginTop: tokens.space[2] }}>
                <Badge variant="brand">⭐ {t('browse.highlight')}</Badge>
              </View>
            )}
          </View>
          </FadeSlideIn>

          {/* Race-day countdown — web shows ticking THÁNG/NGÀY/GIỜ/PHÚT/GIÂY
             above the courses. FOMO driver before registration. Hidden once
             event has passed (no point counting down a finished race). */}
          {!isClosed && race.startDate ? (
            <FadeSlideIn delay={80}>
              <CountdownRing targetIso={race.startDate} />
            </FadeSlideIn>
          ) : null}

          <FadeSlideIn delay={130}>
          <View style={{ gap: tokens.space[1] }}>
            <Text style={{ fontSize: tokens.fontSize.bodyLg, color: tokens.color.neutral700 }}>
              📅 {fmtDate(race.startDate)}
            </Text>
            {(race.location || race.city) && (
              <Text style={{ fontSize: tokens.fontSize.bodyLg, color: tokens.color.neutral700 }}>
                📍 {race.location ?? race.city}
              </Text>
            )}
          </View>
          </FadeSlideIn>

          <FadeSlideIn delay={180}>
          <View>
            <Badge variant={isClosed ? 'default' : 'success'}>
              {isClosed ? t('browse.statusClosed') : t('browse.statusOpen')}
            </Badge>
          </View>
          </FadeSlideIn>

          {/* Description */}
          {race.description && (
            <FadeSlideIn delay={220}>
            <View style={{ gap: tokens.space[2] }}>
              <SectionLabel label={t('browse.courseDescription')} />
              <Text
                style={{
                  fontSize: tokens.fontSize.bodyMd,
                  color: tokens.color.neutral700,
                  lineHeight: tokens.lineHeight.bodyMd,
                }}
                numberOfLines={descExpanded ? undefined : 3}
              >
                {stripHtml(race.description)}
              </Text>
              <Button variant="ghost" size="sm" onPress={() => setDescExpanded((p) => !p)}>
                {descExpanded ? 'Thu gọn ↑' : 'Xem thêm ↓'}
              </Button>
            </View>
            </FadeSlideIn>
          )}

          {/* Courses — flattened by ticket_type so each tier (Family/ELB/VIP)
             gets its own selectable row. Web shows ALL tiers per course
             (verified 2026-05-28 race 305 has 4 ticket_types in ELB tier). */}
          {pickerRows.length > 0 && (
            <FadeSlideIn delay={260}>
            <View style={{ gap: tokens.space[2] }}>
              <SectionLabel label={t('browse.courses')} />
              <View style={{ gap: tokens.space[2] }}>
                {pickerRows.map((row, idx) => (
                  <StaggerItem key={row.key} index={idx} step={60} maxDelay={240}>
                    <CourseCard
                      course={{
                        id: row.key,
                        distance: row.distance,
                        tierName: row.tierName,
                        price: row.price,
                        availableSlots: row.availableSlots,
                      }}
                      asRadio
                      selected={selectedKey === row.key}
                      onPress={() => setSelectedKey(row.key)}
                    />
                  </StaggerItem>
                ))}
              </View>
            </View>
            </FadeSlideIn>
          )}

          {/* Schedule */}
          {race.schedule && race.schedule.length > 0 && (
            <FadeSlideIn delay={310}>
            <View style={{ gap: tokens.space[2] }}>
              <SectionLabel label={t('browse.schedule')} />
              {race.schedule.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: tokens.space[3] }}>
                  <Text
                    style={{
                      fontSize: tokens.fontSize.bodyMd,
                      color: tokens.color.neutral700,
                      fontWeight: tokens.fontWeight.semibold,
                      fontFamily: 'Menlo',
                      width: 50,
                    }}
                  >
                    {s.time}
                  </Text>
                  <Text style={{ fontSize: tokens.fontSize.bodyMd, color: tokens.color.neutral700 }}>
                    {s.description}
                  </Text>
                </View>
              ))}
            </View>
            </FadeSlideIn>
          )}

          {/* Race kit */}
          {race.racekitImages && race.racekitImages.length > 0 && (
            <FadeSlideIn delay={340}>
            <View style={{ gap: tokens.space[2] }}>
              <SectionLabel label={t('browse.racekit')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
                  {race.racekitImages.map((url, i) => (
                    <Image
                      key={i}
                      source={{ uri: url }}
                      style={{
                        width: 120,
                        height: 120,
                        borderRadius: tokens.radius.md,
                        backgroundColor: tokens.color.neutral200,
                      }}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
            </FadeSlideIn>
          )}
        </View>
      </Animated.ScrollView>

      {/* Sticky top header — appears once user scrolls past the hero.
         Fades in white bg + the race title. Absolutely positioned so it
         sits on top of the scroll without competing for layout space. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top,
            height: insets.top + tokens.layout.headerHeight,
            backgroundColor: tokens.color.surfaceBg,
            borderBottomWidth: 1,
            borderBottomColor: tokens.color.neutral100,
            justifyContent: 'center',
            paddingHorizontal: tokens.space[6],
          },
          stickyStyle,
        ]}
      >
        <Text
          style={{
            fontSize: tokens.fontSize.h3,
            fontWeight: tokens.fontWeight.semibold,
            color: tokens.color.neutral900,
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          {race.title}
        </Text>
      </Animated.View>

      {/* Sticky bottom CTA */}
      <View
        style={{
          paddingHorizontal: tokens.space[4],
          paddingTop: tokens.space[3],
          paddingBottom: insets.bottom + tokens.space[3],
          borderTopWidth: 1,
          borderTopColor: tokens.color.neutral100,
          backgroundColor: tokens.color.surfaceBg,
        }}
      >
        {isClosed ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/result/webview',
                params: { url: `https://result.5bib.com/event/${race.id}` },
              })
            }
          >
            {t('browse.viewResults')}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={ctaDisabled}
            onPress={onRegister}
          >
            {!selectedRow
              ? t('browse.selectCourseToRegister')
              : !selectedHasStock
              ? t('browse.soldOut')
              : t('browse.register')}
          </Button>
        )}
      </View>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: tokens.fontSize.h4,
        fontWeight: tokens.fontWeight.semibold,
        color: tokens.color.neutral900,
        marginTop: tokens.space[2],
      }}
    >
      {label}
    </Text>
  );
}

/** Strip HTML tags while preserving structural line breaks. Backend race
 *  descriptions can have `<p>`, `<br>`, `<ul><li>` — collapsing everything
 *  produces a wall of text. We convert structural tags to newlines BEFORE
 *  stripping, so the rendered plain text retains paragraph rhythm.
 *  Full rich-HTML render (links, images, inline formatting) is Phase 2 —
 *  pull in `react-native-render-html` when PROD content demands it. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>(?!\s*<\/)/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n') // collapse excessive blank lines
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/** Map backend race_type enum → display label. Mirrors web's red pill
 *  ("ROAD MARATHON", "TRAIL RACE"). Unknown values pass through uppercased. */
function formatRaceType(raceType: string): string {
  const map: Record<string, string> = {
    ROAD_MARATHON: 'ROAD MARATHON',
    HILLROAD_RACE: 'ROAD MARATHON',
    TRAIL_RACE: 'TRAIL RACE',
    VIRTUAL_RACE: 'VIRTUAL RACE',
    CYCLING: 'CYCLING',
    TRIATHLON: 'TRIATHLON',
  };
  return map[raceType] ?? raceType.replace(/_/g, ' ');
}

/**
 * Live race-day countdown — re-renders every second to tick down THÁNG /
 * NGÀY / GIỜ / PHÚT / GIÂY. Web has the same widget on its hero section.
 * Cleans up its interval on unmount so we don't leak after navigation.
 */
function Countdown({ targetIso }: { targetIso: string }) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(targetIso).getTime();
  if (!Number.isFinite(target)) return null;
  const diff = Math.max(0, target - now);
  if (diff <= 0) return null;
  const sec = Math.floor(diff / 1000);
  const months = Math.floor(sec / (30 * 86400));
  const days = Math.floor((sec % (30 * 86400)) / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  const Cell = ({ n, label }: { n: number; label: string }) => (
    <View style={{ alignItems: 'center', minWidth: 48 }}>
      <Text
        style={{
          fontSize: tokens.fontSize.h2,
          fontWeight: tokens.fontWeight.bold,
          color: tokens.color.neutral900,
        }}
      >
        {String(n).padStart(2, '0')}
      </Text>
      <Text style={{ fontSize: 10, color: tokens.color.neutral600, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
  return (
    <View
      style={{
        padding: tokens.space[3],
        borderRadius: tokens.radius.md,
        backgroundColor: tokens.color.neutral50,
        gap: tokens.space[2],
      }}
    >
      <Text style={{ fontSize: 11, color: tokens.color.neutral600, letterSpacing: 1 }}>
        ⏱ RACE DAY BẮT ĐẦU TRONG
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
        <Cell n={months} label="THÁNG" />
        <Text style={{ fontSize: tokens.fontSize.h3, color: tokens.color.neutral400 }}>:</Text>
        <Cell n={days} label="NGÀY" />
        <Text style={{ fontSize: tokens.fontSize.h3, color: tokens.color.neutral400 }}>:</Text>
        <Cell n={hours} label="GIỜ" />
        <Text style={{ fontSize: tokens.fontSize.h3, color: tokens.color.neutral400 }}>:</Text>
        <Cell n={minutes} label="PHÚT" />
        <Text style={{ fontSize: tokens.fontSize.h3, color: tokens.color.neutral400 }}>:</Text>
        <Cell n={seconds} label="GIÂY" />
      </View>
    </View>
  );
}
