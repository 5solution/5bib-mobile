/**
 * apps/mobile/app/tickets/[id]/transfer.tsx — S-TICKETS-05
 */

import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '../../../src/components/Header';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';
import { Input } from '../../../src/components/Input';
import { Banner } from '../../../src/components/ErrorState';
import { FormLayout, FormSection } from '../../../src/components/FormLayout';
import { useToast } from '../../../src/components/Toast';
import { tokens } from '../../../src/theme/tokens';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TransferBibScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const myEmail = 'a@example.com';
  const valid = EMAIL_RX.test(email.trim()) && email.trim().toLowerCase() !== myEmail;

  const submit = () => {
    if (email.trim().toLowerCase() === myEmail) {
      setEmailErr(t('tickets.transferSelfError'));
      return;
    }
    if (!EMAIL_RX.test(email.trim())) {
      setEmailErr(t('validation.emailInvalid'));
      return;
    }
    Alert.alert(
      t('tickets.transferConfirmTitle', { bib: 'A1234', email: email.trim() }),
      t('tickets.transferConfirmMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tickets.transferBib'),
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              // await sdk.ticket.transfer({ codeValue, receiptEmail: email.trim(), message });
              await new Promise((r) => setTimeout(r, 800));
              toast.show({ variant: 'success', message: t('tickets.transferSuccess') });
              router.replace('/(tabs)/tickets');
            } catch {
              toast.show({ variant: 'error', message: t('errors.generic') });
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

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
        <Card>
          <Text style={{ fontWeight: tokens.fontWeight.semibold, color: tokens.color.neutral900 }}>
            Saigon Marathon · 5 km
          </Text>
          <Text style={{ color: tokens.color.neutral600 }}>BIB A1234</Text>
        </Card>

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
            placeholder="b@example.com"
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
