/**
 * apps/mobile/app/e-waiver/sign.tsx — S-WAIVER-04
 *
 * Two modes:
 *   1. Hosted (default): legacy WebView to the 5bib-hosted `signPath` URL.
 *      Used when caller only knows the ticket's secret share link.
 *   2. Native: full web-parity check-in flow (check-in/[...code] on web):
 *        load /pub/ticket-by-code/{secret} (athlete data + time gate)
 *        → Step 1: confirm participant info + racekit-delegation choice
 *        → Step 2: waiver HTML with merge tags FILLED (web read-html.tsx)
 *          + finger-drawn e-signature (required) uploaded via /upload/free
 *        → POST /pub/aggree-skip-liability/{secret} with the filled HTML.
 *      The filled HTML becomes the S3 PDF server-side — submitting the raw
 *      template (old behavior) produced legal PDFs with `*|tag|*` artifacts
 *      and no signature.
 *
 *   Switch is driven by the presence of `race_id` + `secret_code` query.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { Skeleton } from '../../src/components/Skeleton';
import { FormLayout, FormSection } from '../../src/components/FormLayout';
import { WebViewWrapper } from '../../src/components/WebViewWrapper';
import { SignaturePad } from '../../src/components/SignaturePad';
import { useToast } from '../../src/components/Toast';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import {
  eWaiver,
  fillWaiverTemplate,
  type WaiverSignContext,
} from '../../src/sdk/services/e-waiver';
import { upload } from '../../src/sdk/services/upload';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaiverSignScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const online = useOnline();
  const { url, ticketId, race_id, secret_code } = useLocalSearchParams<{
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
  online: boolean;
  onDone: () => void;
  onCancel: () => void;
}

type Step = 'info' | 'sign';

function NativeSignFlow({
  raceId,
  secretCode,
  online,
  onDone,
  onCancel,
}: NativeSignFlowProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const [ctx, setCtx] = useState<WaiverSignContext | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('info');

  // Racekit pickup: self vs delegate (web check-in DelegatorForm radio).
  const [receive, setReceive] = useState<'self' | 'delegate'>('self');
  const [dName, setDName] = useState('');
  const [dEmail, setDEmail] = useState('');
  const [dCccd, setDCccd] = useState('');
  const [dPhone, setDPhone] = useState('');

  // Latest finger signature as PNG data-URL (null = empty pad).
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c, tpl] = await Promise.all([
          eWaiver.getSignContext(secretCode),
          eWaiver.getWaiverTemplate(raceId),
        ]);
        if (!cancelled) {
          setCtx(c);
          setTemplate(tpl);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [raceId, secretCode]);

  // Exact match after separator-stripping: CHECKEDIN / CHECK_IN / CHECKED_IN.
  // Suffix matching would wrongly catch REMIND_CHECK_IN (the signable status).
  const statusFolded = (ctx?.status ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  const alreadyCheckedIn =
    statusFolded === 'CHECKEDIN' || statusFolded === 'CHECKIN';
  const checkinClosed =
    !!ctx?.checkinEndTime &&
    !alreadyCheckedIn &&
    Date.now() > new Date(ctx.checkinEndTime).getTime();

  const delegateInvalid =
    receive === 'delegate' &&
    (!dName.trim() ||
      !dCccd.trim() ||
      !dPhone.trim() ||
      (!!dEmail.trim() && !EMAIL_RX.test(dEmail.trim())));

  // Merge-tag preview (no signature yet) — what the user actually agrees to.
  const previewDoc = useMemo(() => {
    if (!template || !ctx) return null;
    const merged = fillWaiverTemplate(template, ctx);
    return (
      '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>body{font-family:-apple-system,Roboto,sans-serif;font-size:14px;' +
      'color:#1D2939;margin:0;padding:12px;line-height:1.55;}img{max-width:100%;}' +
      '</style></head><body>' +
      merged +
      '</body></html>'
    );
  }, [template, ctx]);

  const continueFromInfo = () => {
    if (delegateInvalid) {
      toast.show({ variant: 'error', message: t('errors.formInvalid') });
      return;
    }
    setStep('sign');
  };

  const submit = async () => {
    if (!template || !ctx) return;
    if (!sigDataUrl) {
      toast.show({ variant: 'error', message: t('waiver.emptySignature') });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Upload the signature PNG (web: uploadFree → eSignLink).
      const base64 = sigDataUrl.replace(/^data:image\/png;base64,/, '');
      const fileUri = `${FileSystem.cacheDirectory}e-sign-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { url: sigUrl } = await upload.uploadFree({
        uri: fileUri,
        name: 'e-sign.png',
        type: 'image/png',
      });
      if (!sigUrl) throw new Error('signature upload failed');

      // 2. Fill ALL merge tags incl. *|e-sign|* with the uploaded image.
      const merged = fillWaiverTemplate(template, ctx, {
        url: sigUrl,
        signedAtIso: new Date().toISOString(),
      });

      // 3. Sign — html body becomes the legal PDF server-side (web parity:
      //    wrapped in a minimal charset-utf8 document).
      await eWaiver.signWaiver(
        secretCode,
        `<html><head><meta charset="UTF-8"></head><body>${merged}</body></html>`,
        receive === 'delegate'
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

  // ── Early states ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell title={t('waiver.title')} onBack={onCancel}>
        <View style={{ gap: tokens.space[3], padding: tokens.space[4] }}>
          <Skeleton height={120} />
          <Skeleton height={20} width={'80%'} />
          <Skeleton height={20} width={'60%'} />
          <Skeleton height={220} />
        </View>
      </Shell>
    );
  }

  if (loadError || !ctx || !template) {
    return (
      <Shell title={t('waiver.title')} onBack={onCancel}>
        <Banner variant="error" message={t('errors.generic')} />
        <View style={{ padding: tokens.space[4] }}>
          <Button variant="outline" fullWidth onPress={onCancel}>
            {t('common.back')}
          </Button>
        </View>
      </Shell>
    );
  }

  if (alreadyCheckedIn) {
    return (
      <Shell title={t('waiver.title')} onBack={onCancel}>
        <View style={{ padding: tokens.space[4], gap: tokens.space[4] }}>
          <Card>
            <View style={{ alignItems: 'center', gap: tokens.space[3], paddingVertical: tokens.space[4] }}>
              <Ionicons name="checkmark-circle" size={48} color={tokens.color.success} />
              <Text
                style={{
                  fontSize: tokens.fontSize.bodyLg,
                  fontWeight: tokens.fontWeight.bold,
                  color: tokens.color.neutral900,
                  textAlign: 'center',
                }}
              >
                {t('waiver.alreadyCheckedIn')}
              </Text>
            </View>
          </Card>
          <Button variant="primary" fullWidth onPress={onCancel}>
            {t('common.back')}
          </Button>
        </View>
      </Shell>
    );
  }

  if (checkinClosed) {
    return (
      <Shell title={t('waiver.title')} onBack={onCancel}>
        <Banner variant="warning" message={t('waiver.checkinClosed')} />
        <View style={{ padding: tokens.space[4] }}>
          <Button variant="outline" fullWidth onPress={onCancel}>
            {t('common.back')}
          </Button>
        </View>
      </Shell>
    );
  }

  // ── Step 1: participant info + racekit delegation ───────────────────────
  if (step === 'info') {
    return (
      <Shell title={t('waiver.title')} onBack={onCancel}>
        {!online && <Banner variant="warning" message={t('errors.needNetwork')} />}
        <FormLayout
          stickyBottom={
            <Button variant="primary" size="lg" fullWidth onPress={continueFromInfo}>
              {t('common.continue')}
            </Button>
          }
        >
          <StepDots current={1} />
          <FormSection title={t('waiver.participantInfo')}>
            <Card>
              <View style={{ gap: tokens.space[2] }}>
                <InfoRow label={t('common.fullName')} value={ctx.athlete.name} />
                <InfoRow label="Email" value={ctx.athlete.email} />
                <InfoRow label={t('common.phone')} value={ctx.athlete.contactPhone} />
                <InfoRow label="CCCD" value={ctx.athlete.idNumber} />
                <InfoRow label={t('tickets.field.distance')} value={ctx.courseName} />
                {ctx.bib ? <InfoRow label="BIB" value={ctx.bib} /> : null}
              </View>
            </Card>
          </FormSection>

          {ctx.delegationEnabled && (
            <FormSection title={t('waiver.receiveQuestion')}>
              <RadioRow
                label={t('waiver.receiveSelf')}
                selected={receive === 'self'}
                onPress={() => setReceive('self')}
              />
              <RadioRow
                label={t('waiver.receiveDelegate')}
                selected={receive === 'delegate'}
                onPress={() => setReceive('delegate')}
              />
              {receive === 'delegate' && (
                <View style={{ gap: tokens.space[3], marginTop: tokens.space[3] }}>
                  <Input
                    label={t('tickets.delegate.name')}
                    required
                    value={dName}
                    onChangeText={setDName}
                  />
                  <Input
                    label={t('tickets.delegate.email')}
                    variant="email"
                    value={dEmail}
                    onChangeText={setDEmail}
                  />
                  <Input
                    label={t('tickets.delegate.phone')}
                    required
                    variant="phone"
                    value={dPhone}
                    onChangeText={setDPhone}
                  />
                  <Input
                    label={t('tickets.delegate.cccd')}
                    required
                    value={dCccd}
                    onChangeText={setDCccd}
                  />
                </View>
              )}
            </FormSection>
          )}
        </FormLayout>
      </Shell>
    );
  }

  // ── Step 2: read filled waiver + e-signature ────────────────────────────
  return (
    <Shell title={t('waiver.title')} onBack={() => setStep('info')}>
      {!online && <Banner variant="warning" message={t('errors.needNetwork')} />}
      <FormLayout
        stickyBottom={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!online || !sigDataUrl}
            loading={submitting}
            onPress={submit}
          >
            {submitting ? t('waiver.verifying') : t('waiver.signNow')}
          </Button>
        }
      >
        <StepDots current={2} />
        <FormSection title={t('waiver.disclaimerHeading')}>
          <Text
            style={{
              fontSize: tokens.fontSize.bodySm,
              color: tokens.color.neutral600,
            }}
          >
            {t('waiver.readCarefully')}
          </Text>
          <View
            style={{
              height: 380,
              borderRadius: tokens.radius.lg,
              borderWidth: 1,
              borderColor: tokens.color.neutral200,
              overflow: 'hidden',
              backgroundColor: '#fff',
              marginTop: tokens.space[2],
            }}
          >
            <WebView
              source={{ html: previewDoc ?? '' }}
              originWhitelist={['*']}
              javaScriptEnabled={false}
              style={{ flex: 1 }}
            />
          </View>
        </FormSection>

        <FormSection title={t('waiver.eSignature')}>
          <Text
            style={{
              fontSize: tokens.fontSize.bodySm,
              color: tokens.color.neutral600,
              fontStyle: 'italic',
            }}
          >
            {t('waiver.eSignatureNote')}
          </Text>
          <SignaturePad
            onChange={setSigDataUrl}
            height={220}
            style={{ marginTop: tokens.space[2] }}
          />
        </FormSection>
      </FormLayout>
    </Shell>
  );
}

// ── Small presentational helpers ─────────────────────────────────────────

function Shell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header title={title} leading="back" onLeadingPress={onBack} />
      {children}
    </View>
  );
}

function StepDots({ current }: { current: 1 | 2 }) {
  const { t } = useTranslation();
  const items = [t('waiver.participantInfo'), t('waiver.disclaimerHeading')];
  return (
    <View style={{ flexDirection: 'row', gap: tokens.space[2], alignItems: 'center' }}>
      {items.map((label, i) => {
        const active = i + 1 === current;
        const done = i + 1 < current;
        return (
          <View
            key={label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  active || done ? tokens.color.brandPrimary : tokens.color.neutral200,
              }}
            >
              {done ? (
                <Ionicons name="checkmark" size={13} color="#fff" />
              ) : (
                <Text style={{ color: active ? '#fff' : tokens.color.neutral600, fontSize: 12, fontWeight: '700' }}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={{
                fontSize: tokens.fontSize.bodySm,
                color: active ? tokens.color.neutral900 : tokens.color.neutral500,
                fontWeight: active ? tokens.fontWeight.bold : tokens.fontWeight.regular,
                flexShrink: 1,
              }}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space[3] }}>
      <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral500 }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: tokens.fontSize.bodySm,
          color: tokens.color.neutral900,
          fontWeight: tokens.fontWeight.medium,
          flexShrink: 1,
          textAlign: 'right',
        }}
      >
        {value || '—'}
      </Text>
    </View>
  );
}

function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space[3],
        paddingVertical: tokens.space[2],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: selected ? tokens.color.brandPrimary : tokens.color.neutral300,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: tokens.color.brandPrimary,
            }}
          />
        )}
      </View>
      <Text style={{ fontSize: tokens.fontSize.bodyMd, color: tokens.color.neutral900 }}>
        {label}
      </Text>
    </Pressable>
  );
}
