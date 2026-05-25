/**
 * apps/mobile/app/(tabs)/orders.tsx — S-ORDERS-01
 */

import React, { useState, useEffect } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { Skeleton } from '../../src/components/Skeleton';
import { SegmentedTabs } from '../../src/components/domain/SegmentedTabs';
import { OrderCard } from '../../src/components/domain/OrderCard';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import type { Order } from '../../src/sdk/models';

const MOCK_ORDERS: Order[] = [
  {
    id: 'o1',
    orderNumber: 'ORD-2026-A1234',
    raceId: '1',
    raceName: 'Saigon Marathon 2026',
    courseId: 'c1',
    courseName: '5km',
    athleteName: 'Nguyễn Văn A',
    totalAmount: 180_000,
    subtotal: 200_000,
    discountAmount: 20_000,
    financialStatus: 'paid',
    internalStatus: 'completed',
    createdAt: '2026-01-15T14:23:00Z',
    paidAt: '2026-01-15T14:25:00Z',
    paymentMethod: 'PAYX_QR',
    ticketId: 't1',
  },
];

type StatusTab = 'paid' | 'pending' | 'cancelled';

export default function OrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();

  const [tab, setTab] = useState<StatusTab>('paid');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 500));
      setOrders(tab === 'paid' ? MOCK_ORDERS : []);
      setLoading(false);
    })();
  }, [tab]);

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
          {[0, 1].map((i) => (
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
        <EmptyState title={t('errors.noResults')} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[3] }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await new Promise((r) => setTimeout(r, 600));
                setRefreshing(false);
              }}
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
