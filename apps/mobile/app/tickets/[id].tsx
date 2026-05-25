/**
 * apps/mobile/app/tickets/[id].tsx — S-TICKETS-02 Ticket Detail
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Skeleton } from '../../src/components/Skeleton';
import { QRDisplayCard } from '../../src/components/QRDisplayCard';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import type { Ticket } from '../../src/sdk/models';

const MOCK_TICKET: Ticket = {
  id: 't1',
  value: 'TKT-VALUE-A1234',
  status: 'ACTIVE',
  athleteStatus: 'ACTIVE',
  bib: 'A1234',
  availableToChangeCourse: true,
  race: {
    id: '1',
    slug: 'saigon-marathon-2026',
    title: 'Saigon Marathon 2026',
    coverImageUrl: null,
    startDate: '2026-03-15T06:00:00Z',
    location: 'TP.HCM',
    isHighlight: false,
    bibSetUp: true,
    status: 'OPEN_FOR_SALE',
  },
  basicInfo: {
    value: 'TKT-VALUE-A1234',
    courseId: 'c1',
    courseName: '5 km',
    raceName: 'Saigon Marathon 2026',
    courseDistance: '5 km',
    bib: 'A1234',
    availableToRoll: false,
  },
};

export default function TicketDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await new Promise((r) => setTimeout(r, 500));
      setTicket(MOCK_TICKET);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header title={t('tickets.detailTitle')} leading="back" onLeadingPress={() => router.back()} />
        <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[4] }}>
          <Skeleton height={400} />
          <Skeleton height={120} />
          <Skeleton height={200} />
        </ScrollView>
      </View>
    );
  }

  if (!ticket) return null;

  const fmtDate = (iso?: string) =>
    iso
      ? `${String(new Date(iso).getDate()).padStart(2, '0')}/${String(
          new Date(iso).getMonth() + 1,
        ).padStart(2, '0')}/${new Date(iso).getFullYear()}`
      : '—';

  const transferred = ticket.status === 'TRANSFERRED';
  const raceFinished = ticket.race?.status === 'FINISHED' || ticket.race?.status === 'CLOSED';

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title={t('tickets.detailTitle')}
        leading="back"
        onLeadingPress={() => router.back()}
        actions={[{ icon: '⤴', label: t('common.share'), onPress: () => {} }]}
      />
      {!online && <Banner variant="info" message={t('tickets.qrOffline', { date: 'hôm qua' })} />}
      {transferred && (
        <Banner variant="warning" message={t('tickets.transferredBanner')} />
      )}

      <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[5] }}>
        <QRDisplayCard
          value={ticket.value}
          bib={ticket.bib ?? '—'}
          raceName={ticket.race?.title ?? '—'}
          courseAndDate={`${ticket.basicInfo?.courseDistance} · ${fmtDate(ticket.race?.startDate)}`}
          online={online}
          lastSyncLabel={!online ? 'hôm qua' : undefined}
        />

        <Section title={t('tickets.athleteInfoSection')}>
          <KV label="Tên" value="Nguyễn Văn A" />
          <KV label="Email" value="a@example.com" />
          <KV label="SĐT" value="0912345678" />
          <KV label="Giới tính" value="Nam" />
          <KV label="Ngày sinh" value="01/01/1990" />
          <KV label="Size áo" value="M" />
          <Button variant="outline" size="md" onPress={() => router.push(`/tickets/${ticket.id}/edit`)}>
            {t('tickets.editAthlete')}
          </Button>
        </Section>

        <Section title={t('tickets.raceDetailSection')}>
          <Text style={{ fontSize: tokens.fontSize.bodyLg, fontWeight: tokens.fontWeight.semibold }}>
            {ticket.race?.title}
          </Text>
          <Text style={{ color: tokens.color.neutral600 }}>
            {ticket.basicInfo?.courseDistance} · {fmtDate(ticket.race?.startDate)}
          </Text>
          <Text style={{ color: tokens.color.neutral600 }}>📍 {ticket.race?.location}</Text>
          <Button
            variant="ghost"
            size="md"
            onPress={() => router.push(`/events/${ticket.race?.slug}`)}
          >
            {t('tickets.viewRaceDetail')} →
          </Button>
        </Section>

        <Section title={t('tickets.actionsSection')}>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            disabled={!ticket.availableToChangeCourse || transferred || raceFinished}
            onPress={() => router.push(`/tickets/${ticket.id}/change-course`)}
          >
            {t('tickets.changeCourse')}
          </Button>
          {ticket.basicInfo?.availableToRoll && (
            <Button variant="outline" size="lg" fullWidth onPress={() => {}}>
              {t('tickets.rollingBib')}
            </Button>
          )}
          <Button
            variant="outline"
            size="lg"
            fullWidth
            disabled={transferred || raceFinished}
            onPress={() => router.push(`/tickets/${ticket.id}/transfer`)}
          >
            {t('tickets.transferBib')}
          </Button>
          {!ticket.disclaimerStatus && (
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onPress={() =>
                router.push({
                  pathname: '/e-waiver',
                  params: {
                    prefill_race: ticket.race?.id,
                    prefill_email: 'a@example.com',
                    skip_step1: 'true',
                  },
                })
              }
            >
              {t('tickets.signEwaiver')}
            </Button>
          )}
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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ color: tokens.color.neutral600 }}>{label}</Text>
      <Text style={{ color: tokens.color.neutral900, fontWeight: tokens.fontWeight.medium }}>
        {value}
      </Text>
    </View>
  );
}
