/**
 * apps/mobile/app/(tabs)/orders.tsx — S-ORDERS-01 My orders list.
 *
 * Real SDK wiring: `sdk.order.listMyOrders({ internalStatus | financialStatus })`.
 * Backend filter maps:
 *   - tab "paid"      → internal_status=COMPLETE (or financial_status=paid)
 *   - tab "pending"   → internal_status=PENDING
 *   - tab "cancelled" → internal_status=CANCELLED
 *
 * Backend pagination is currently broken (page_no ignored, see
 * docs/BACKEND_TODOS.md BE-MOBILE-04). We fetch one page and rely on the
 * server-side count.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useFocusEffect } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { Skeleton } from '../../src/components/Skeleton';
import { SegmentedTabs } from '../../src/components/domain/SegmentedTabs';
import { OrderCard } from '../../src/components/domain/OrderCard';
import { useToast } from '../../src/components/Toast';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { order as orderSdk } from '../../src/sdk/services/order';
import { FetcherError } from '../../src/sdk/core';
import type { Order } from '../../src/sdk/models';

type StatusTab = 'paid' | 'pending' | 'cancelled';

/** Backend internal_status mapping for the 3 mobile tabs. */
const TAB_TO_STATUS: Record<StatusTab, string> = {
  paid: 'COMPLETE',
  pending: 'PENDING',
  cancelled: 'CANCELLED',
};

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();

  const [tab, setTab] = useState<StatusTab>('paid');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errored, setErrored] = useState(false);

  const load = useCallback(
    async (currentTab: StatusTab) => {
      setErrored(false);
      try {
        const r = await orderSdk.listMyOrders({
          internalStatus: TAB_TO_STATUS[currentTab],
          pageSize: 20,
        });
        setOrders(r.items);
      } catch (e) {
        setErrored(true);
        if (e instanceof FetcherError && e.status === 401) return; // global handler
        toast.show({ variant: 'error', message: t('orders.loadFailed') });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, toast],
  );

  // Re-load on tab change.
  useEffect(() => {
    setLoading(true);
    load(tab);
  }, [tab, load]);

  // On-focus refresh — keeps the list in sync after coming back from a
  // payment WebView or order-detail screen.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (cancelled) return;
        await load(tab);
      })();
      return () => {
        cancelled = true;
      };
    }, [load, tab]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(tab);
  }, [load, tab]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header title={t('orders.tabTitle')} largeTitle leading="none" />
      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      <SegmentedTabs
        options={[
          { id: 'paid', label: t('orders.tabPaid') },
          { id: 'pending', label: t('orders.tabPending') },
          { id: 'cancelled', label: t('orders.tabCancelled') },
        ]}
        value={tab}
        onChange={(v) => setTab(v as StatusTab)}
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
              <Skeleton height={18} width="60%" />
              <Skeleton height={14} width="30%" />
              <Skeleton height={16} width="80%" />
              <Skeleton height={20} width={100} />
            </View>
          ))}
        </View>
      ) : orders.length === 0 ? (
        <EmptyState
          title={errored ? t('orders.loadFailed') : t('errors.noResults')}
          ctaLabel={errored ? t('common.retry') : undefined}
          onPress={errored ? refresh : undefined}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={tokens.color.brandPrimary}
            />
          }
          renderItem={({ item }) => (
            <OrderCard order={item} onPress={() => router.push(`/orders/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}
