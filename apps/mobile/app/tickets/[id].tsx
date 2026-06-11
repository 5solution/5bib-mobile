/**
 * apps/mobile/app/tickets/[id].tsx — S-TICKETS-02 Ticket Detail
 *
 * Redesigned 2026-06-11 per Danny review to mirror dev.5bib.com ticket
 * detail (reference: LÀO CAI MARATHON screenshot):
 *
 *   1. Race banner image
 *   2. Header: race title · date · location · code · status badge
 *   3. BLUE BIB HERO CARD — "BIB" + course chip, giant BIB number, race
 *      name, then the full athlete dossier inside the card (name, email,
 *      shirt size, DOB, gender, distance, name-on-BIB, nationality, club,
 *      ID, health, phone, emergency contact)
 *   4. QR card — only for live statuses (CHECKED_IN / RACEKIT_RECEIVED)
 *   5. Accordions: Giới thiệu giải chạy / Lịch trình sự kiện / Điều lệ giải
 *   6. Actions (primary CTA + tile grid)
 *
 * Real SDK wiring: sdk.ticket.getTicketById + sdk.athlete.getAthleteByTicketCode
 * + sdk.athlete.getBibImage (share). Renders StatusActionButtons per BR-TICKETS-01b.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Share, Image, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';
import { Skeleton } from '../../src/components/Skeleton';
import { Collapsible } from '../../src/components/Collapsible';
import { QRDisplayCard } from '../../src/components/QRDisplayCard';
import { StatusActionButtons } from '../../src/components/domain/StatusActionButtons';
import { FadeSlideIn, QRPulseRing } from '../../src/components/motion';
import type { StatusActionHandlers } from '../../src/components/domain/StatusActionButtons';
import {
  shouldShowTicketQR,
  ATHLETE_STATUS_LABELS,
  ATHLETE_STATUS_VARIANT,
  type AthleteStatus,
} from '../../src/sdk/constants/athlete-status';
import { useToast } from '../../src/components/Toast';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { ticket as ticketSdk } from '../../src/sdk/services/ticket';
import { athlete as athleteSdk } from '../../src/sdk/services/athlete';
import { FetcherError } from '../../src/sdk/core';
import type { Ticket, Athlete } from '../../src/sdk/models';

/**
 * Map the (narrow) Ticket.athleteStatus → wider AthleteStatus enum.
 * Backend may return any of the 8 BR-TICKETS-01 values; SDK type narrows to 3.
 * Reflect missing-info-needs-register → REGISTER (action: complete info).
 */
function asAthleteStatus(s: string | undefined): AthleteStatus {
  const v = String(s ?? '').toUpperCase();
  switch (v) {
    case 'NEW':
    case 'TRANSFERRING':
    case 'REGISTER':
    case 'REMIND_CHECK_IN':
    case 'CHECKED_IN':
    case 'RACEKIT_RECEIVED':
    case 'RACEKIT_NOT_RECEIVED':
    case 'CANCELLED':
      return v;
    // Backend variants — fold into closest equivalent in our constants matrix.
    case 'CHECK_IN':
      return 'CHECKED_IN';
    case 'FINISH':
      return 'RACEKIT_RECEIVED'; // post-race: show share/view-result actions
    case 'DNF':
    case 'DNS':
    case 'DSQ':
      return 'RACEKIT_NOT_RECEIVED'; // post-race no result: show share + support
    case 'NOT_REGISTERED':
      return 'REGISTER';
    case 'ACTIVE':
    case '':
    default:
      return 'REMIND_CHECK_IN';
  }
}

function fmtDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function bibLabel(b: unknown, fallback: string): string {
  return b != null && b !== '' ? String(b) : fallback;
}

/** Distance + date as "12 km · 30/08/2029", dropping missing sides. */
function joinCourseAndDate(distance?: string, dateIso?: string): string {
  const dist = distance
    ? `${String(distance).replace(/\s*km\s*$/i, '')} km`
    : '';
  const date = fmtDate(dateIso);
  return [dist, date].filter(Boolean).join(' · ');
}

function fullName(a: Athlete | null): string | undefined {
  if (!a) return undefined;
  if (a.name) return a.name;
  const combo = [a.firstName, a.lastName].filter(Boolean).join(' ').trim();
  return combo || undefined;
}

/** Crude HTML → text for description/rule accordions (same approach as
 *  events/[path]). Web renders rich HTML; mobile flattens to readable text. */
