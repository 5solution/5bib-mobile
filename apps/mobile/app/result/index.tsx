/**
 * apps/mobile/app/result/index.tsx — S-RESULT-01 Result Hub (redirect)
 */

import React, { useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { FormLayout, FormSection } from '../../src/components/FormLayout';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';

export default function ResultHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const [query, setQuery] = useState('');

  const openResult = (url: string) =>
    router.push({ pathname: '/result/webview', params: { url } });

  return (
    <>
      <Header title={t('result.hubTitle')} leading="back" onLeadingPress={() => router.back()} />
      {!online && <Banner variant="warning" message={t('errors.needNetwork')} />}
      <FormLayout>
        <View style={{ alignItems: 'center', paddingVertical: tokens.space[5] }}>
          <Text style={{ fontSize: 64 }}>🏆</Text>
        </View>

        <Text
          style={{
            fontSize: tokens.fontSize.h2,
            fontWeight: tokens.fontWeight.bold,
            color: tokens.color.neutral900,
            textAlign: 'center',
          }}
          accessibilityRole="header"
        >
          {t('result.hubTitle')}
        </Text>
        <Text
          style={{
            fontSize: tokens.fontSize.bodyMd,
            color: tokens.color.neutral600,
            textAlign: 'center',
            lineHeight: tokens.lineHeight.bodyMd,
          }}
        >
          {t('result.hubDesc')}
        </Text>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!online}
          onPress={() => openResult('https://result.5bib.com')}
        >
          {t('result.openResultPage')} →
        </Button>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          disabled={!online}
          onPress={() => Linking.openURL('https://result.5bib.com')}
        >
          {t('result.openInBrowser')}
        </Button>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], marginVertical: tokens.space[3] }}>
          <View style={{ flex: 1, height: 1, backgroundColor: tokens.color.neutral200 }} />
          <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.labelSm }}>
            {t('result.quickLookup')}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: tokens.color.neutral200 }} />
        </View>

        <Input
          variant="search"
          value={query}
          onChangeText={setQuery}
          placeholder={t('result.quickLookupPlaceholder')}
        />
        <Button
          variant="outline"
          size="lg"
          fullWidth
          disabled={!query.trim() || !online}
          onPress={() =>
            openResult(`https://result.5bib.com?q=${encodeURIComponent(query.trim())}`)
          }
        >
          {t('result.quickLookupGo')} →
        </Button>
      </FormLayout>
    </>
  );
}
