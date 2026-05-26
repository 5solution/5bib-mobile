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
import type { MyResultItem, RaceResultRow } from '../../src/sdk/models';
import { athlete } from '../../src/sdk/services/athlete';
import { result as resultSdk } from '../../src/sdk/services/result';

const medalIcon: Record<string, string> = { gold: '🥇', silver: '🥈', bronze: '🥉' };

/**
 * Pick a medal tier from rank when backend doesn't provide one.
 */
function medalFromRank(rank?: number): MyResultItem['medal'] {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return null;
}

function rowToItem(r: RaceResultRow): MyResultItem {
  const raceDate = r.raceDate ?? new Date().toISOString();
  return {
    raceId: r.raceId ?? r.id,
    raceName: r.raceName ?? '—',
    courseId: r.courseId ?? '',
    courseName: r.courseName ?? '',
    distance: r.courseName ?? '',
    distanceMeters: 0,
    raceDate,
    bib: r.bib ?? '',
    finishTime: r.finishTime ?? '',
    overallRank: r.rank ?? 0,
    medal: medalFromRank(r.rank),
  };
}

export default function RaceHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const [items, setItems] = useState<MyResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setError(null);
    try {
      // Prefer flat `result.listMyResults` shape — `athlete.getMyResults`
      // returns a paged envelope used by other screens.
      const rows = await resultSdk.listMyResults({ pageSize: 100 });
      if (rows.length > 0) {
        setItems(rows.map(rowToItem));
        return;
      }
      // Fallback: athlete service (already-normalized items) when the public
      // path returns nothing.
      const fallback = await athlete.getMyResults({ pageSize: 100 });
      setItems(fallback.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
      setItems([]);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const grouped = items.reduce<Record<string, MyResultItem[]>>((acc, it) => {
    const year = String(new Date(it.raceDate).getFullYear());
    const bucket = acc[year] ?? (acc[year] = []);
    bucket.push(it);
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
      {error && <Banner variant="error" message={t('errors.generic')} />}

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
                await load();
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
