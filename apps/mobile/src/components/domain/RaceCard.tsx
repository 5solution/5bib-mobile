/**
 * apps/mobile/src/components/domain/RaceCard.tsx
 *
 * Race list card variant (compact list + featured carousel).
 */

import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { BrandLogo } from '../BrandLogo';
import { tokens } from '../../theme/tokens';
import i18n from '../../i18n';
import type { Race } from '../../sdk/models';

/**
 * Branded stand-in when a race has no (or a broken) cover image — the 5bib
 * mark on the brand gradient instead of a dead grey rectangle (UIUX P0:
 * "hero renders as a giant blank grey block").
 */
function CoverFallback({ logoWidth = 56 }: { logoWidth?: number }) {
  return (
    <LinearGradient
      colors={[tokens.color.brandPrimary, tokens.color.brandPrimaryDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <BrandLogo width={logoWidth} color={tokens.color.neutral0} />
    </LinearGradient>
  );
}

/** "THG 6 / 15" floating date chip — mirrors web's related-event cards. */
function DateChip({ iso }: { iso: string }) {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return null;
  return (
    <View
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: tokens.color.neutral0,
        borderRadius: tokens.radius.md,
        paddingHorizontal: tokens.space[2],
        paddingVertical: 4,
        alignItems: 'center',
        ...tokens.elevation[1],
      }}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: tokens.fontWeight.bold,
          color: tokens.color.magenta,
          letterSpacing: 0.5,
        }}
      >
        THG {d.getMonth() + 1}
      </Text>
      <Text
        style={{
          fontSize: tokens.fontSize.h3,
          fontWeight: tokens.fontWeight.bold,
          color: tokens.color.neutral900,
          lineHeight: 22,
        }}
      >
        {d.getDate()}
      </Text>
    </View>
  );
}

export interface RaceCardProps {
  race: Race;
  variant?: 'list' | 'featured';
  onPress?: () => void;
  /**
   * Computed price range across all courses × ticket_types. Renders as
   * "100.000đ" if min==max, "100.000đ – 300.000đ" otherwise. Web shows this
   * prominently on every race card; mobile MUST match for buy-intent signal.
   * Omit when prices haven't loaded yet — card hides the row gracefully.
   */
  priceFrom?: number;
  priceTo?: number;
}

