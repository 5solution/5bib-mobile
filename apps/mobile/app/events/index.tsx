/**
 * apps/mobile/app/events/index.tsx — S-BROWSE-02 All events list.
 *
 * Wires `useBrowseFilterStore` (status, city, raceType, searchQuery) to
 * `race.listRaces` calls. Filters debounce search (300ms — BR-BROWSE-06)
 * before refetch. Filter chips reflect active store filters; tap-X removes one.
 *
 * Backend probe: `is_highlight`, `bib_set_up`, `race_type`, `title` params are
 * declared in API_REFERENCE but not all confirmed live. SDK passes them through
 * `toLegacyListParams`; if backend ignores, list returns full data (graceful).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { Skeleton } from '../../src/components/Skeleton';
import { Input } from '../../src/components/Input';
import { RaceCard } from '../../src/components/domain/RaceCard';
import { FilterChip } from '../../src/components/domain/FilterChip';
import { StaggerItem } from '../../src/components/motion';
import { RaceFilterSheet } from '../../src/components/domain/RaceFilterSheet';
import { useOnline, useDebouncedValue } from '../../src/hooks';
import { useBrowseFilterStore } from '../../src/stores/useBrowseFilterStore';
import { useToast } from '../../src/components';
import { tokens } from '../../src/theme/tokens';
import { race as raceSdk } from '../../src/sdk/services/race';
import { FetcherError } from '../../src/sdk/core';
import type { Race, RaceStatus } from '../../src/sdk/models';

const PAGE_SIZE = 10;

function sortFieldToBackend(field: string): string {
  switch (field) {
    case 'date':
      return 'start_date';
    case 'name':
      return 'title';
    default:
      return 'start_date';
  }
}

export default function AllEventsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const { show: showToast } = useToast();
  const filterStore = useBrowseFilterStore();

  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(false);

  // Search bar local state — debounced before firing
  const [searchActive, setSearchActive] = useState(false);
  const [searchInput, setSearchInput] = useState(filterStore.searchQuery);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const fetchPage = useCallback(
    async (pageNo: number) => {
      const titleParam = debouncedSearch.trim() || undefined;
      try {
        const res = await raceSdk.listRaces({
          pageNo,
          pageSize: PAGE_SIZE,
          status: filterStore.status === 'ALL' ? undefined : (filterStore.status as RaceStatus),
          raceType: filterStore.raceType === 'ALL' ? undefined : filterStore.raceType,
          title: titleParam,
          sortField: sortFieldToBackend(filterStore.sortField),
          sortDirection: filterStore.sortDirection === 'asc' ? 'ASC' : 'DESC',
        });
        return res;
      } catch (err) {
        const msg =
          err instanceof FetcherError ? err.message : t('browse.fetchError');
        showToast({ variant: 'error', message: msg });
        return null;
      }
    },
    [
      debouncedSearch,
      filterStore.status,
      filterStore.raceType,
      filterStore.sortField,
      filterStore.sortDirection,
      showToast,
      t,
    ],
  );

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      setError(false);
      const res = await fetchPage(1);
      if (!res) {
        setError(true);
        if (mode === 'initial') setLoading(false);
        return;
      }
      // Client-side city filter (backend doesn't support city query param per API_REFERENCE)
      const items = applyCityFilter(res.items, filterStore.city);
      setRaces(items);
      setPage(1);
      setTotalPages(res.pagination.totalPages ?? 1);
      setTotalCount(res.pagination.totalCount ?? items.length);
      if (mode === 'initial') setLoading(false);
    },
    [fetchPage, filterStore.city],
  );

  useEffect(() => {
    load('initial');
  }, [load]);

  // Persist search to store on debounced change
  useEffect(() => {
    filterStore.setFilter('searchQuery', debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const refresh = async () => {
    setRefreshing(true);
    await load('refresh');
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || loading || page >= totalPages) return;
    setLoadingMore(true);
    const next = page + 1;
    const res = await fetchPage(next);
    if (res) {
      const items = applyCityFilter(res.items, filterStore.city);
      setRaces((prev) => [...prev, ...items]);
      setPage(next);
      setTotalPages(res.pagination.totalPages ?? next);
    }
    setLoadingMore(false);
  };

  // Active filter chips derived from store
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; clear: () => void }[] = [];
    if (filterStore.status !== 'ALL') {
      chips.push({
        id: 'status',
        label: statusChipLabel(filterStore.status as RaceStatus, t),
        clear: () => filterStore.setFilter('status', 'ALL'),
      });
    }
    if (filterStore.raceType !== 'ALL') {
      chips.push({
        id: 'raceType',
        label: filterStore.raceType,
        clear: () => filterStore.setFilter('raceType', 'ALL'),
      });
    }
    if (filterStore.city !== 'ALL') {
      chips.push({
        id: 'city',
        label: filterStore.city,
        clear: () => filterStore.setFilter('city', 'ALL'),
      });
    }
    return chips;
  }, [filterStore.status, filterStore.raceType, filterStore.city, t, filterStore]);

  const hasFilter =
    activeChips.length > 0 || (debouncedSearch?.trim().length ?? 0) > 0;

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      {searchActive ? (
        <View
          style={{
            paddingTop: tokens.space[6],
            paddingHorizontal: tokens.space[3],
            paddingBottom: tokens.space[2],
            backgroundColor: tokens.color.surfaceBg,
            borderBottomWidth: 1,
            borderBottomColor: tokens.color.neutral200,
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space[2],
          }}
        >
          <View style={{ flex: 1 }}>
            <Input
              variant="search"
              placeholder={t('browse.searchPlaceholder')}
              value={searchInput}
              onChangeText={setSearchInput}
              autoFocus
              onClear={() => setSearchInput('')}
            />
          </View>
          <Text
            onPress={() => {
              setSearchActive(false);
              setSearchInput('');
            }}
            style={{
              color: tokens.color.brandPrimary,
              fontWeight: tokens.fontWeight.semibold,
              padding: tokens.space[2],
            }}
            accessibilityRole="button"
          >
            {t('common.cancel')}
          </Text>
        </View>
      ) : (
        <Header
          title={t('browse.allRacesTitle')}
          onLeadingPress={() => router.back()}
          actions={[
            {
              icon: '🔍',
              label: t('common.search'),
              onPress: () => setSearchActive(true),
            },
            {
              icon: '⚙',
              label: t('browse.filter'),
              onPress: () => setFilterSheetOpen(true),
            },
          ]}
        />
      )}

      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      {activeChips.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: tokens.space[4],
            paddingVertical: tokens.space[2],
            gap: tokens.space[2],
          }}
        >
          {activeChips.map((f) => (
            <FilterChip key={f.id} label={f.label} onRemove={f.clear} />
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
      ) : error && races.length === 0 ? (
        <EmptyState
          icon={<Text style={{ fontSize: 32 }}>⚠️</Text>}
          title={t('browse.fetchError')}
          ctaLabel={t('common.retry')}
          onPress={() => load('initial')}
        />
      ) : races.length === 0 ? (
        <EmptyState
          title={hasFilter ? t('browse.emptyFiltered') : t('browse.emptyNoFilter')}
          ctaLabel={hasFilter ? t('browse.filterClearAll') : undefined}
          onPress={
            hasFilter
              ? () => {
                  filterStore.clearFilters();
                  setSearchInput('');
                }
              : undefined
          }
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
          renderItem={({ item, index }) => (
            <StaggerItem index={index}>
              <RaceCard race={item} onPress={() => router.push(`/events/${item.slug}`)} />
            </StaggerItem>
          )}
          onEndReachedThreshold={0.5}
          onEndReached={loadMore}
          ListFooterComponent={
            <View style={{ paddingVertical: tokens.space[4], alignItems: 'center' }}>
              {loadingMore ? (
                <ActivityIndicator color={tokens.color.brandPrimary} />
              ) : page >= totalPages ? (
                <Text
                  style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}
                >
                  {t('browse.endOfList', { count: totalCount || races.length })}
                </Text>
              ) : null}
            </View>
          }
        />
      )}

      <RaceFilterSheet
        open={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        onApply={() => load('refresh')}
      />
    </View>
  );
}

function applyCityFilter(items: Race[], city: string | 'ALL'): Race[] {
  if (city === 'ALL') return items;
  return items.filter((r) => r.city === city || r.location === city);
}

function statusChipLabel(s: RaceStatus | string, t: (k: string) => string): string {
  switch (String(s)) {
    case 'OPEN_FOR_SALE':
    case 'GENERATED_CODE':
      return t('browse.statusOpen');
    case 'COMING_SOON':
      return t('browse.statusComingSoon');
    case 'CLOSED':
      return t('browse.statusClosed');
    case 'FINISHED':
    case 'COMPLETE':
      return t('browse.statusFinished');
    default:
      return String(s ?? '—');
  }
}
