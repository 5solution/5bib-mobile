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
  Pressable,
  RefreshControl,
  useWindowDimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header } from '../../src/components/Header';
import { BrandLogo } from '../../src/components/BrandLogo';
import { Banner } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { Skeleton } from '../../src/components/Skeleton';
import { Button } from '../../src/components/Button';
import { RaceCard } from '../../src/components/domain/RaceCard';
import { StaggerItem } from '../../src/components/motion';
import { useOnline } from '../../src/hooks';
import { useAuthStore } from '../../src/stores/useAuthStore';
import { useToast } from '../../src/components';
import { tokens } from '../../src/theme/tokens';
import { race as raceSdk } from '../../src/sdk/services/race';
import { FetcherError } from '../../src/sdk/core';
import type { Race } from '../../src/sdk/models';

type LoadState = 'loading' | 'loaded' | 'error' | 'empty';
const PAGE_SIZE = 10;

/**
 * Discovery shortcuts on the home header — web home parity. Race types use
 * the real backend enum (same list as RaceFilterSheet); cities mirror the
 * web home's chip row. Both deep-link into /events with the filter
 * pre-seeded via route params.
 */
const DISCOVER_TYPES: ReadonlyArray<{
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: 'ROAD_MARATHON', label: 'Marathon', icon: 'walk-outline' },
  { value: 'ROAD_HALF_MARATHON', label: 'Half Marathon', icon: 'fitness-outline' },
  { value: 'TRAIL_RACE', label: 'Trail', icon: 'trail-sign-outline' },
  { value: 'ULTRA_RAIL_RACE', label: 'Ultra Trail', icon: 'triangle-outline' },
  { value: 'EKIDEN_RACE', label: 'Ekiden', icon: 'people-outline' },
  { value: 'VIRTUAL', label: 'Virtual', icon: 'phone-portrait-outline' },
];

/**
 * Backend matches province as a contains-filter, so values must align with
 * stored province names. Verified live 2026-06-11 (matches on DEV):
 * Hà Nội 4+, Hồ Chí Minh 15, Đà Nẵng 14, Quảng Bình 14. Web home also
 * lists Đà Lạt, but that's a city inside Lâm Đồng province → 0 matches,
 * so we swap it for Quảng Bình which actually has data.
 */
