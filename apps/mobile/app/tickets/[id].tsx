/**
 * apps/mobile/app/tickets/[id].tsx — S-TICKETS-02 Ticket Detail
 *
 * Real SDK wiring: sdk.ticket.getTicketById + sdk.athlete.getAthleteByTicketCode
 * + sdk.athlete.getBibImage (share). Renders StatusActionButtons per BR-TICKETS-01b.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Skeleton } from '../../src/components/Skeleton';
import { QRDisplayCard } from '../../src/components/QRDisplayCard';
import { StatusActionButtons } from '../../src/components/domain/StatusActionButtons';
import type { StatusActionHandlers } from '../../src/components/domain/StatusActionButtons';
import type { AthleteStatus } from '../../src/sdk/constants/athlete-status';
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

/** Distance + date as "12 km · 30/08/2029" or just one side if the other
 *  is missing. Avoids the awkward "12 · —" placeholder we used to render
 *  when the backend left startDate null. */
function joinCourseAndDate(distance?: string, dateIso?: string): string {
  // Strip trailing "km" from backend value before re-suffixing — race courses
  // come down as "12" on some endpoints and "10km" on others, double-suffix
  // would render "10km km".
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

export default function TicketDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const toast = useToast();
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
          <Skeleton height={400} />
          <Skeleton height={120} />
          <Skeleton height={200} />
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
    VIEW_RESULT: () => router.push(`/result/race-history`),
    CONTACT_SUPPORT: () => router.push('/profile'),
    VIEW_ORDER: ticket.orderId ? () => router.push(`/orders/${ticket.orderId}`) : undefined,
  };

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

      <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[5] }}>
        <QRDisplayCard
          value={ticket.value}
          bib={bibLabel(ticket.bib ?? ticket.basicInfo?.bib, t('tickets.bibNotAssigned'))}
          raceName={ticket.race?.title?.trim() ?? ticket.basicInfo?.raceName ?? '—'}
          courseAndDate={joinCourseAndDate(
            ticket.basicInfo?.courseDistance,
            ticket.race?.startDate,
          )}
          online={online}
        />

        <Section title={t('tickets.athleteInfoSection')}>
          {/* Matches web `/vi/tickets/{id}` sidebar — 13 fields verified 2026-05-29 */}
          <KV label={t('tickets.field.fullName')} value={fullName(athlete) ?? ticket.athleteName ?? '—'} />
          <KV label={t('tickets.field.email')} value={athlete?.email ?? ticket.receiptEmail ?? '—'} />
          <KV label={t('tickets.field.tshirtSize')} value={athlete?.racekit ?? '—'} />
          <KV label={t('tickets.field.dob')} value={athlete?.dob ? fmtDate(athlete.dob) : '—'} />
          <KV
            label={t('tickets.field.gender')}
            value={
              athlete?.gender === 'MALE'
                ? t('profile.gender.male')
                : athlete?.gender === 'FEMALE'
                  ? t('profile.gender.female')
                  : '—'
            }
          />
          <KV
            label={t('tickets.field.distance')}
            value={
              ticket.basicInfo?.courseDistance
                ? `${String(ticket.basicInfo.courseDistance).replace(/\s*km\s*$/i, '')} km`
                : '—'
            }
          />
          <KV label={t('tickets.field.nameOnBib')} value={athlete?.nameOnBib ?? '—'} />
          <KV label={t('tickets.field.nationality')} value={athlete?.nationality ?? '—'} />
          <KV label={t('tickets.field.club')} value={athlete?.club ?? '—'} />
          <KV label={t('tickets.field.idNumber')} value={athlete?.idNumber ?? '—'} />
          <KV label={t('tickets.field.medical')} value={athlete?.medicalInfo ?? '—'} />
          <KV label={t('tickets.field.phone')} value={athlete?.contactPhone ?? '—'} />
          <KV label={t('tickets.field.sosPhone')} value={athlete?.sosPhone ?? '—'} />
        </Section>

        {/* Delegated person info — only if isRepresent=true on athlete */}
        {athlete?.isRepresent && (
          <Section title={t('tickets.delegatedSection')}>
            <KV
              label={t('tickets.field.delegatedName')}
              value={
                (athlete as Athlete & { delegateName?: string }).delegateName ??
                '—'
              }
            />
            <KV
              label={t('tickets.field.delegatedPhone')}
              value={
                (athlete as Athlete & { delegatePhone?: string }).delegatePhone ??
                '—'
              }
            />
            <KV
              label={t('tickets.field.delegatedId')}
              value={
                (athlete as Athlete & { delegateIdNumber?: string }).delegateIdNumber ??
                '—'
              }
            />
            <KV
              label={t('tickets.field.delegatedEmail')}
              value={
                (athlete as Athlete & { delegateEmail?: string }).delegateEmail ??
                '—'
              }
            />
          </Section>
        )}

        <Section title={t('tickets.raceDetailSection')}>
          <Text
            style={{
              fontSize: tokens.fontSize.bodyLg,
              fontWeight: tokens.fontWeight.semibold,
            }}
          >
            {ticket.race?.title ?? ticket.basicInfo?.raceName}
          </Text>
          <Text style={{ color: tokens.color.neutral600 }}>
            {ticket.basicInfo?.courseDistance} · {fmtDate(ticket.race?.startDate)}
          </Text>
          {!!ticket.race?.location && (
            <Text style={{ color: tokens.color.neutral600 }}>📍 {ticket.race.location}</Text>
          )}
          {ticket.race?.slug && (
            <Button
              variant="ghost"
              size="md"
              onPress={() => router.push(`/events/${ticket.race?.slug}`)}
            >
              {t('tickets.viewRaceDetail')} →
            </Button>
          )}
        </Section>

        <Section title={t('tickets.actionsSection')}>
          <StatusActionButtons
            status={aStatus}
            handlers={handlers}
            rollingBibAvailable={availableToRoll}
          />
        </Section>
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

function KV({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4,
      }}
    >
      <Text style={{ color: tokens.color.neutral600 }}>{label}</Text>
      <Text
        style={{
          color: tokens.color.neutral900,
          fontWeight: tokens.fontWeight.medium,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
