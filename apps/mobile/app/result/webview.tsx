/**
 * apps/mobile/app/result/webview.tsx — S-RESULT-01b
 */

import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Alert } from 'react-native';
import { WebViewWrapper } from '../../src/components/WebViewWrapper';

export default function ResultWebViewScreen() {
  const router = useRouter();
  const { url } = useLocalSearchParams<{ url: string }>();

  return (
    <WebViewWrapper
      url={url ?? 'https://result.5bib.com'}
      allowedDomains={['5bib.com']}
      returnUrlPrefix="https://result.5bib.com/return"
      title="result.5bib.com"
      onReturn={() => router.back()}
      onClose={() => router.back()}
      showRefresh
    />
  );
}
