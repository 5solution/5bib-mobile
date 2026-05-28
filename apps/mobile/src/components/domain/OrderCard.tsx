/**
 * apps/mobile/src/components/domain/OrderCard.tsx
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { tokens } from '../../theme/tokens';
import type { Order } from '../../sdk/models';

export interface OrderCardProps {
  order: Order;
  onPress?: () => void;
}

function statusBadge(o: Order): { variant: 'success' | 'warning' | 'error' | 'default'; label: string } {
  switch (String(o.financialStatus)) {
    case 'paid':
      return { variant: 'success', label: 'Đã thanh toán' };
    case 'pending':
      return { variant: 'warning', label: 'Chờ thanh toán' };
    case 'failed':
      return { variant: 'error', label: 'Thất bại' };
    case 'voided':
      return { variant: 'default', label: 'Đã huỷ' };
    default:
      return { variant: 'default', label: '—' };
  }
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return '—';
  }
}

function fmtVnd(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toLocaleString('vi-VN') + 'đ';
}

export function OrderCard({ order, onPress }: OrderCardProps) {
  const sb = statusBadge(order);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Đơn ${order.orderNumber ?? ''}, ${order.raceName ?? ''}, ${fmtVnd(order.totalAmount)}, ${sb.label}`}
    >
      <View style={{ gap: tokens.space[1] }}>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text
            style={{
              fontSize: tokens.fontSize.bodyLg,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.neutral900,
              fontFamily: 'Menlo',
            }}
          >
            {/* Backend `name` already includes leading "#"; strip+re-add so
               we never double up while still showing one. */}
            {'#' + String(order.orderNumber ?? order.id ?? '—').replace(/^#+/, '')}
          </Text>
          <Badge variant={sb.variant}>{sb.label}</Badge>
        </View>
        <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600 }}>
          {fmtDate(order.createdAt)}
        </Text>
        <Text style={{ fontSize: tokens.fontSize.bodyMd, color: tokens.color.neutral800 }}>
          {order.raceName ?? '—'}{order.courseName ? ` · ${order.courseName}` : ''}
        </Text>
        <Text
          style={{
            fontSize: tokens.fontSize.bodyLg,
            fontWeight: tokens.fontWeight.bold,
            color: tokens.color.brandPrimary,
            marginTop: tokens.space[1],
          }}
        >
          {fmtVnd(order.totalAmount)}
        </Text>
      </View>
    </Card>
  );
}
