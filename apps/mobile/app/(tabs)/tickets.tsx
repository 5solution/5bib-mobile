/**
 * apps/mobile/app/(tabs)/tickets.tsx — S-TICKETS-01
 *
 * States: Loading | Filled | Empty (per tab) | Error | Offline.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { Skeleton } from '../../src/components/Skeleton';
import { SegmentedTabs } from '../../src/components/domain/SegmentedTabs';
import { TicketCard } from '../../src/components/domain/TicketCard';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import type { Ticket } from '../../src/sdk/models';

type TabId = 'upcoming' | 'checkedIn' | 'transferred';

const MOCK_TICKETS: Ticket[] = [
  {
    id: 't1',
    value: 'TKT-VALUE-A1234',
    status: 'ACTIVE',
    athleteStatus: 'ACTIVE',
    bib: 'A1234',
    availableToChangeCourse: true,
    race: {
      id: '1',
      slug: 'saigon-marathon-2026',
      title: 'Saigon Marathon 2026',
      coverImageUrl: null,
      startDate: '2026-03-15T06:00:00Z',
      location: 'TP.HCM',
      isHighlight: false,
      bibSetUp: true,
      status: 'OPEN_FOR_SALE',
    },
    basicInfo: {
      value: 'TKT-VALUE-A1234',
      courseId: 'c1',
      courseName: '5km',
      raceName: 'Saigon Marathon 2026',
      courseDistance: '5km',
      bib: 'A1234',
    },
  },
];

export default function TicketsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();

  const [tab, setTab] = useState<TabId>('upcoming');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState<{ upcoming: number; checkedIn: number; transferred: number }>({
    upcoming: 0,
    checkedIn: 0,
    transferred: 0,
  });

  const load = useCallback(async (which: TabId) => {
    setLoading(true);
    // const r = await sdk.ticket.fetchByUser({ codeStatuses: 'ACTIVE', ... });
    await new Promise((r) => setTimeout(r, 500));
    if (which === 'upcoming') {
      setTickets(MOCK_TICKETS);
      setCounts({ upcoming: MOCK_TICKETS.length, checkedIn: 5, transferred: 2 });
    } else {
      setTickets([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load(tab);
    setRefreshing(false);
  };

  const emptyTitle =
    tab === 'upcoming'
      ? t('tickets.emptyUpcoming')
      : tab === 'checkedIn'
      ? t('tickets.emptyCheckedIn')
      : t('tickets.emptyTransferred');

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header title={t('tickets.tabTitle')} largeTitle leading="none" />
      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      <SegmentedTabs
        scroll
        options={[
          { id: 'upcoming', label: t('tickets.tabUpcoming'), count: counts.upcoming },
          { id: 'checkedIn', label: t('tickets.tabCheckedIn'), count: counts.checkedIn },
          { id: 'transferred', label: t('tickets.tabTransferred'), count: counts.transferred },
        ]}
        value={tab}
        onChange={(v) => setTab(v as TabId)}
      />

      {loading ? (
        <View style={{ padding: tokens.space[4], gap: tokens.space[3] }}>
          {[0, 1, 2].map((i) => (
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
                <Skeleton width={60} height={60} borderRadius={tokens.radius.sm} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton height={18} width="80%" />
                  <Skeleton height={14} width="60%" />
                  <Skeleton height={14} width="40%" />
                  <Skeleton height={20} width={100} borderRadius={tokens.radius.full} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<View style={{ width: 32, height: 32 }}><View /></View>}
          title={emptyTitle}
          ctaLabel={tab === 'upcoming' ? t('tickets.emptyUpcomingCta') : undefined}
          onPress={tab === 'upcoming' ? () => router.push('/events') : undefined}
        />
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={tokens.color.brandPrimary}
            />
          }
          renderItem={({ item }) => (
            <TicketCard ticket={item} onPress={() => router.push(`/tickets/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}
