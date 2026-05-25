/**
 * apps/mobile/app/events/[path].tsx — S-BROWSE-03 Event Detail.
 *
 * States: Loading | Filled | Open (CTA: select course) | Closed/Finished (CTA: results) | bib_set_up=false (disabled)
 * BR-BROWSE-11: anonymous tap CTA → modal đăng nhập.
 * BR-BROWSE-13: closed/finished race → open result.5bib.com webview.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
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
import { tokens } from '../../src/theme/tokens';
import type { Race } from '../../src/sdk/models';

const MOCK_RACE: Race = {
  id: '1',
  slug: 'saigon-marathon-2026',
  title: 'Saigon Marathon 2026',
  description:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
  coverImageUrl: null,
  startDate: '2026-03-15T06:00:00Z',
  location: 'TP.HCM, Phú Mỹ Hưng',
  city: 'TP.HCM',
  isHighlight: true,
  bibSetUp: true,
  status: 'OPEN_FOR_SALE',
  courses: [
    { id: 'c1', name: '5 km', distance: '5 km', price: 200_000, availableSlots: 50 },
    { id: 'c2', name: '10 km', distance: '10 km', price: 350_000 },
    { id: 'c3', name: '21 km', distance: '21 km', price: 500_000 },
  ],
  schedule: [
    { time: '04:30', description: 'Mở cổng' },
    { time: '05:30', description: 'Khởi động' },
    { time: '06:00', description: 'Xuất phát 21km' },
  ],
};

export default function EventDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const online = useOnline();
  const { path } = useLocalSearchParams<{ path: string }>();

  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await new Promise((r) => setTimeout(r, 600));
      setRace(MOCK_RACE);
      setLoading(false);
    })();
  }, [path]);

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

  if (!race) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header leading="back" onLeadingPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.space[6] }}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text style={{ fontSize: tokens.fontSize.h3, fontWeight: tokens.fontWeight.semibold, marginTop: tokens.space[3] }}>
            Không tìm thấy giải
          </Text>
        </View>
      </View>
    );
  }

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
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
          {race.coverImageUrl && (
            <Image source={{ uri: race.coverImageUrl }} style={{ width: '100%', height: '100%' }} />
          )}
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
            <Button
              variant="ghost"
              size="md"
              onPress={() => router.back()}
              accessibilityLabel="Quay lại"
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
            </Button>
            <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                accessibilityLabel={t('common.share')}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>⤴</Text>
              </View>
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
              📅 {fmtDate(race.startDate)} · 6:00 sáng
            </Text>
            <Text style={{ fontSize: tokens.fontSize.bodyLg, color: tokens.color.neutral700 }}>
              📍 {race.location}
            </Text>
          </View>

          <View>
            <Badge variant={isClosed ? 'default' : 'success'}>
              {isClosed ? t('browse.statusClosed') : t('browse.statusOpen')}
            </Badge>
          </View>

          {/* Description */}
          <View style={{ gap: tokens.space[2] }}>
            <SectionLabel label="Giới thiệu" />
            <Text
              style={{
                fontSize: tokens.fontSize.bodyMd,
                color: tokens.color.neutral700,
                lineHeight: tokens.lineHeight.bodyMd,
              }}
              numberOfLines={descExpanded ? undefined : 3}
            >
              {race.description}
            </Text>
            <Button variant="ghost" size="sm" onPress={() => setDescExpanded((p) => !p)}>
              {descExpanded ? 'Thu gọn ↑' : 'Xem thêm ↓'}
            </Button>
          </View>

          {/* Courses */}
          <View style={{ gap: tokens.space[2] }}>
            <SectionLabel label={t('browse.courses')} />
            <View style={{ gap: tokens.space[2] }}>
              {race.courses?.map((c) => (
                <CourseCard
                  key={c.id}
                  course={c}
                  selected={selectedCourseId === c.id}
                  onPress={() => setSelectedCourseId(c.id)}
                />
              ))}
            </View>
          </View>

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
            onPress={() =>
              router.push({
                pathname: '/checkout',
                params: { race_id: race.id, course_id: selectedCourseId! },
              })
            }
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
