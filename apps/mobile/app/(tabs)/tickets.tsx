/**
 * apps/mobile/app/(tabs)/tickets.tsx — S-TICKETS-01
 *
 * States: Loading | Filled | Empty (per tab) | Error | Offline.
 * Real SDK wiring: sdk.ticket.listMyTickets()
 *
 * NOTE: backend `code_statuses` filter is sent server-side (default ACTIVE);
 * the 3 mobile tabs are derived client-side from athleteStatus + race date
 * since backend doesn't expose a single canonical filter for our grouping.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { Skeleton } from '../../src/components/Skeleton';
import { SegmentedTabs } from '../../src/components/domain/SegmentedTabs';
import { TicketCard } from '../../src/components/domain/TicketCard';
import { useToast } from '../../src/components/Toast';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { ticket as ticketSdk } from '../../src/sdk/services/ticket';
import { FetcherError } from '../../src/sdk/core';
import type { Ticket } from '../../src/sdk/models';

type TabId = 'upcoming' | 'checkedIn' | 'transferred';

/**
 * Group ticket → 3 tabs per BR-TICKETS-01 (mobile MVP simplification):
 *   - upcoming    = status ACTIVE + athleteStatus NOT in (CHECKED_IN, RACEKIT_RECEIVED, RACEKIT_NOT_RECEIVED)
 *   - checkedIn   = athleteStatus in (CHECKED_IN, RACEKIT_RECEIVED, RACEKIT_NOT_RECEIVED)
 *   - transferred = status TRANSFERRED or CANCELLED
 *
 * Compare via string to tolerate the 8-status backend enum even though
 * the TS union currently lists only 3 values.
 */
function classifyTicket(t: Ticket): TabId {
  const tStatus = String(t.status ?? '');
  if (tStatus === 'TRANSFERRED' || tStatus === 'CANCELLED') return 'transferred';
  const aStatus = String(t.athleteStatus ?? '');
  // Backend uses CHECK_IN (snake fragment) on some endpoints, CHECKED_IN on others.
  // FINISH / DNF / DNS / DSQ also belong in the checked-in (post-race) bucket.
  if (
    aStatus === 'CHECK_IN' ||
    aStatus === 'CHECKED_IN' ||
    aStatus === 'RACEKIT_RECEIVED' ||
    aStatus === 'RACEKIT_NOT_RECEIVED' ||
    aStatus === 'FINISH' ||
    aStatus === 'DNF' ||
    aStatus === 'DNS' ||
    aStatus === 'DSQ'
  ) {
    return 'checkedIn';
  }
  return 'upcoming';
}

export default function TicketsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();

  const [tab, setTab] = useState<TabId>('upcoming');
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errored, setErrored] = useState(false);

  const load = useCallback(async () => {
    setErrored(false);
    try {
      // Backend `/codes/fetch-by-user` rejects comma-separated code_statuses
      // (verified 2026-05-27 → 400 "Mismatch request param"). Fetch ACTIVE
      // only, classify all 3 tabs client-side from athlete status.
      const r = await ticketSdk.listMyTickets({
        athleteStatus: 'ALL',
        codeStatuses: 'ACTIVE',
      });
      setAllTickets(r.items);
    } catch (e) {
      setErrored(true);
      if (e instanceof FetcherError && e.status === 401) return; // global handler
      toast.show({ variant: 'error', message: t('tickets.loadFailed') });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, toast]);

  // Initial + on-focus refresh (so transfer / register flows update list on return).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (cancelled) return;
        await load();
      })();
      return () => {
        cancelled = true;
      };
    }, [load]),
  );

  useEffect(() => {
    // Initial mount loading state — show skeletons first paint.
    setLoading(true);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  const { upcoming, checkedIn, transferred } = useMemo(() => {
    const u: Ticket[] = [];
    const c: Ticket[] = [];
    const x: Ticket[] = [];
    for (const it of allTickets) {
      const g = classifyTicket(it);
      if (g === 'upcoming') u.push(it);
      else if (g === 'checkedIn') c.push(it);
      else x.push(it);
    }
    return { upcoming: u, checkedIn: c, transferred: x };
  }, [allTickets]);

  const visible = tab === 'upcoming' ? upcoming : tab === 'checkedIn' ? checkedIn : transferred;

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
          { id: 'upcoming', label: t('tickets.tabUpcoming'), count: upcoming.length },
          { id: 'checkedIn', label: t('tickets.tabCheckedIn'), count: checkedIn.length },
          { id: 'transferred', label: t('tickets.tabTransferred'), count: transferred.length },
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
      ) : visible.length === 0 ? (
        <EmptyState
          icon={
            <View style={{ width: 32, height: 32 }}>
              <View />
            </View>
          }
          title={errored ? t('tickets.loadFailed') : emptyTitle}
          ctaLabel={
            errored
              ? t('common.retry')
              : tab === 'upcoming'
                ? t('tickets.emptyUpcomingCta')
                : undefined
          }
          onPress={
            errored ? refresh : tab === 'upcoming' ? () => router.push('/events') : undefined
          }
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(it) => it.id}
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