const DISCOVER_CITIES: ReadonlyArray<string> = [
  'Hà Nội',
  'Hồ Chí Minh',
  'Đà Nẵng',
  'Quảng Bình',
];

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
  // raceId → { from, to } VND price range computed from per-race
  // /pub/simple-course fetch. Empty until courses load, render hides row.
  const [priceRanges, setPriceRanges] = useState<
    Record<string, { from: number; to: number }>
  >({});

  // Compute price range Map for a batch of races. Parallel SDK fetch — one
  // round-trip latency for N races. Swallows per-race errors so a single
  // bad race doesn't drop the whole card grid's pricing.
  const fetchPriceRanges = useCallback(async (rs: Race[]) => {
    const ids = rs.map((r) => r.id).filter(Boolean);
    if (ids.length === 0) return;
    try {
      const groups = await raceSdk.getCoursesByRaces(ids);
      const next: Record<string, { from: number; to: number }> = {};
      for (const [raceId, courses] of groups.entries()) {
        const prices: number[] = [];
        for (const c of courses) {
          if (c.ticketTypes && c.ticketTypes.length > 0) {
            for (const tt of c.ticketTypes) {
              if (tt.price > 0) prices.push(tt.price);
            }
          } else if (c.price > 0) {
            prices.push(c.price);
          }
        }
        if (prices.length > 0) {
          next[raceId] = {
            from: Math.min(...prices),
            to: Math.max(...prices),
          };
        }
      }
      setPriceRanges((prev) => ({ ...prev, ...next }));
    } catch {
      // Soft-fail — card just hides price row.
    }
  }, []);

  const featured = useMemo(() => races.filter((r) => r.isHighlight).slice(0, 5), [races]);

  const fetchPage = useCallback(
    async (pageNo: number): Promise<{ items: Race[]; totalPages: number } | null> => {
      try {
        // Backend /pub/race quirks (verified 2026-05-27):
        //   - `sort_field` / `sort_direction` → 400 "Mismatch request param"
        //   - `page_no` → IGNORED. Backend always returns currentPage=0 +
        //     same 10 items regardless of page. Pagination broken server-side.
        //   - `page_size` → CAPPED at 10. Higher values ignored.
        //   - `status` → ✅ honored. `GENERATED_CODE` = open for sale, only
        //     6 races on DEV (incl. 5BIB Find Your New Experience id=305).
        //     Without this filter the home shows only the first 10 COMPLETE
        //     races — user can never find an active race to register for.
        // Pagination works now that the SDK sends camelCase pageNo/pageSize
        // (the old snake_case page_no was silently ignored — infinite scroll
        // re-appended page 1 forever). Sort matches the web home: status
        // first, then soonest event.
        const res = await raceSdk.listRaces({
          pageNo,
          pageSize: PAGE_SIZE,
          status: 'GENERATED_CODE',
          sortField: 'status,eventStartDate,checkinStartTime,racekitStartTime,id',
          sortDirection: 'DESC',
        });
        return { items: res.items, totalPages: res.pagination.totalPages ?? 1 };
      } catch (err) {
        let msg = err instanceof FetcherError ? err.message : t('browse.fetchError');
        // Backend rate-limit (HTTP 429 OR body "Too many pub requests")
        if (err instanceof FetcherError) {
          if (err.status === 429) msg = 'Backend đang quá tải, thử lại sau ~30s';
          else if (
            typeof err.response === 'object' &&
            err.response !== null &&
            'message' in err.response &&
            String((err.response as { message: unknown }).message).toLowerCase().includes('too many')
          ) {
            msg = 'Backend đang quá tải, thử lại sau ~30s';
          }
        }
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
    // Kick off price range fetch in background — doesn't block card render.
    void fetchPriceRanges(res.items);
  }, [fetchPage, fetchPriceRanges]);

  // Load ONCE on mount. `load` callback ref may change every render due to
  // useTranslation `t` reference instability — eslint-disable to avoid infinite
  // re-fetch loop that previously hammered backend rate limits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

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
      void fetchPriceRanges(res.items);
    }
    setLoadingMore(false);
  };

  if (state === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header leading={<BrandLogo width={68} style={{ marginLeft: 4 }} />} actions={[]} />
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
        <Header leading={<BrandLogo width={68} style={{ marginLeft: 4 }} />} />
        {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}
        <EmptyState
          icon={<Ionicons name="walk-outline" size={32} color={tokens.color.neutral500} />}
          title={t('browse.emptyNoFilter')}
        />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header leading={<BrandLogo width={68} style={{ marginLeft: 4 }} />} />
        {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}
        <EmptyState
          icon={<Ionicons name="alert-circle-outline" size={32} color={tokens.color.warning} />}
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
        leading={<BrandLogo width={68} style={{ marginLeft: 4 }} />}
        actions={[
          {
            icon: <Ionicons name="search-outline" size={22} color={tokens.color.neutral900} />,
            label: t('common.search'),
            onPress: () => router.push('/events'),
          },
          {
            icon: <Ionicons name="notifications-outline" size={22} color={tokens.color.neutral900} />,
            label: t('profile.notifications'),
            onPress: () => {},
          },
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
                        priceFrom={priceRanges[race.id]?.from}
                        priceTo={priceRanges[race.id]?.to}
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

            {/* Discovery rows — web home parity (G-03 race-type categories,
               G-04 city chips). Each chip deep-links into the events list
               with the filter pre-seeded via route params. */}
            <View style={{ gap: tokens.space[2], marginTop: tokens.space[2] }}>
              <Text
                style={{
                  fontSize: tokens.fontSize.h3,
                  fontWeight: tokens.fontWeight.semibold,
                  color: tokens.color.neutral900,
                }}
                accessibilityRole="header"
              >
                {t('browse.discoverByType')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
                  {DISCOVER_TYPES.map((d) => (
                    <Pressable
                      key={d.value}
                      onPress={() =>
                        router.push({ pathname: '/events', params: { raceType: d.value } })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={d.label}
                      style={({ pressed }) => ({
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        width: 92,
                        paddingVertical: tokens.space[3],
                        borderRadius: tokens.radius.lg,
                        backgroundColor: pressed
                          ? tokens.color.brandPrimaryLight
                          : tokens.color.neutral50,
                        borderWidth: 1,
                        borderColor: tokens.color.neutral200,
                      })}
                    >
                      <Ionicons name={d.icon} size={26} color={tokens.color.brandPrimary} />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: tokens.fontWeight.medium,
                          color: tokens.color.neutral800,
                          textAlign: 'center',
                        }}
                        numberOfLines={1}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
                  {DISCOVER_CITIES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() =>
                        router.push({ pathname: '/events', params: { city: c } })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${t('browse.filterRegion')}: ${c}`}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: tokens.space[3],
                        paddingVertical: tokens.space[1],
                        borderRadius: tokens.radius.full,
                        backgroundColor: pressed
                          ? tokens.color.brandPrimaryLight
                          : tokens.color.neutral100,
                        minHeight: 32,
                        justifyContent: 'center',
                      })}
                    >
                      <Ionicons
                        name="location-outline"
                        size={13}
                        color={tokens.color.neutral700}
                      />
                      <Text
                        style={{
                          fontSize: tokens.fontSize.labelSm,
                          fontWeight: tokens.fontWeight.medium,
                          color: tokens.color.neutral700,
                        }}
                      >
                        {c}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

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
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <RaceCard
              race={item}
              priceFrom={priceRanges[item.id]?.from}
              priceTo={priceRanges[item.id]?.to}
              onPress={() => router.push(`/events/${item.slug}`)}
            />
          </StaggerItem>
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
