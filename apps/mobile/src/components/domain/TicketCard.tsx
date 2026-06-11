/**
 * apps/mobile/src/components/domain/TicketCard.tsx
 *
 * Redesigned 2026-06-11 per Danny review ("UI vớ vẩn như app sinh viên") to
 * mirror the dev.5bib.com mobile ticket card:
 *
 *   ┌──────────────────────────────────────────┐
 *   │ LÀO CAI MARATHON 2026...     [Registered]│
 *   │ 👤 NGUYỄN BÌNH MINH                       │
 *   │ 🎫 8989 – 21km                            │
 *   │ ↔ 21KM                                    │
 *   │                          [Chi tiết vé]   │
 *   └──────────────────────────────────────────┘
 *
 * Dropped: the old 60×60 grey "QR placeholder" square (the thing that made
 * it look like a student project). The whole card is pressable; the
 * "Chi tiết vé" outline button matches the web affordance and triggers the
 * same navigation.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { tokens } from '../../theme/tokens';
import type { Ticket } from '../../sdk/models';
import {
  ATHLETE_STATUS_LABELS,
  ATHLETE_STATUS_VARIANT,
  type AthleteStatus,
} from '../../sdk/constants/athlete-status';

export interface TicketCardProps {
  ticket: Ticket;
  onPress?: () => void;
}

/**
 * Pick badge label + color variant for a ticket card.
 *
 * Order of precedence:
 *   1) Ticket-level status (TRANSFERRED, CANCELLED, TRANSFERRING) overrides
 *      the per-athlete status since those are terminal at the order layer.
 *   2) Athlete status mapped via the shared ATHLETE_STATUS_LABELS /
 *      ATHLETE_STATUS_VARIANT (single source of truth — matches web).
 *   3) Race-day result statuses (FINISH / DNF / DNS / DSQ) fall through to
 *      a small post-race table since these aren't in the 8-status enum.
 */
function ticketStatusBadge(t: Ticket): { variant: 'success' | 'info' | 'default' | 'warning'; label: string } {
  const status = String(t.status ?? '');
  const aStatus = String(t.athleteStatus ?? '');

  if (status === 'TRANSFERRED') return { variant: 'default', label: 'Đã chuyển' };
  if (status === 'CANCELLED') return { variant: 'default', label: 'Đã huỷ' };
  if (status === 'TRANSFERRING' || aStatus === 'TRANSFERRING') {
    return { variant: 'default', label: 'Đang chuyển nhượng' };
  }

  // Race-day result statuses — not in the 8-status enum, keep inline.
  if (aStatus === 'FINISH') return { variant: 'success', label: 'Hoàn thành' };
  if (aStatus === 'DNF' || aStatus === 'DNS' || aStatus === 'DSQ') {
    return { variant: 'default', label: aStatus };
  }

  // Normalise to the 8-status enum. Backend variant CHECK_IN folds to CHECKED_IN.
  const normalised =
    aStatus === 'CHECK_IN' ? 'CHECKED_IN' : (aStatus as AthleteStatus);

  if (normalised in ATHLETE_STATUS_LABELS) {
    return {
      variant: ATHLETE_STATUS_VARIANT[normalised],
      label: ATHLETE_STATUS_LABELS[normalised],
    };
  }

  // Unknown / blank — neutral placeholder rather than over-promising.
  return { variant: 'default', label: '—' };
}

/** Icon + text row, matching the web card's icon-led info lines.
 *  Ionicons (ships with Expo) instead of emoji — the emoji glyphs were a
 *  big part of the "prototype" look. */
function InfoRow({
  icon,
  children,
  mono,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
      <Ionicons
        name={icon}
        size={15}
        color={tokens.color.neutral500}
        style={{ width: 18, textAlign: 'center' }}
      />
      <Text
        style={{
          fontSize: tokens.fontSize.bodySm,
          color: tokens.color.neutral700,
          fontFamily: mono ? 'Menlo' : undefined,
          flexShrink: 1,
        }}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

export function TicketCard({ ticket, onPress }: TicketCardProps) {
  const { t } = useTranslation();
  const sb = ticketStatusBadge(ticket);
  const bibRaw = ticket.bib ?? ticket.basicInfo?.bib;
  const hasBib = bibRaw != null && bibRaw !== '';
  // Trim — backend race titles often have trailing spaces.
  const raceName = (ticket.race?.title ?? ticket.basicInfo?.raceName ?? '—').trim();
  const athleteName = (ticket.athleteName ?? '').trim();
  const courseName = (ticket.basicInfo?.courseName ?? ticket.raceCourseName ?? '').trim();
  const distanceRaw = ticket.basicInfo?.courseDistance ?? ticket.raceCourseDistance ?? '';
  // Distance arrives as bare "12" OR pre-suffixed "10km" — normalise once.
  const distance = distanceRaw
    ? `${String(distanceRaw).replace(/\s*km\s*$/i, '')}KM`
    : '';

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Vé ${raceName}${hasBib ? `, BIB ${bibRaw}` : ''}, ${sb.label}`}
    >
      <View style={{ gap: tokens.space[2] }}>
        {/* Title row: race name (left, wraps to 2 lines) + status badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: tokens.space[2],
          }}
        >
          <Text
            style={{
              flex: 1,
              fontSize: tokens.fontSize.bodyLg,
              fontWeight: tokens.fontWeight.bold,
              color: tokens.color.neutral900,
              textTransform: 'uppercase',
            }}
            numberOfLines={2}
          >
            {raceName}
          </Text>
          <Badge variant={sb.variant}>{sb.label}</Badge>
        </View>

        {/* Info lines — same order as the web card. */}
        {!!athleteName && <InfoRow icon="person-outline">{athleteName}</InfoRow>}
        {hasBib ? (
          <InfoRow icon="pricetag-outline" mono>
            <Text style={{ fontWeight: tokens.fontWeight.bold }}>{String(bibRaw)}</Text>
            {courseName ? ` – ${courseName}` : ''}
          </InfoRow>
        ) : (
          <InfoRow icon="pricetag-outline">
            <Text style={{ color: tokens.color.neutral500 }}>{t('tickets.bibNotAssigned')}</Text>
          </InfoRow>
        )}
        {!!distance && <InfoRow icon="footsteps-outline">{distance}</InfoRow>}

        {/* Web-style CTA — same navigation as tapping the card. */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${t('tickets.detailCta')} ${raceName}`}
            hitSlop={6}
            style={({ pressed }) => ({
              paddingHorizontal: tokens.space[4],
              paddingVertical: tokens.space[2],
              borderRadius: tokens.radius.md,
              borderWidth: 1,
              borderColor: tokens.color.brandPrimary,
              backgroundColor: pressed
                ? tokens.color.brandPrimaryLight
                : tokens.color.surfaceCard,
            })}
          >
            <Text
              style={{
                color: tokens.color.brandPrimary,
                fontSize: tokens.fontSize.labelMd,
                fontWeight: tokens.fontWeight.semibold,
              }}
            >
              {t('tickets.detailCta')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}
