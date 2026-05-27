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

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Image, Pressable, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { Skeleton } from '../../src/components/Skeleton';
import { Banner } from '../../src/components/ErrorState';
import { CourseCard } from '../../src/components/domain/CourseCard';
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
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

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
    router.push({
      pathname: '/checkout',
      params: { race_id: race.id, course_id: selectedCourseId! },
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

  const isClosed = race.status === 'CLOSED' || race.status === 'FINISHED';
  const ctaDisabled = !race.bibSetUp && !isClosed;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={{ height: 240, backgroundColor: tokens.color.neutral300 }}>
          {race.coverImageUrl ? (
            <Image
              source={{ uri: race.coverImageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : null}
          {/* overlay header */}
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
          <View>
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

          <View>
            <Badge variant={isClosed ? 'default' : 'success'}>
              {isClosed ? t('browse.statusClosed') : t('browse.statusOpen')}
            </Badge>
          </View>

          {/* Description */}
          {race.description && (
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
          )}

          {/* Courses */}
          {courses.length > 0 && (
            <View style={{ gap: tokens.space[2] }}>
              <SectionLabel label={t('browse.courses')} />
              <View style={{ gap: tokens.space[2] }}>
                {courses.map((c) => (
                  <CourseCard
                    key={c.id}
                    course={{
                      id: c.id,
                      distance: c.distance || c.name,
                      price: c.price,
                      availableSlots: c.availableSlots,
                      saleOpenAt: c.saleOpenAt,
                      saleCloseAt: c.saleCloseAt,
                    }}
                    asRadio
                    selected={selectedCourseId === c.id}
                    onPress={() => setSelectedCourseId(c.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Schedule */}
          {race.schedule && race.schedule.length > 0 && (
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
          )}

          {/* Race kit */}
          {race.racekitImages && race.racekitImages.length > 0 && (
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
          )}
        </View>
      </ScrollView>

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
            disabled={ctaDisabled || !selectedCourseId}
            onPress={onRegister}
          >
            {ctaDisabled
              ? t('browse.raceClosedRegister')
              : !selectedCourseId
              ? t('browse.selectCourseToRegister')
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

/** Strip HTML tags — backend description sometimes contains rich HTML. Mobile
 *  MVP renders plain text; full HTML render deferred to Phase 2. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
