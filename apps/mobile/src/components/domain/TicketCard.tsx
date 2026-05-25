/**
 * apps/mobile/src/components/domain/TicketCard.tsx
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { tokens } from '../../theme/tokens';
import type { Ticket } from '../../sdk/models';

export interface TicketCardProps {
  ticket: Ticket;
  onPress?: () => void;
}

function ticketStatusBadge(t: Ticket): { variant: 'success' | 'info' | 'default' | 'warning'; label: string } {
  if (t.status === 'TRANSFERRED') return { variant: 'default', label: 'Đã chuyển' };
  if (t.status === 'CANCELLED') return { variant: 'default', label: 'Đã huỷ' };
  if (t.athleteStatus === 'CHECKED_IN') return { variant: 'info', label: 'Đã check-in' };
  return { variant: 'success', label: 'Sẵn sàng' };
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

export function TicketCard({ ticket, onPress }: TicketCardProps) {
  const sb = ticketStatusBadge(ticket);
  const bib = ticket.bib ?? ticket.basicInfo?.bib ?? '—';
  const raceName = ticket.race?.title ?? ticket.basicInfo?.raceName ?? '—';
  const distance = ticket.basicInfo?.courseDistance ?? ticket.raceCourseDistance ?? '';
  const startDate = fmtDate(ticket.race?.startDate);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Vé ${raceName}, ${distance}, BIB ${bib}, ${sb.label}`}
    >
      <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
        {/* QR thumbnail placeholder — in real app, render mini QR */}
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.color.neutral100,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: tokens.color.neutral200,
          }}
        >
          <Text style={{ fontSize: 28 }} accessibilityElementsHidden>
            ▦
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              fontSize: tokens.fontSize.bodyLg,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.neutral900,
            }}
            numberOfLines={1}
          >
            {raceName}
          </Text>
          <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600 }}>
            {distance} · {startDate}
          </Text>
          <Text
            style={{
              fontSize: tokens.fontSize.monoMd,
              fontFamily: 'Menlo',
              color: tokens.color.neutral700,
              fontWeight: tokens.fontWeight.semibold,
            }}
          >
            BIB: {bib}
          </Text>
          <View style={{ marginTop: 4 }}>
            <Badge variant={sb.variant}>{sb.label}</Badge>
          </View>
        </View>
        <Text style={{ color: tokens.color.neutral400, fontSize: 18 }}>›</Text>
      </View>
    </Card>
  );
}
