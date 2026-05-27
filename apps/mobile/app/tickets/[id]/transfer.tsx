/**
 * apps/mobile/app/tickets/[id]/transfer.tsx — S-TICKETS-05 Transfer BIB
 *
 * Real SDK wiring: sdk.ticket.getTicketById (context) + sdk.athlete.transferTicket.
 * Maps backend 8 error codes → VN message per BR-TICKETS-20.
 *
 * Flow B (paid transfer with `race.required_transfer_fee=true`) NOT in scope for
 * MVP — race model currently lacks `requiredTransferFee` flag; falls back to
 * Flow A (free transfer + confirm dialog).
 */

import React, { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../../src/components/Header';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { Input } from '../../../src/components/Input';
import { Banner } from '../../../src/components/ErrorState';
import { Skeleton } from '../../../src/components/Skeleton';
import { FormLayout, FormSection } from '../../../src/components/FormLayout';
import { useToast } from '../../../src/components/Toast';
import { useAuthStore } from '../../../src/stores/useAuthStore';
import { tokens } from '../../../src/theme/tokens';
import { ticket as ticketSdk } from '../../../src/sdk/services/ticket';
import { athlete as athleteSdk } from '../../../src/sdk/services/athlete';
import { FetcherError } from '../../../src/sdk/core';
import { getTransferErrorMessage } from '../../../src/sdk/constants/transfer-error-codes';
import type { Ticket } from '../../../src/sdk/models';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Inline-field errors per BR-TICKETS-20 — these stay on the email field. */
const INLINE_EMAIL_ERROR_CODES = new Set(['SAME_RECEIVER', 'EMAIL_NOT_EXIST']);

export default function TransferBibScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const myEmail = (useAuthStore((s) => s.user?.email) ?? '').toLowerCase();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loadingCtx, setLoadingCtx] = useState(true);

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const tk = await ticketSdk.getTicketById(id);
        setTicket(tk);
      } catch (e) {
        if (e instanceof FetcherError && e.status === 401) return;
        toast.show({ variant: 'error', message: t('tickets.loadFailed') });
      } finally {
        setLoadingCtx(false);
      }
    })();
  }, [id, t, toast]);

  const trimmed = email.trim().toLowerCase();
  const valid =
    EMAIL_RX.test(trimmed) && (myEmail ? trimmed !== myEmail : true) && !!ticket?.value;

  const submit = () => {
    if (!ticket?.value) return;
    if (myEmail && trimmed === myEmail) {
      setEmailErr(t('tickets.transferSelfError'));
      return;
    }
    if (!EMAIL_RX.test(trimmed)) {
      setEmailErr(t('validation.emailInvalid'));
      return;
    }

    Alert.alert(
      t('tickets.transferConfirmTitle', {
        bib: ticket.bib ?? ticket.basicInfo?.bib ?? '—',
        email: trimmed,
      }),
      t('tickets.transferConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tickets.transferBib'),
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await athleteSdk.transferTicket(ticket.value, trimmed, message.trim() || undefined);
              toast.show({ variant: 'success', message: t('tickets.transferSuccess') });
              router.replace('/tickets');
            } catch (e) {
              // Map BR-TICKETS-20 error codes if backend returns one.
              const code = extractErrorCode(e);
              if (code && INLINE_EMAIL_ERROR_CODES.has(code)) {
                setEmailErr(getTransferErrorMessage(code as never));
              } else if (code) {
                toast.show({
                  variant: 'error',
                  message: getTransferErrorMessage(code as never),
                });
              } else if (!(e instanceof FetcherError && e.status === 401)) {
                toast.show({ variant: 'error', message: t('errors.generic') });
              }
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (loadingCtx) {
    return (
      <>
        <Header
          title={t('tickets.transferTitle')}
          leading="back"
          onLeadingPress={() => router.back()}
        />
        <Skeleton height={400} />
      </>
    );
  }

  return (
    <>
      <Header
        title={t('tickets.transferTitle')}
        leading="back"
        onLeadingPress={() => router.back()}
      />
      <FormLayout
        stickyBottom={
          <Button
            variant="destructive"
            size="lg"
            fullWidth
            disabled={!valid || submitting}
            loading={submitting}
            onPress={submit}
          >
            {t('tickets.transferBib')}
          </Button>
        }
      >
        {ticket && (
          <Card>
            <Text
              style={{ fontWeight: tokens.fontWeight.semibold, color: tokens.color.neutral900 }}
            >
              {ticket.race?.title ?? ticket.basicInfo?.raceName} ·{' '}
              {ticket.basicInfo?.courseDistance}
            </Text>
            <Text style={{ color: tokens.color.neutral600 }}>
              BIB {ticket.bib ?? ticket.basicInfo?.bib ?? '—'}
            </Text>
          </Card>
        )}

        <Banner variant="warning" message={t('tickets.transferWarning')} />

        <FormSection title={t('tickets.recipientSection')}>
          <Input
            label={t('tickets.recipientEmail')}
            required
            variant="email"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setEmailErr(null);
            }}
            error={emailErr ?? undefined}
            placeholder="recipient@example.com"
          />
        </FormSection>

        <FormSection title={t('tickets.messageOptional')}>
          <Input
            variant="textarea"
            value={message}
            onChangeText={setMessage}
            maxLength={200}
            charCounter
            placeholder="Chúc bạn race vui vẻ nhé!"
          />
        </FormSection>
      </FormLayout>
    </>
  );
}

/**
 * Extract `error_code` field from a FetcherError response payload.
 * Backend envelope: `{ success: false, error_code: 'SAME_RECEIVER', message: '...' }`.
 */
function extractErrorCode(e: unknown): string | null {
  if (!(e instanceof FetcherError)) return null;
  const r = e.response as Record<string, unknown> | undefined;
  if (!r) return null;
  const code = r.error_code ?? r.errorCode ?? r.code;
  return typeof code === 'string' ? code : null;
}
