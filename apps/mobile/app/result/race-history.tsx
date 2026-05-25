/**
 * apps/mobile/app/result/race-history.tsx — S-RESULT-05 My Race History
 *
 * States: Loading | Filled (grouped by year) | Empty | Error | Offline.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, SectionList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Skeleton } from '../../src/components/Skeleton';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import type { MyResultItem } from '../../src/sdk/models';

const MOCK: MyResultItem[] = [
  {
    raceId: '1',
    raceName: 'Saigon Marathon',
    courseId: 'c1',
    courseName: '5km',
    distance: '5km',
    distanceMeters: 5000,
    raceDate: '2026-03-15T06:00:00Z',
    bib: 'A1234',
    finishTime: '23:45',
    overallRank: 15,
    medal: 'gold',
  },
  {
    raceId: '2',
    raceName: 'Hanoi Half',
    courseId: 'c2',
    courseName: '21km',
    distance: '21km',
    distanceMeters: 21097,
    raceDate: '2025-11-22T05:30:00Z',
    bib: 'B0567',
    finishTime: '2:11:42',
    overallRank: 87,
    medal: null,
  },
];

const medalIcon: Record<string, string> = { gold: '🥇', silver: '🥈', bronze: '🥉' };

export default function RaceHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const [items, setItems] = useState<MyResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      await new Promise((r) => setTimeout(r, 500));
      setItems(MOCK);
      setLoading(false);
    })();
  }, []);

  const grouped = items.reduce<Record<string, MyResultItem[]>>((acc, it) => {
    const year = String(new Date(it.raceDate).getFullYear());
    if (!acc[year]) acc[year] = [];
    acc[year].push(it);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, data]) => ({ title: year, data }));

  const totalKm = (items.reduce((sum, i) => sum + i.distanceMeters, 0) / 1000).toFixed(0);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title={t('result.historyTitle')}
        leading="back"
        onLeadingPress={() => router.back()}
      />
      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      {loading ? (
        <View style={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          <Skeleton height={28} width={200} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={100} />
          ))}
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Text style={{ fontSize: 32 }}>🏆</Text>}
          title="Chưa có lịch sử thi đấu"
          description="Hoàn thành race đầu tiên để thấy ở đây"
          ctaLabel={t('browse.viewAllRaces')}
          onPress={() => router.push('/events')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(it, i) => `${it.raceId}-${it.bib}-${i}`}
          contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await new Promise((r) => setTimeout(r, 500));
                setRefreshing(false);
              }}
              tintColor={tokens.color.brandPrimary}
            />
          }
          ListHeaderComponent={
            <Text style={{ color: tokens.color.neutral600, fontSize: tokens.fontSize.bodyMd }}>
              {t('result.historySummary', { races: items.length, km: totalKm })}
            </Text>
          }
          renderSectionHeader={({ section }) => (
            <Text
              style={{
                fontSize: tokens.fontSize.labelSm,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.color.neutral500,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginTop: tokens.space[3],
                marginBottom: tokens.space[2],
              }}
            >
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Card>
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: tokens.fontSize.bodyLg, fontWeight: tokens.fontWeight.semibold }}>
                  {item.medal ? medalIcon[item.medal] + ' ' : ''}
                  {item.raceName}
                </Text>
                <Text style={{ color: tokens.color.neutral600 }}>
                  {new Date(item.raceDate).toLocaleDateString('vi-VN')} · {item.distance} · {item.finishTime}
                </Text>
                <Text style={{ color: tokens.color.neutral600 }}>
                  {t('result.rankLabel', { rank: item.overallRank, total: 250 })}
                </Text>
              </View>
              <View style={{ marginTop: tokens.space[2] }}>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() =>
                    router.push({
                      pathname: '/result/webview',
                      params: { url: `https://result.5bib.com/event/${item.raceId}/bib/${item.bib}` },
                    })
                  }
                >
                  {t('result.viewDetail')} →
                </Button>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
