/**
 * apps/mobile/app/orders/[id].tsx — S-ORDERS-02 Order Detail
 */

import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { tokens } from '../../src/theme/tokens';

export default function OrderDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const fmtVnd = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title={`#${id ?? 'ORD-...'}`}
        leading="back"
        onLeadingPress={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[5] }}>
        <View>
          <Badge variant="success">{t('orders.statusPaid')}</Badge>
          <Text style={{ marginTop: tokens.space[2], color: tokens.color.neutral500 }}>
            Ngày: 15/01/2026 14:23
          </Text>
        </View>

        <Section title={t('orders.itemSection')}>
          <Text style={{ fontWeight: tokens.fontWeight.semibold }}>Saigon Marathon 2026</Text>
          <Text style={{ color: tokens.color.neutral600 }}>5 km · BIB A1234</Text>
          <Text style={{ color: tokens.color.neutral600 }}>VĐV: Nguyễn Văn A</Text>
          <Text style={{ fontWeight: tokens.fontWeight.semibold }}>{fmtVnd(200_000)}</Text>
        </Section>

        <Section title={t('checkout.paymentDetails')}>
          <Row label="Subtotal" value={fmtVnd(200_000)} />
          <Row label="Mã giảm (NHAPMA20)" value={`− ${fmtVnd(20_000)}`} />
          <View style={{ height: 1, backgroundColor: tokens.color.neutral200 }} />
          <Row label={t('checkout.total')} value={fmtVnd(180_000)} bold brand />
        </Section>

        <Section title={t('orders.paymentSection')}>
          <Row label={t('orders.paymentMethod')} value="PayX QR" />
          <Row label={t('orders.transactionId')} value="TXN-XXX" />
          <Row label={t('orders.paidAt')} value="15/01/2026 14:25" />
        </Section>

        <Section title={t('orders.relatedTicket')}>
          <Button variant="outline" size="md" onPress={() => router.push('/tickets/t1')}>
            {t('orders.viewTicket')} →
          </Button>
        </Section>

        <Button variant="ghost" size="md" disabled>
          {t('tickets.downloadInvoice')} (Phase 2)
        </Button>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: tokens.space[2] }}>
      <Text
        style={{
          fontSize: tokens.fontSize.labelSm,
          fontWeight: tokens.fontWeight.semibold,
          color: tokens.color.neutral500,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      <View style={{ gap: tokens.space[2] }}>{children}</View>
    </View>
  );
}

function Row({ label, value, bold, brand }: { label: string; value: string; bold?: boolean; brand?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: tokens.color.neutral700, fontSize: bold ? 16 : 14 }}>{label}</Text>
      <Text
        style={{
          color: brand ? tokens.color.brandPrimary : tokens.color.neutral900,
          fontWeight: bold ? tokens.fontWeight.bold : tokens.fontWeight.medium,
          fontSize: bold ? 18 : 14,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
