/**
 * apps/mobile/app/result/race-history.tsx — S-RESULT-05 My Race History
 *
 * States: Loading | Filled (grouped by year) | Empty | Error | Offline.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, SectionList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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

/** Medal tint per podium tier — rendered as an Ionicons `medal` glyph. */
const medalColor: Record<string, string> = {
  gold: '#D4AF37',
  silver: '#9CA3AF',
  bronze: '#CD7F32',
};

/**
 * Pick a medal tier from rank when backend doesn't provide one.
 */
function medalFromRank(rank?: number): MyResultItem['medal'] {
  if (rank === 1) return 'gold';
  if (rank === 2) return 'silver';
  if (rank === 3) return 'bronze';
  return null;
}

/** "10KM" / "21km" / "21.1" → metres; unparseable → 0. */
function distanceToMeters(d?: string): number {
  if (!d) return 0;
  const m = /([\d.]+)/.exec(d);
  const km = m ? Number(m[1]) : NaN;
  return Number.isFinite(km) ? Math.round(km * 1000) : 0;
}

function rowToItem(r: RaceResultRow): MyResultItem {
  // F27: race/course identity comes from the nested course_info block (the
  // normalizer maps it) — distance is a display string like "10KM". No
  // race_date exists on the wire; leave it empty rather than faking today
  // (which used to bucket every result under the current year).
  const distance = r.distance ?? r.courseName ?? '';
  return {
    raceId: r.raceId ?? r.id,
    raceName: r.raceName ?? '—',
    courseId: r.courseId ?? '',
    courseName: r.courseName ?? '',
    distance,
    distanceMeters: distanceToMeters(distance),
    raceDate: r.raceDate ?? '',
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
    const d = new Date(it.raceDate ?? '');
    const year = isNaN(d.getTime()) ? '—' : String(d.getFullYear());
    const bucket = acc[year] ?? (acc[year] = []);
    bucket.push(it);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    // Newest year first; the dateless "—" bucket sinks to the bottom.
    .sort(([a], [b]) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isNaN(na)) return 1;
      if (Number.isNaN(nb)) return -1;
      return nb - na;
    })
    .map(([year, data]) => ({ title: year, data }));

  // `|| 0` guards the athlete.getMyResults fallback path whose rows are a
  // raw cast and may lack distanceMeters entirely (NaN poisoning the sum).
  const totalKm = (items.reduce((sum, i) => sum + (i.distanceMeters || 0), 0) / 1000).toFixed(0);

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
          icon={<Ionicons name="trophy-outline" size={32} color={tokens.color.neutral500} />}
          title={t('result.historyEmpty')}
          description={t('result.historyEmptyDesc')}
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
                  {item.medal ? (
                    <>
                      <Ionicons name="medal" size={15} color={medalColor[item.medal]} />{' '}
                    </>
                  ) : null}
                  {item.raceName}
                </Text>
                <Text style={{ color: tokens.color.neutral600 }}>
                  {[
                    (() => {
                      const d = new Date(item.raceDate ?? '');
                      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('vi-VN');
                    })(),
                    item.distance,
                    item.finishTime,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                {item.overallRank > 0 && (
                  <Text style={{ color: tokens.color.neutral600 }}>
                    {t('result.rankOnly', { rank: item.overallRank })}
                  </Text>
                )}
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
