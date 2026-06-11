/**
 * apps/mobile/app/result/index.tsx — S-RESULT-01 Result Hub (redirect)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Linking, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { Skeleton } from '../../src/components/Skeleton';
import { FormLayout, FormSection } from '../../src/components/FormLayout';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import { result as resultSdk } from '../../src/sdk/services/result';
import type { RaceResultRow } from '../../src/sdk/models';

export default function ResultHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const [query, setQuery] = useState('');
  const [myResults, setMyResults] = useState<RaceResultRow[]>([]);
  const [myLoading, setMyLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await resultSdk.listMyResults({ pageSize: 3 });
        if (!cancelled) setMyResults(rows);
      } catch {
        if (!cancelled) setMyResults([]);
      } finally {
        if (!cancelled) setMyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openResult = (url: string) =>
    router.push({ pathname: '/result/webview', params: { url } });

  return (
    <>
      <Header title={t('result.hubTitle')} leading="back" onLeadingPress={() => router.back()} />
      {!online && <Banner variant="warning" message={t('errors.needNetwork')} />}
      <FormLayout>
        <View style={{ alignItems: 'center', paddingVertical: tokens.space[5] }}>
          <Ionicons name="trophy-outline" size={64} color={tokens.color.brandPrimary} />
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

        <FormSection title={t('result.historyTitle')}>
          {myLoading ? (
            <View style={{ gap: tokens.space[2] }}>
              <Skeleton height={64} />
              <Skeleton height={64} />
            </View>
          ) : myResults.length === 0 ? (
            <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}>
              {t('errors.noResults')}
            </Text>
          ) : (
            <View style={{ gap: tokens.space[2] }}>
              {myResults.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() =>
                    openResult(
                      r.certificateUrl ??
                        `https://result.5bib.com/event/${r.raceId ?? ''}/bib/${r.bib ?? ''}`,
                    )
                  }
                  accessibilityRole="button"
                >
                  <Card>
                    <Text
                      style={{
                        fontSize: tokens.fontSize.bodyMd,
                        fontWeight: tokens.fontWeight.semibold,
                        color: tokens.color.neutral900,
                      }}
                      numberOfLines={1}
                    >
                      {r.raceName ?? '—'}
                    </Text>
                    <Text
                      style={{
                        color: tokens.color.neutral600,
                        fontSize: tokens.fontSize.bodySm,
                        marginTop: 2,
                      }}
                    >
                      {[r.courseName, r.bib && `BIB ${r.bib}`, r.finishTime]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </Card>
                </Pressable>
              ))}
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onPress={() => router.push('/result/race-history')}
              >
                {t('result.viewDetail')} →
              </Button>
            </View>
          )}
        </FormSection>

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
