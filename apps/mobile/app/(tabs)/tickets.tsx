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

/**
 * Filter pills match dev.5bib.com `/vi/tickets` exactly (verified 2026-05-28):
 *   all / notRegistered / transferring / registered / awaitConfirm /
 *   checkedIn / racekitReceived / racekitNot
 *
 * Each pill maps to a predicate over backend's 8-status enum
 * (athlete_status + code_status). The previous 3-bucket "MVP simplification"
 * hid registration status from users (e.g. a NEW ticket and a REGISTERED
 * ticket looked identical because both fell under "upcoming"); web exposes
 * the difference so we match.
 */
type TabId =
  | 'all'
  | 'notRegistered'
  | 'transferring'
  | 'registered'
  | 'awaitConfirm'
  | 'checkedIn'
  | 'racekitReceived'
  | 'racekitNot';

/**
 * Predicate per pill. Verified 2026-05-29 against the URL param values used by
 * dev.5bib.com (`?athlete_status=...`):
 *   NEW · REGISTER · REMIND_CHECK_IN · CHECKEDIN (no underscore on web —
 *   backend accepts both forms) · RACEKIT_RECEIVED · RACEKIT_NOT_RECEIVED
 *   Plus ticket-level TRANSFERRING surfaced as a separate pill.
 *
 * The "Chưa ghi danh" pill on web only filters NEW. REGISTER goes under its
 * own "Đã ghi danh" pill — we match that split so the counts line up.
 */
const TAB_PREDICATES: Record<TabId, (t: Ticket) => boolean> = {
  all: () => true,
  notRegistered: (t) => String(t.athleteStatus ?? '') === 'NEW',
  transferring: (t) =>
    String(t.status ?? '') === 'TRANSFERRING' ||
    String(t.athleteStatus ?? '') === 'TRANSFERRING',
  registered: (t) => String(t.athleteStatus ?? '') === 'REGISTER',
  awaitConfirm: (t) => String(t.athleteStatus ?? '') === 'REMIND_CHECK_IN',
  checkedIn: (t) => {
    const a = String(t.athleteStatus ?? '');
    return a === 'CHECK_IN' || a === 'CHECKED_IN' || a === 'CHECKEDIN';
  },
  racekitReceived: (t) => String(t.athleteStatus ?? '') === 'RACEKIT_RECEIVED',
  racekitNot: (t) => String(t.athleteStatus ?? '') === 'RACEKIT_NOT_RECEIVED',
};

export default function TicketsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();

  const [tab, setTab] = useState<TabId>('all');
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errored, setErrored] = useState(false);

  const load = useCallback(async () => {
    setErrored(false);
    try {
      // Backend wants camelCase pageNo + sortField — SDK now handles that
      // automatically, defaulting to sortField=createdOn / DESC so the
      // user sees newest tickets first (incl. fresh fakePayment ones).
      const r = await ticketSdk.listMyTickets({
        athleteStatus: 'ALL',
        codeStatuses: 'ACTIVE',
        pageNo: 1,
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

  // Per-tab count for badge display + visible list.
  const counts = useMemo(() => {
    const out = {} as Record<TabId, number>;
    (Object.keys(TAB_PREDICATES) as TabId[]).forEach((id) => {
      out[id] = allTickets.filter(TAB_PREDICATES[id]).length;
    });
    return out;
  }, [allTickets]);

  const visible = useMemo(
    () => allTickets.filter(TAB_PREDICATES[tab]),
    [allTickets, tab],
  );

  const emptyTitle = t(`tickets.empty.${tab}` as const, {
    defaultValue: t('tickets.empty.all'),
  });

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header title={t('tickets.tabTitle')} largeTitle leading="none" />
      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      <SegmentedTabs
        scroll
        options={[
          { id: 'all', label: t('tickets.tab.all'), count: counts.all },
          { id: 'notRegistered', label: t('tickets.tab.notRegistered'), count: counts.notRegistered },
          { id: 'transferring', label: t('tickets.tab.transferring'), count: counts.transferring },
          { id: 'registered', label: t('tickets.tab.registered'), count: counts.registered },
          { id: 'awaitConfirm', label: t('tickets.tab.awaitConfirm'), count: counts.awaitConfirm },
          { id: 'checkedIn', label: t('tickets.tab.checkedIn'), count: counts.checkedIn },
          { id: 'racekitReceived', label: t('tickets.tab.racekitReceived'), count: counts.racekitReceived },
          { id: 'racekitNot', label: t('tickets.tab.racekitNot'), count: counts.racekitNot },
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
              : tab === 'all' || tab === 'notRegistered'
                ? t('tickets.emptyUpcomingCta')
                : undefined
          }
          onPress={
            errored
              ? refresh
              : tab === 'all' || tab === 'notRegistered'
                ? () => router.push('/events')
                : undefined
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