function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function TicketDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setErrored(false);
    try {
      const tk = await ticketSdk.getTicketById(id);
      setTicket(tk);
      // Athlete lookup uses ticket code_value; fail-soft if not yet bound.
      if (tk?.value) {
        try {
          const a = await athleteSdk.getAthleteByTicketCode(tk.value);
          setAthlete(a);
          setAthleteId(a?.id ?? null);
        } catch {
          // athlete not yet registered for this ticket — non-fatal
          setAthlete(null);
        }
      }
    } catch (e) {
      setErrored(true);
      if (e instanceof FetcherError && e.status === 401) return;
      toast.show({ variant: 'error', message: t('tickets.loadFailed') });
    } finally {
      setLoading(false);
    }
  }, [id, t, toast]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // ------------------------------------------------------------------
  // Share BIB — try image url first, fall back to share intent w/ value.
  // ------------------------------------------------------------------
  const share = useCallback(async () => {
    if (!ticket) return;
    setSharing(true);
    try {
      let imageUrl: string | undefined;
      if (athleteId) {
        try {
          imageUrl = (await athleteSdk.getBibImage(athleteId, true)) || undefined;
        } catch {
          imageUrl = undefined;
        }
      }
      const raceTitle = ticket.race?.title ?? ticket.basicInfo?.raceName ?? '';
      const bibVal = ticket.bib ?? ticket.basicInfo?.bib;
      const bib = bibVal != null && bibVal !== '' ? String(bibVal) : '';
      const msg =
        `${t('tickets.shareTitle')}: ${raceTitle}${bib ? ` · BIB ${bib}` : ''}` +
        (imageUrl ? `\n${imageUrl}` : '');
      await Share.share({ message: msg, url: imageUrl });
    } catch {
      toast.show({ variant: 'error', message: t('tickets.shareBibFailed') });
    } finally {
      setSharing(false);
    }
  }, [athleteId, ticket, t, toast]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header
          title={t('tickets.detailTitle')}
          leading="back"
          onLeadingPress={() => router.back()}
        />
        <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[4] }}>
          <Skeleton height={150} />
          <Skeleton height={380} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </ScrollView>
      </View>
    );
  }

  if (errored || !ticket) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header
          title={t('tickets.detailTitle')}
          leading="back"
          onLeadingPress={() => router.back()}
        />
        <View style={{ padding: tokens.space[5], gap: tokens.space[3] }}>
          <Text style={{ color: tokens.color.neutral700 }}>{t('tickets.loadFailed')}</Text>
          <Button variant="primary" size="md" onPress={load}>
            {t('common.retry')}
          </Button>
        </View>
      </View>
    );
  }

  const transferred = String(ticket.status) === 'TRANSFERRED';
  const cancelled = String(ticket.status) === 'CANCELLED';
  const raceFinished = ticket.race?.status === 'FINISHED' || ticket.race?.status === 'CLOSED';
  const aStatus = asAthleteStatus(ticket.athleteStatus);
  const availableToRoll = ticket.basicInfo?.availableToRoll === true;
  const statusVariant = ATHLETE_STATUS_VARIANT[aStatus];
  const statusLabel = ATHLETE_STATUS_LABELS[aStatus];

  const raceName = (ticket.race?.title ?? ticket.basicInfo?.raceName ?? '—').trim();
  const bannerUrl = ticket.race?.coverImageUrl ?? null;
  const bibValue = bibLabel(ticket.bib ?? ticket.basicInfo?.bib, '');
  const distanceRaw =
    ticket.basicInfo?.courseDistance ?? ticket.raceCourseDistance ?? '';
  const courseChip = distanceRaw
    ? String(distanceRaw).replace(/\s*km\s*$/i, '')
    : '';
  const description = stripHtml(ticket.race?.description);
  const rule = stripHtml(ticket.race?.rule);
  const schedule = ticket.race?.schedule ?? [];

  const handlers: StatusActionHandlers = {
    EDIT_INFO: () => router.push(`/tickets/${ticket.id}/edit`),
    REGISTER_FORM: () => router.push(`/tickets/${ticket.id}/edit`),
    CHANGE_COURSE: ticket.availableToChangeCourse
      ? () => router.push(`/tickets/${ticket.id}/change-course`)
      : undefined,
    TRANSFER:
      transferred || cancelled || raceFinished
        ? undefined
        : () => router.push(`/tickets/${ticket.id}/transfer`),
    EWAIVER: !ticket.disclaimerStatus
      ? () =>
          router.push({
            pathname: '/e-waiver',
            params: {
              prefill_race: ticket.race?.id,
              prefill_email: athlete?.email ?? ticket.receiptEmail,
              skip_step1: 'true',
            },
          })
      : undefined,
    ROLLING_BIB: availableToRoll
      ? () => router.push(`/tickets/${ticket.id}/rolling-bib`)
      : undefined,
    SHARE_BIB: share,
    DELEGATE_RACEKIT: () => router.push(`/tickets/${ticket.id}/edit?focus=delegate`),
    VIEW_RESULT: () => router.push(`/result/race-history`),
    CONTACT_SUPPORT: () => router.push('/profile'),
    VIEW_ORDER: ticket.orderId ? () => router.push(`/orders/${ticket.orderId}`) : undefined,
  };

  // Athlete dossier rows inside the blue hero card — same fields, same
  // order as the web's blue BIB card.
  const dossier: Array<{ label: string; value: string; wide?: boolean }> = [
    { label: t('tickets.field.fullName'), value: fullName(athlete) ?? ticket.athleteName ?? '—', wide: true },
    { label: t('tickets.field.email'), value: athlete?.email ?? ticket.receiptEmail ?? '—', wide: true },
    { label: t('tickets.field.tshirtSize'), value: athlete?.racekit ?? '—' },
    { label: t('tickets.field.dob'), value: athlete?.dob ? fmtDate(athlete.dob) : '—' },
    {
      label: t('tickets.field.gender'),
      value:
        athlete?.gender === 'MALE'
          ? t('profile.gender.male')
          : athlete?.gender === 'FEMALE'
            ? t('profile.gender.female')
            : '—',
    },
    {
      label: t('tickets.field.distance'),
      value: distanceRaw ? `${courseChip} km` : '—',
    },
    { label: t('tickets.field.nameOnBib'), value: athlete?.nameOnBib ?? '—' },
    { label: t('tickets.field.nationality'), value: athlete?.nationality ?? '—' },
    { label: t('tickets.field.club'), value: athlete?.club ?? '—' },
    { label: t('tickets.field.idNumber'), value: athlete?.idNumber ?? '—' },
    { label: t('tickets.field.medical'), value: athlete?.medicalInfo ?? '—' },
    { label: t('tickets.field.phone'), value: athlete?.contactPhone ?? '—' },
    { label: t('tickets.field.sosPhone'), value: athlete?.sosPhone ?? '—', wide: true },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title={t('tickets.detailTitle')}
        leading="back"
        onLeadingPress={() => router.back()}
        actions={[
          {
            icon: sharing ? '…' : '⤴',
            label: t('common.share'),
            onPress: sharing ? () => {} : share,
          },
        ]}
      />
      {!online && <Banner variant="info" message={t('errors.offlineCached')} />}
      {transferred && <Banner variant="warning" message={t('tickets.transferredBanner')} />}

      <ScrollView contentContainerStyle={{ paddingBottom: tokens.space[8] }}>
        {/* 1 — Race banner (web shows the event artwork on top). */}
        {bannerUrl ? (
          <Image
            source={{ uri: bannerUrl }}
            style={{ width, height: width * 0.42, backgroundColor: tokens.color.neutral200 }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : null}

        <View style={{ padding: tokens.space[4], gap: tokens.space[4] }}>
          {/* 2 — Header block: title / date / location / code / status */}
          <FadeSlideIn delay={0}>
            <View style={{ gap: 4 }}>
              <Text
                style={{
                  fontSize: tokens.fontSize.h2,
                  fontWeight: tokens.fontWeight.bold,
                  color: tokens.color.neutral900,
                  textTransform: 'uppercase',
                }}
              >
                {raceName}
              </Text>
              <Text style={{ color: tokens.color.neutral600 }}>
                {[fmtDate(ticket.race?.startDate), ticket.race?.location]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: tokens.space[2],
                  marginTop: 2,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Menlo',
                    fontSize: tokens.fontSize.bodySm,
                    color: tokens.color.neutral500,
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {ticket.value}
                </Text>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </View>
            </View>
          </FadeSlideIn>

          {/* 3 — Blue BIB hero card (web parity). */}
          <FadeSlideIn delay={80}>
            <LinearGradient
              colors={[tokens.color.brandPrimary, tokens.color.brandPrimaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: tokens.radius.xl,
                padding: tokens.space[5],
                gap: tokens.space[3],
                ...tokens.elevation[2],
              }}
            >
              {/* BIB header row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: tokens.fontSize.bodyLg,
                    fontWeight: tokens.fontWeight.bold,
                    letterSpacing: 2,
                  }}
                >
                  BIB
                </Text>
                {!!courseChip && (
                  <View
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      borderRadius: tokens.radius.md,
                      paddingHorizontal: tokens.space[3],
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: tokens.fontWeight.bold }}>
                      {courseChip}
                    </Text>
                  </View>
                )}
              </View>

              {/* Giant BIB number */}
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: bibValue ? 56 : tokens.fontSize.h2,
                  fontWeight: tokens.fontWeight.bold,
                  textAlign: 'center',
                  fontFamily: 'Menlo',
                  letterSpacing: 2,
                }}
              >
                {bibValue || t('tickets.bibNotAssigned')}
              </Text>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  textAlign: 'center',
                  fontWeight: tokens.fontWeight.semibold,
                  textTransform: 'uppercase',
                  fontSize: tokens.fontSize.bodySm,
                  letterSpacing: 1,
                }}
              >
                {raceName}
              </Text>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.25)' }} />

              {/* Athlete dossier — 2-col grid, wide rows span full width. */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: tokens.space[3] }}>
                {dossier.map((f) => (
                  <View key={f.label} style={{ width: f.wide ? '100%' : '50%', paddingRight: tokens.space[2] }}>
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                        marginBottom: 1,
                      }}
                    >
                      {f.label}
                    </Text>
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: tokens.fontSize.bodyMd,
                        fontWeight: tokens.fontWeight.semibold,
                      }}
                      numberOfLines={2}
                    >
                      {f.value}
                    </Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </FadeSlideIn>

          {/* 4 — QR (live statuses only, per web behaviour). */}
          {shouldShowTicketQR(aStatus) && (
            <FadeSlideIn delay={140}>
              <QRPulseRing color={tokens.color.brandPrimary} style={{ borderRadius: tokens.radius.xl }}>
                <QRDisplayCard
                  value={ticket.value}
                  bib={bibLabel(ticket.bib ?? ticket.basicInfo?.bib, t('tickets.bibNotAssigned'))}
                  raceName={raceName}
                  courseAndDate={joinCourseAndDate(
                    ticket.basicInfo?.courseDistance,
                    ticket.race?.startDate,
                  )}
                  online={online}
                />
              </QRPulseRing>
            </FadeSlideIn>
          )}

          {/* 5 — Accordion sections (web parity). Render only when the race
             actually carries content — empty accordions are noise. */}
          <FadeSlideIn delay={200}>
            <View style={{ gap: tokens.space[3] }}>
              {!!description && (
                <Collapsible title={t('tickets.section.about')} initiallyOpen>
                  <Text
                    style={{
                      color: tokens.color.neutral700,
                      fontSize: tokens.fontSize.bodyMd,
                      lineHeight: tokens.lineHeight.bodyMd,
                    }}
                  >
                    {description}
                  </Text>
                </Collapsible>
              )}
              {schedule.length > 0 && (
                <Collapsible title={t('tickets.section.schedule')}>
                  <View style={{ gap: tokens.space[2] }}>
                    {schedule.map((s, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: tokens.space[3] }}>
                        <Text
                          style={{
                            fontFamily: 'Menlo',
                            fontWeight: tokens.fontWeight.semibold,
                            color: tokens.color.neutral700,
                            width: 52,
                          }}
                        >
                          {s.time}
                        </Text>
                        <Text style={{ flex: 1, color: tokens.color.neutral700 }}>
                          {s.description}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Collapsible>
              )}
              {!!rule && (
                <Collapsible title={t('tickets.section.rules')}>
                  <Text
                    style={{
                      color: tokens.color.neutral700,
                      fontSize: tokens.fontSize.bodyMd,
                      lineHeight: tokens.lineHeight.bodyMd,
                    }}
                  >
                    {rule}
                  </Text>
                </Collapsible>
              )}
              {ticket.race?.slug ? (
                <Button
                  variant="ghost"
                  size="md"
                  onPress={() => router.push(`/events/${ticket.race?.slug}`)}
                >
                  {t('tickets.viewRaceDetail')} →
                </Button>
              ) : null}
            </View>
          </FadeSlideIn>

          {/* 6 — Actions */}
          <FadeSlideIn delay={260}>
            <StatusActionButtons
              status={aStatus}
              handlers={handlers}
              rollingBibAvailable={availableToRoll}
            />
          </FadeSlideIn>
        </View>
      </ScrollView>
    </View>
  );
}
