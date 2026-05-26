/**
 * apps/mobile/app/(tabs)/home.tsx — S-BROWSE-01 Home tab race feed
 *
 * States: Loading (skeleton) | Filled | Empty | Error | Offline | Refreshing
 * Pull-to-refresh + infinite scroll (BR-GLOBAL-12, BR-BROWSE-01).
 *
 * Data: GET /pub/race via `race.listRaces({ status, pageNo, pageSize, sortField, sortDirection })`.
 * Featured = client-side filter `isHighlight === true` (BR-BROWSE-03 — backend param
 * `is_highlight` exists in SDK but compatibility with this dev env not confirmed —
 * filter client-side is safe + identical UX).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { Skeleton } from '../../src/components/Skeleton';
import { Button } from '../../src/components/Button';
import { RaceCard } from '../../src/components/domain/RaceCard';
import { useOnline } from '../../src/hooks';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useToast } from '../../src/components';
import { tokens } from '../../src/theme/tokens';
import { race as raceSdk } from '../../src/sdk/services/race';
import { FetcherError } from '../../src/sdk/core';
import type { Race } from '../../src/sdk/models';

type LoadState = 'loading' | 'loaded' | 'error' | 'empty';
const PAGE_SIZE = 10;

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const { width } = useWindowDimensions();
  const { show: showToast } = useToast();
  const user = useAuthStore((s) => s.user);

  const [state, setState] = useState<LoadState>('loading');
  const [races, setRaces] = useState<Race[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [carouselPage, setCarouselPage] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const featured = useMemo(() => races.filter((r) => r.isHighlight).slice(0, 5), [races]);

  const fetchPage = useCallback(
    async (pageNo: number): Promise<{ items: Race[]; totalPages: number } | null> => {
      try {
        const res = await raceSdk.listRaces({
          pageNo,
          pageSize: PAGE_SIZE,
          status: 'OPEN_FOR_SALE',
          sortField: 'start_date',
          sortDirection: 'ASC',
        });
        return { items: res.items, totalPages: res.pagination.totalPages ?? 1 };
      } catch (err) {
        const msg =
          err instanceof FetcherError ? err.message : t('browse.fetchError');
        showToast({ variant: 'error', message: msg });
        return null;
      }
    },
    [showToast, t],
  );

  const load = useCallback(async () => {
    setState('loading');
    const res = await fetchPage(1);
    if (!res) {
      setState('error');
      return;
    }
    setRaces(res.items);
    setPage(1);
    setTotalPages(res.totalPages);
    setState(res.items.length ? 'loaded' : 'empty');
  }, [fetchPage]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    const res = await fetchPage(1);
    if (res) {
      setRaces(res.items);
      setPage(1);
      setTotalPages(res.totalPages);
      setState(res.items.length ? 'loaded' : 'empty');
    }
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    const next = page + 1;
    const res = await fetchPage(next);
    if (res) {
      setRaces((prev) => [...prev, ...res.items]);
      setPage(next);
      setTotalPages(res.totalPages);
    }
    setLoadingMore(false);
  };

  if (state === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header title="5BIB" titleAlign="left" leading="none" actions={[]} />
        <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[4] }}>
          <Skeleton height={180} borderRadius={tokens.radius.lg} />
          <Skeleton width={200} height={20} />
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: tokens.space[3],
                padding: tokens.space[4],
                backgroundColor: tokens.color.surfaceCard,
                borderRadius: tokens.radius.lg,
                ...tokens.elevation[1],
              }}
            >
              <Skeleton width={80} height={80} borderRadius={tokens.radius.md} />
              <View style={{ flex: 1, gap: tokens.space[2] }}>
                <Skeleton height={18} width="80%" />
                <Skeleton height={14} width="60%" />
                <Skeleton height={14} width="50%" />
                <Skeleton height={20} width={120} borderRadius={tokens.radius.full} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header title="5BIB" titleAlign="left" leading="none" />
        {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}
        <EmptyState
          icon={<Text style={{ fontSize: 32 }}>🏃</Text>}
          title={t('browse.emptyNoFilter')}
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header title="5BIB" titleAlign="left" leading="none" />
        {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}
        <EmptyState
          icon={<Text style={{ fontSize: 32 }}>⚠️</Text>}
          title={t('browse.fetchError')}
          ctaLabel={t('common.retry')}
          onPress={load}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title="5BIB"
        titleAlign="left"
        leading="none"
        actions={[
          {
            icon: '🔍',
            label: t('common.search'),
            onPress: () => router.push('/events'),
          },
          { icon: '🔔', label: t('profile.notifications'), onPress: () => {} },
        ]}
      />
      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      <FlatList
        data={races}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{
          padding: tokens.space[4],
          paddingBottom: tokens.space[10],
          gap: tokens.space[3],
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={tokens.color.brandPrimary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: tokens.space[4], marginBottom: tokens.space[2] }}>
            <Text
              style={{
                fontSize: tokens.fontSize.bodyLg,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.color.neutral700,
              }}
            >
              {user?.fullName
                ? t('browse.homeGreeting', { name: user.fullName })
                : t('browse.homeGreetingAnon')}
            </Text>

            {/* Featured carousel */}
            {featured.length > 0 && (
              <View>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) =>
                    setCarouselPage(
                      Math.round(
                        e.nativeEvent.contentOffset.x / (width - tokens.space[8]),
                      ),
                    )
                  }
                  accessibilityLabel={t('browse.featuredCarouselLabel')}
                >
                  {featured.map((race) => (
                    <View
                      key={race.id}
                      style={{
                        width: width - tokens.space[8],
                        paddingRight: tokens.space[3],
                      }}
                    >
                      <RaceCard
                        race={race}
                        variant="featured"
                        onPress={() => router.push(`/events/${race.slug}`)}
                      />
                    </View>
                  ))}
                </ScrollView>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 4,
                    justifyContent: 'center',
                    marginTop: tokens.space[2],
                  }}
                >
                  {featured.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: carouselPage === i ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor:
                          carouselPage === i
                            ? tokens.color.brandPrimary
                            : tokens.color.neutral300,
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            <Text
              style={{
                fontSize: tokens.fontSize.h3,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.color.neutral900,
                marginTop: tokens.space[2],
              }}
              accessibilityRole="header"
            >
              {t('browse.upcomingRaces')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RaceCard race={item} onPress={() => router.push(`/events/${item.slug}`)} />
        )}
        onEndReachedThreshold={0.5}
        onEndReached={loadMore}
        ListFooterComponent={
          <View style={{ paddingTop: tokens.space[4], gap: tokens.space[3] }}>
            {loadingMore && (
              <ActivityIndicator color={tokens.color.brandPrimary} />
            )}
            {page >= totalPages && races.length >= PAGE_SIZE && (
              <Text
                style={{
                  color: tokens.color.neutral500,
                  fontSize: tokens.fontSize.bodySm,
                  textAlign: 'center',
                }}
              >
                {t('browse.endOfList', { count: races.length })}
              </Text>
            )}
            {races.length >= 5 && (
              <Button
                variant="ghost"
                size="md"
                fullWidth
                onPress={() => router.push('/events')}
              >
                {t('browse.viewAllRaces')} →
              </Button>
            )}
          </View>
        }
      />
    </View>
  );
}