function fmtVnd(n: number): string {
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

function statusBadge(status: Race['status'] | string | undefined): { variant: 'success' | 'info' | 'default' | 'warning'; label: string } {
  // Backend race-status enum (verified 2026-05-27 via /pub/race?status=X):
  //   GENERATED_CODE = open for sale (codes generated, ready to sell)
  //   COMPLETE       = past race, results phase
  //   CANCELLED      = race cancelled
  // Mobile-facing canonical names (OPEN_FOR_SALE etc.) kept for forward-compat.
  // Labels via the i18n singleton (this is a plain fn, not a hook site) —
  // re-renders on language change come from the parent screens, which all
  // use useTranslation. Keys exist in vi/en/de.
  switch (status) {
    case 'OPEN_FOR_SALE':
    case 'GENERATED_CODE':
      return { variant: 'success', label: i18n.t('browse.statusOpen') };
    case 'COMING_SOON':
      return { variant: 'info', label: i18n.t('browse.statusComingSoon') };
    case 'CLOSED':
      return { variant: 'warning', label: i18n.t('browse.statusClosed') };
    case 'FINISHED':
    case 'COMPLETE': // backend uses COMPLETE
      return { variant: 'default', label: i18n.t('browse.statusFinished') };
    case 'ONGOING':
      return { variant: 'info', label: i18n.t('browse.statusOngoing') };
    case 'CANCEL': // real backend enum value (web constants/race.ts)
    case 'CANCELLED':
      return { variant: 'warning', label: i18n.t('browse.statusCancelled') };
    default:
      return { variant: 'default', label: status ? String(status) : '-' };
  }
}

function fmtDate(iso: string) {
  if (!iso) return 'Chưa xác định';
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

export function RaceCard({
  race,
  variant = 'list',
  onPress,
  priceFrom,
  priceTo,
}: RaceCardProps) {
  const sb = statusBadge(race.status);
  const distances = race.courses?.map((c) => c.distance).join('/') ?? '';
  const hasPrice = priceFrom != null && priceFrom > 0;
  const priceLabel = hasPrice
    ? priceTo != null && priceTo > priceFrom
      ? `${fmtVnd(priceFrom)} – ${fmtVnd(priceTo)}`
      : fmtVnd(priceFrom)
    : '';
  const a11y = `Giải ${race.title}, ${fmtDate(race.startDate)}, ${race.location ?? ''}, ${sb.label}${hasPrice ? ', ' + priceLabel : ''}`;

  if (variant === 'featured') {
    return (
      <Card padding="none" onPress={onPress} accessibilityLabel={a11y}>
        <View
          style={{
            height: 180,
            backgroundColor: tokens.color.neutral200,
            borderTopLeftRadius: tokens.radius.lg,
            borderTopRightRadius: tokens.radius.lg,
            overflow: 'hidden',
          }}
        >
          {race.coverImageUrl ? (
            <Image
              source={{ uri: race.coverImageUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <CoverFallback logoWidth={72} />
          )}
          {/* Bottom scrim — anchors the floating chips and gives the photo
             depth even when it's a bright image. */}
          <LinearGradient
            colors={['transparent', 'rgba(17,24,39,0.45)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 64 }}
          />
          <DateChip iso={race.startDate} />
          {race.isHighlight && (
            <View style={{ position: 'absolute', top: 12, left: 12 }}>
              <Badge
                variant="brand"
                icon={<Ionicons name="star" size={12} color={tokens.color.brandPrimary} />}
              >
                Nổi bật
              </Badge>
            </View>
          )}
        </View>
        <View style={{ padding: tokens.space[4], gap: tokens.space[2] }}>
          <Text
            style={{
              fontSize: tokens.fontSize.h3,
              fontWeight: tokens.fontWeight.bold,
              color: tokens.color.neutral900,
            }}
            numberOfLines={2}
          >
            {race.title}
          </Text>
          <Text style={{ fontSize: tokens.fontSize.bodyMd, color: tokens.color.neutral600 }}>
            <Ionicons name="calendar-outline" size={13} color={tokens.color.neutral600} />{' '}
            {fmtDate(race.startDate)} ·{' '}
            <Ionicons name="location-outline" size={13} color={tokens.color.neutral600} />{' '}
            {race.location ?? race.city ?? '—'}
          </Text>
          {hasPrice && (
            <Text
              style={{
                fontSize: tokens.fontSize.bodyLg,
                fontWeight: tokens.fontWeight.bold,
                color: tokens.color.brandPrimary,
              }}
            >
              {priceLabel}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: tokens.space[2], marginTop: tokens.space[1] }}>
            <Badge variant={sb.variant}>{sb.label}</Badge>
            {distances && <Badge variant="default">{distances}</Badge>}
          </View>
        </View>
      </Card>
    );
  }

  // list variant
  return (
    <Card onPress={onPress} accessibilityLabel={a11y}>
      <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: tokens.radius.md,
            backgroundColor: tokens.color.neutral200,
            overflow: 'hidden',
          }}
        >
          {race.coverImageUrl ? (
            <Image
              source={{ uri: race.coverImageUrl }}
              style={{ width: 80, height: 80 }}
              resizeMode="cover"
            />
          ) : (
            <CoverFallback logoWidth={40} />
          )}
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] }}>
            <Text
              style={{
                fontSize: tokens.fontSize.bodyLg,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.color.neutral900,
                flex: 1,
              }}
              numberOfLines={2}
            >
              {race.title}
            </Text>
            {race.isHighlight && (
              <Ionicons
                name="star"
                size={14}
                color={tokens.color.warning}
                accessibilityLabel="Nổi bật"
              />
            )}
          </View>
          <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600 }}>
            <Ionicons name="calendar-outline" size={12} color={tokens.color.neutral600} />{' '}
            {fmtDate(race.startDate)}
          </Text>
          <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600 }}>
            <Ionicons name="location-outline" size={12} color={tokens.color.neutral600} />{' '}
            {race.location ?? race.city ?? '—'}
            {distances ? ` · ${distances}` : ''}
          </Text>
          {hasPrice && (
            <Text
              style={{
                fontSize: tokens.fontSize.bodyMd,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.color.brandPrimary,
              }}
            >
              {priceLabel}
            </Text>
          )}
          <View style={{ marginTop: 4 }}>
            <Badge variant={sb.variant}>{sb.label}</Badge>
          </View>
        </View>
      </View>
    </Card>
  );
}
