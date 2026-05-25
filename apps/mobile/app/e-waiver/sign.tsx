/**
 * apps/mobile/app/e-waiver/sign.tsx — S-WAIVER-04
 */

import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebViewWrapper } from '../../src/components/WebViewWrapper';
import { useToast } from '../../src/components/Toast';
import { useTranslation } from 'react-i18next';

export default function WaiverSignScreen() {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const { url } = useLocalSearchParams<{ url: string; ticketId?: string }>();

  return (
    <WebViewWrapper
      url={url}
      // PAUSE-EPIC6-01: confirm exact host of signPath (Docusign / HelloSign / self-hosted).
      // For now we accept 5bib.com subdomain + the host of the signPath itself.
      allowedDomains={['5bib.com', new URL(url).hostname]}
      returnUrlPrefix="https://5bib.com/e-waiver-success"
      title="Ký E-Waiver"
      idleTimeoutMs={30 * 60 * 1000}
      onReturn={() => {
        toast.show({ variant: 'success', message: t('waiver.signSuccess') });
        router.back();
      }}
      onClose={() => router.back()}
    />
  );
}
