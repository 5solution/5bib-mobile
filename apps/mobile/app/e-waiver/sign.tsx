/**
 * apps/mobile/app/e-waiver/sign.tsx — S-WAIVER-04
 *
 * Two modes:
 *   1. Hosted (default): legacy WebView to the 5bib-hosted `signPath` URL.
 *      Used when caller only knows the ticket's secret share link.
 *   2. Native: fetch waiver template HTML via SDK, render in WebView for
 *      review, capture optional delegator metadata (adult-signing-for-minor),
 *      submit via `eWaiver.signWaiver(secretCode, html, delegator)`.
 *
 *   Switch is driven by the presence of `race_id` + `secret_code` query.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { Skeleton } from '../../src/components/Skeleton';
import { FormLayout, FormSection } from '../../src/components/FormLayout';
import { WebViewWrapper } from '../../src/components/WebViewWrapper';
import { useToast } from '../../src/components/Toast';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { eWaiver } from '../../src/sdk/services/e-waiver';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaiverSignScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const online = useOnline();
  const { url, ticketId, race_id, secret_code, athlete_name } =
    useLocalSearchParams<{
      url?: string;
      ticketId?: string;
      race_id?: string;
      secret_code?: string;
      athlete_name?: string;
    }>();

  const isNativeMode = !!race_id && !!secret_code;

  // ── HOSTED MODE ─────────────────────────────────────────────────────────
  if (!isNativeMode) {
    const safeUrl = url ?? 'https://5bib.com';
    let host: string;
    try {
      host = new URL(safeUrl).hostname;
    } catch {
      host = '5bib.com';
    }
    return (
      <WebViewWrapper
        url={safeUrl}
        // PAUSE-EPIC6-01: confirm exact host of signPath.
        allowedDomains={['5bib.com', host]}
        returnUrlPrefix="https://5bib.com/e-waiver-success"
        title={t('waiver.title')}
        idleTimeoutMs={30 * 60 * 1000}
        onReturn={() => {
          toast.show({ variant: 'success', message: t('waiver.signSuccess') });
          router.back();
        }}
        onClose={() => router.back()}
      />
    );
  }

  // ── NATIVE MODE ─────────────────────────────────────────────────────────
  return (
    <NativeSignFlow
      raceId={race_id!}
      secretCode={secret_code!}
      defaultName={athlete_name ?? ''}
      ticketId={ticketId}
      online={online}
      onDone={() => {
        toast.show({ variant: 'success', message: t('waiver.signSuccess') });
        router.back();
      }}
      onCancel={() => router.back()}
    />
  );
}

interface NativeSignFlowProps {
  raceId: string;
  secretCode: string;
  ticketId?: string;
  defaultName: string;
  online: boolean;
  onDone: () => void;
  onCancel: () => void;
}

function NativeSignFlow({
  raceId,
  secretCode,
  defaultName,
  online,
  onDone,
  onCancel,
}: NativeSignFlowProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Optional delegator (adult-signing-for-minor) — empty by default.
  const [useDelegator, setUseDelegator] = useState(false);
  const [dName, setDName] = useState(defaultName);
  const [dEmail, setDEmail] = useState('');
  const [dCccd, setDCccd] = useState('');
  const [dPhone, setDPhone] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tpl = await eWaiver.getWaiverTemplate(raceId);
        if (!cancelled) setHtml(tpl);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'load_failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [raceId]);

  const delegatorInvalid =
    useDelegator &&
    (!dName.trim() || !EMAIL_RX.test(dEmail.trim()) || !dCccd.trim());

  const submit = async () => {
    if (!html) return;
    if (delegatorInvalid) {
      toast.show({ variant: 'error', message: t('errors.formInvalid') });
      return;
    }
    setSubmitting(true);
    try {
      await eWaiver.signWaiver(
        secretCode,
        html,
        useDelegator
          ? {
              name: dName.trim(),
              email: dEmail.trim(),
              cccd: dCccd.trim(),
              phone: dPhone.trim() || undefined,
            }
          : undefined,
      );
      onDone();
    } catch (e) {
      toast.show({
        variant: 'error',
        message: e instanceof Error ? e.message : t('errors.generic'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title={t('waiver.title')}
        leading="back"
        onLeadingPress={onCancel}
      />
      {!online && <Banner variant="warning" message={t('errors.needNetwork')} />}
      {loadError && <Banner variant="error" message={t('errors.generic')} />}

      <FormLayout
        stickyBottom={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!html || !online || delegatorInvalid}
            loading={submitting}
            onPress={submit}
          >
            {submitting ? t('waiver.verifying') : t('waiver.signNow')}
          </Button>
        }
      >
        <Text
          style={{
            fontSize: tokens.fontSize.h2,
            fontWeight: tokens.fontWeight.bold,
            color: tokens.color.neutral900,
          }}
          accessibilityRole="header"
        >
          {t('waiver.title')}
        </Text>

        <FormSection title={t('waiver.step1Heading')}>
          {loading ? (
            <View style={{ gap: tokens.space[2] }}>
              <Skeleton height={20} width={'90%'} />
              <Skeleton height={20} width={'80%'} />
              <Skeleton height={20} width={'85%'} />
              <Skeleton height={20} width={'70%'} />
            </View>
          ) : html ? (
            <Card>
              <ScrollView
                style={{ maxHeight: 320 }}
                showsVerticalScrollIndicator
              >
                {/* Read-only render: strip HTML tags client-side to avoid
                    a WebView round-trip on the review screen. Backend still
                    receives the original HTML on submit. */}
                <Text
                  style={{
                    color: tokens.color.neutral800,
                    fontSize: tokens.fontSize.bodySm,
                    lineHeight: tokens.lineHeight.bodyMd,
                  }}
                >
                  {html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                </Text>
              </ScrollView>
            </Card>
          ) : (
            <Text style={{ color: tokens.color.neutral500 }}>
              {t('errors.generic')}
            </Text>
          )}
        </FormSection>

        <FormSection title={t('waiver.viewInfo')}>
          <Button
            variant={useDelegator ? 'primary' : 'outline'}
            size="md"
            fullWidth
            onPress={() => setUseDelegator((v) => !v)}
          >
            {useDelegator ? '✓ ' : ''}
            {t('waiver.viewInfo')}
          </Button>
          {useDelegator && (
            <View style={{ gap: tokens.space[3], marginTop: tokens.space[3] }}>
              <Input
                label={t('common.fullName') ?? 'Họ tên'}
                required
                value={dName}
                onChangeText={setDName}
              />
              <Input
                label={t('waiver.emailLabel')}
                required
                variant="email"
                value={dEmail}
                onChangeText={setDEmail}
              />
              <Input
                label="CCCD"
                required
                value={dCccd}
                onChangeText={setDCccd}
              />
              <Input
                label={t('common.phone') ?? 'Phone'}
                variant="phone"
                value={dPhone}
                onChangeText={setDPhone}
              />
            </View>
          )}
        </FormSection>
      </FormLayout>
    </View>
  );
}
