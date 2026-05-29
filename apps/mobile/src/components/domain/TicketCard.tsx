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
  const status = String(t.status ?? '');
  const aStatus = String(t.athleteStatus ?? '');
  if (status === 'TRANSFERRED') return { variant: 'default', label: 'Đã chuyển' };
  if (status === 'CANCELLED') return { variant: 'default', label: 'Đã huỷ' };
  if (aStatus === 'CHECKED_IN' || aStatus === 'CHECK_IN') return { variant: 'info', label: 'Đã check-in' };
  if (aStatus === 'FINISH') return { variant: 'success', label: 'Hoàn thành' };
  if (aStatus === 'DNF' || aStatus === 'DNS' || aStatus === 'DSQ') {
    return { variant: 'default', label: aStatus };
  }
  return { variant: 'success', label: 'Sẵn sàng' };
}

function fmtDate(iso?: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return '';
  }
}

export function TicketCard({ ticket, onPress }: TicketCardProps) {
  const sb = ticketStatusBadge(ticket);
  const bibRaw = ticket.bib ?? ticket.basicInfo?.bib;
  const hasBib = bibRaw != null && bibRaw !== '';
  const bib = hasBib ? String(bibRaw) : '—';
  // Trim — backend race titles often have trailing spaces (e.g. "TEKO RUNNING CLUB ").
  const raceName = (ticket.race?.title ?? ticket.basicInfo?.raceName ?? '—').trim();
  const distance = ticket.basicInfo?.courseDistance ?? ticket.raceCourseDistance ?? '';
  const startDate = fmtDate(ticket.race?.startDate);
  // Join distance + date with "·" only when both present, else show whichever
  // exists. Avoids the awkward "12 · —" when backend leaves startDate null.
  // Distance may arrive as bare "12" OR pre-suffixed "10km" depending on
  // backend course. Strip trailing "km" before re-adding to avoid "10km km".
  const distText = distance
    ? `${String(distance).replace(/\s*km\s*$/i, '')} km`
    : '';
  const subtitle = [distText, startDate].filter(Boolean).join(' · ');
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
          {!!subtitle && (
            <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600 }}>
              {subtitle}
            </Text>
          )}
          {hasBib && (
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
          )}
          <View style={{ marginTop: 4 }}>
            <Badge variant={sb.variant}>{sb.label}</Badge>
          </View>
        </View>
        <Text style={{ color: tokens.color.neutral400, fontSize: 18 }}>›</Text>
      </View>
    </Card>
  );
}
