/**
 * apps/mobile/app/events/index.tsx — S-BROWSE-02 All events list.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { Skeleton } from '../../src/components/Skeleton';
import { Button } from '../../src/components/Button';
import { RaceCard } from '../../src/components/domain/RaceCard';
import { FilterChip } from '../../src/components/domain/FilterChip';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import type { Race } from '../../src/sdk/models';

export default function AllEventsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();

  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<{ id: string; label: string }[]>([
    { id: 'status', label: 'Đang mở' },
    { id: 'city', label: 'TP.HCM' },
  ]);

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const mock: Race[] = Array.from({ length: 8 }, (_, i) => ({
      id: `r${i + 1}`,
      slug: `race-${i + 1}`,
      title: `Giải số ${i + 1} năm 2026`,
      coverImageUrl: null,
      startDate: `2026-0${(i % 9) + 1}-15T06:00:00Z`,
      location: i % 2 ? 'Hà Nội' : 'TP.HCM',
      isHighlight: i === 0,
      bibSetUp: true,
      status: 'OPEN_FOR_SALE',
      courses: [
        { id: `${i}-1`, name: '5km', distance: '5km', price: 200_000 },
        { id: `${i}-2`, name: '10km', distance: '10km', price: 350_000 },
      ],
    }));
    setRaces(reset ? mock : [...races, ...mock]);
    setTotalCount(40);
    setHasMore(races.length + mock.length < 40);
    setLoading(false);
  }, [races]);

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const filtered = races.length === 0 && filters.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title={t('browse.allRacesTitle')}
        onLeadingPress={() => router.back()}
        actions={[
          { icon: '🔍', label: t('common.search'), onPress: () => {} },
          { icon: '⚙', label: t('browse.filter'), onPress: () => {} },
        ]}
      />
      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      {filters.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: tokens.space[4],
            paddingVertical: tokens.space[2],
            gap: tokens.space[2],
          }}
        >
          {filters.map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              onRemove={() => setFilters((p) => p.filter((x) => x.id !== f.id))}
            />
          ))}
        </ScrollView>
      )}

      {loading && races.length === 0 ? (
        <View style={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={i}
              style={{
                padding: tokens.space[4],
                borderRadius: tokens.radius.lg,
                backgroundColor: tokens.color.surfaceCard,
                gap: tokens.space[2],
                ...tokens.elevation[1],
              }}
            >
              <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
                <Skeleton width={80} height={80} borderRadius={tokens.radius.md} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton height={18} width="80%" />
                  <Skeleton height={14} width="60%" />
                  <Skeleton height={14} width="50%" />
                  <Skeleton height={20} width={120} borderRadius={tokens.radius.full} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : races.length === 0 ? (
        <EmptyState
          title={filtered ? t('browse.emptyFiltered') : t('browse.emptyNoFilter')}
          ctaLabel={filtered ? t('browse.filterClearAll') : undefined}
          onPress={() => setFilters([])}
        />
      ) : (
        <FlatList
          data={races}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={tokens.color.brandPrimary}
            />
          }
          renderItem={({ item }) => (
            <RaceCard race={item} onPress={() => router.push(`/events/${item.slug}`)} />
          )}
          onEndReachedThreshold={0.5}
          onEndReached={() => hasMore && !loading && load()}
          ListFooterComponent={
            <View style={{ paddingVertical: tokens.space[4], alignItems: 'center' }}>
              {hasMore && loading ? (
                <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}>
                  {t('browse.loadingMore')}
                </Text>
              ) : !hasMore ? (
                <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}>
                  {t('browse.endOfList', { count: totalCount })}
                </Text>
              ) : null}
            </View>
          }
        />
      )}
    </View>
  );
}
