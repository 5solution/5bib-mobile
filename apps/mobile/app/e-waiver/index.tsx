/**
 * apps/mobile/app/e-waiver/index.tsx — S-WAIVER-01/02/03 wizard
 *
 * 3 steps in 1 screen:
 *   0 → race + email
 *   1 → OTP
 *   2 → result list with sign / view-info actions
 *
 * BR-WAIVER-08: from ticket detail → prefill_race + prefill_email + skip_step1
 * BR-WAIVER-13: offline → block CTAs.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { OTPInput } from '../../src/components/OTPInput';
import { FormLayout, FormSection } from '../../src/components/FormLayout';
import { Stepper } from '../../src/components/domain/Stepper';
import { Skeleton } from '../../src/components/Skeleton';
import { EmptyState } from '../../src/components/EmptyState';
import { useToast } from '../../src/components/Toast';
import { useOnline, useCountdown } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import type { SigningRace, SigningTicket } from '../../src/sdk/models';
import { eWaiver } from '../../src/sdk/services/e-waiver';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function WaiverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const params = useLocalSearchParams<{
    prefill_race?: string;
    prefill_email?: string;
    skip_step1?: string;
  }>();
  const skipStep1 = params.skip_step1 === 'true';

  const [step, setStep] = useState<0 | 1 | 2>(skipStep1 ? 1 : 0);
  const [races, setRaces] = useState<SigningRace[]>([]);
  const [racesLoading, setRacesLoading] = useState(false);
  const [racesLoaded, setRacesLoaded] = useState(false);
  const [raceId, setRaceId] = useState<string>(params.prefill_race ?? '');
  const [email, setEmail] = useState(params.prefill_email ?? '');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<SigningTicket[] | null>(null);
  const cd = useCountdown(60, step === 1);

  const fetchRaces = React.useCallback(
    async (forEmail: string) => {
      if (!EMAIL_RX.test(forEmail.trim())) return;
      setRacesLoading(true);
      try {
        const list = await eWaiver.getSigningRaces({ email: forEmail });
        setRaces(list);
        setRacesLoaded(true);
        if (list.length > 0 && !list.find((r) => r.raceId === raceId)) {
          setRaceId(list[0]?.raceId ?? '');
        }
      } catch (e: unknown) {
        const status = (e as { status?: number } | null)?.status;
        toast.show({
          variant: 'error',
          message: status === 404 ? t('waiver.emailNoBib') : t('errors.generic'),
        });
        setRaces([]);
        setRacesLoaded(true);
      } finally {
        setRacesLoading(false);
      }
    },
    [raceId, t, toast],
  );

  // Prefill path (BR-WAIVER-08): if we arrive with race + email, jump to OTP.
  useEffect(() => {
    if (skipStep1 && step === 1 && raceId && email) {
      void requestOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestOtp = async () => {
    setSubmitting(true);
    try {
      await eWaiver.sendSigningOtp({ email: email.trim(), raceId });
      toast.show({ variant: 'success', message: t('auth.otpSentTo', { email }) });
      setStep(1);
      cd.restart(60);
    } catch (e: unknown) {
      const status = (e as { status?: number } | null)?.status;
      toast.show({
        variant: 'error',
        message: status === 404 ? t('waiver.emailNoBib') : t('errors.generic'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async () => {
    if (otp.length !== 6) return;
    setSubmitting(true);
    try {
      const result = await eWaiver.verifySigningOtp({
        email: email.trim(),
        raceId,
        otp,
      });
      setTickets(result);
      toast.show({ variant: 'success', message: t('waiver.verifySuccess') });
      setStep(2);
    } catch (e: unknown) {
      const status = (e as { status?: number } | null)?.status;
      if (status === 410) setOtpErr(t('validation.otpExpired'));
      else {
        setOtpErr(t('validation.otpWrong'));
        setOtp('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = [t('waiver.stepInfo'), t('waiver.stepOtp'), t('waiver.stepResult')];
  const selectedRace = races.find((r) => r.raceId === raceId);
  const allSigned = tickets?.every((tk) => tk.disclaimerStatus);

  return (
    <>
      <Header title={t('waiver.title')} leading="back" onLeadingPress={() => router.back()} />
      <Stepper steps={stepLabels} current={step} />
      {!online && <Banner variant="warning" message={t('errors.needNetwork')} />}

      {step === 0 && (
        <FormLayout
          stickyBottom={
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!raceId || !EMAIL_RX.test(email.trim()) || !online}
              loading={submitting}
              onPress={requestOtp}
            >
              {submitting ? t('auth.sendingOtp') : t('auth.sendOtp')}
            </Button>
          }
        >
          <View>
            <Text
              style={{
                fontSize: tokens.fontSize.h2,
                fontWeight: tokens.fontWeight.bold,
                color: tokens.color.neutral900,
              }}
              accessibilityRole="header"
            >
              {t('waiver.step1Heading')}
            </Text>
            <Text style={{ color: tokens.color.neutral600, marginTop: 4 }}>
              {t('waiver.step1Desc')}
            </Text>
          </View>

          <FormSection title={t('waiver.selectRace')}>
            {racesLoading ? (
              <Skeleton height={48} />
            ) : !racesLoaded ? (
              <Text style={{ color: tokens.color.neutral500 }}>
                {t('waiver.step1Desc')}
              </Text>
            ) : races.length === 0 ? (
              <Text style={{ color: tokens.color.neutral500 }}>{t('waiver.noRaceAvailable')}</Text>
            ) : (
              <View style={{ gap: tokens.space[2] }}>
                {races.map((r) => {
                  const active = r.raceId === raceId;
                  return (
                    <Pressable
                      key={r.raceId}
                      onPress={() => setRaceId(r.raceId)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      style={{
                        padding: tokens.space[3],
                        borderRadius: tokens.radius.md,
                        borderWidth: active ? 2 : 1,
                        borderColor: active ? tokens.color.brandPrimary : tokens.color.neutral300,
                        backgroundColor: active ? tokens.color.brandPrimaryLight : 'transparent',
                        minHeight: 48,
                        justifyContent: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: active ? tokens.color.brandPrimary : tokens.color.neutral900,
                          fontWeight: tokens.fontWeight.medium,
                        }}
                      >
                        {r.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </FormSection>

          <Input
            label={t('waiver.emailLabel')}
            required
            variant="email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setEmailErr(null);
              if (racesLoaded) {
                setRacesLoaded(false);
                setRaces([]);
                setRaceId('');
              }
            }}
            onBlur={() => {
              if (!email) return;
              if (!EMAIL_RX.test(email.trim())) {
                setEmailErr(t('validation.emailInvalid'));
                return;
              }
              if (!racesLoaded && !racesLoading && online) {
                void fetchRaces(email);
              }
            }}
            error={emailErr ?? undefined}
            placeholder="you@example.com"
          />
        </FormLayout>
      )}

      {step === 1 && (
        <FormLayout
          stickyBottom={
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={otp.length !== 6 || !online}
              loading={submitting}
              onPress={verify}
            >
              {submitting ? t('waiver.verifying') : t('common.confirm')}
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
            {t('waiver.step2Heading')}
          </Text>
          <Text style={{ color: tokens.color.neutral600, lineHeight: tokens.lineHeight.bodyMd }}>
            {t('waiver.step2Sub', { email, race: selectedRace?.title ?? '' })}
          </Text>

          <View style={{ marginVertical: tokens.space[4] }}>
            <OTPInput value={otp} onChange={setOtp} error={!!otpErr} />
            {otpErr && (
              <Text
                style={{
                  color: tokens.color.error,
                  fontSize: tokens.fontSize.bodySm,
                  textAlign: 'center',
                  marginTop: tokens.space[2],
                }}
              >
                {otpErr}
              </Text>
            )}
          </View>

          <View style={{ alignItems: 'center' }}>
            {cd.seconds > 0 ? (
              <Text style={{ color: tokens.color.neutral500 }}>
                {t('auth.resendIn', { seconds: cd.seconds })}
              </Text>
            ) : (
              <Button variant="ghost" size="sm" onPress={requestOtp}>
                {t('auth.resendNow')}
              </Button>
            )}
          </View>

          <Button variant="ghost" size="md" fullWidth onPress={() => setStep(0)}>
            {t('common.back')}
          </Button>
        </FormLayout>
      )}

      {step === 2 && (
        <FormLayout>
          <View>
            <Text
              style={{
                fontSize: tokens.fontSize.h2,
                fontWeight: tokens.fontWeight.bold,
                color: tokens.color.neutral900,
              }}
              accessibilityRole="header"
            >
              {selectedRace?.title}
            </Text>
            <Text style={{ color: tokens.color.neutral600, marginTop: 4 }}>
              {t('waiver.ticketsFound', { count: tickets?.length ?? 0 })}
            </Text>
          </View>

          {!tickets || tickets.length === 0 ? (
            <EmptyState title={t('errors.noResults')} />
          ) : allSigned ? (
            <EmptyState
              icon={<Text style={{ fontSize: 32 }}>🎉</Text>}
              title={t('waiver.allSigned')}
              ctaLabel={t('common.goHome')}
              onPress={() => router.replace('/(tabs)/home')}
            />
          ) : (
            <View style={{ gap: tokens.space[3] }}>
              {tickets.map((tk) => (
                <Card key={tk.id}>
                  <View style={{ gap: tokens.space[2] }}>
                    <Text style={{ fontSize: tokens.fontSize.bodyLg, fontWeight: tokens.fontWeight.semibold }}>
                      {tk.courseInfo?.raceName} · {tk.name} - {tk.courseInfo?.courseName}
                    </Text>
                    <Text style={{ color: tokens.color.neutral600, fontSize: tokens.fontSize.bodySm }}>
                      📞 {tk.athleteSubInfo?.contactPhone} · 🎂 {tk.athleteSubInfo?.dob}
                    </Text>
                    <View>
                      {tk.disclaimerStatus ? (
                        <Badge variant="success">✓ {t('waiver.signedBadge')}</Badge>
                      ) : (
                        <Badge variant="warning">⚠ {t('waiver.notSignedBadge')}</Badge>
                      )}
                    </View>
                    <Button
                      variant={tk.disclaimerStatus ? 'outline' : 'primary'}
                      size="md"
                      onPress={() =>
                        tk.signPath &&
                        router.push({
                          pathname: '/e-waiver/sign',
                          params: { url: tk.signPath, ticketId: tk.id },
                        })
                      }
                      disabled={!tk.signPath}
                    >
                      {tk.disclaimerStatus ? `${t('waiver.viewInfo')} →` : `${t('waiver.signNow')} →`}
                    </Button>
                  </View>
                </Card>
              ))}
            </View>
          )}

          <Button variant="ghost" size="md" fullWidth onPress={() => setStep(0)}>
            {t('waiver.restartWithEmail')}
          </Button>
        </FormLayout>
      )}
    </>
  );
}
