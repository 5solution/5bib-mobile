/**
 * apps/mobile/app/(tabs)/home.tsx — S-BROWSE-01 Home tab race feed
 *
 * States: Loading (skeleton) | Filled | Empty | Error | Offline | Refreshing
 * Pull-to-refresh + infinite scroll (BR-GLOBAL-12, BR-BROWSE-01).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, useWindowDimensions, ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { Header } from '../../src/components/Header';
import { Banner } from '../../src/components/ErrorState';
import { EmptyState } from '../../src/components/EmptyState';
import { Skeleton } from '../../src/components/Skeleton';
import { Button } from '../../src/components/Button';
import { RaceCard } from '../../src/components/domain/RaceCard';
import { useOnline } from '../../src/hooks';
import { tokens } from '../../src/theme/tokens';
import type { Race } from '../../src/sdk/models';

// Mock data — replace with: sdk.race.list({ ... })
const MOCK_RACES: Race[] = [
  {
    id: '1',
    slug: 'saigon-marathon-2026',
    title: 'Saigon Marathon 2026',
    coverImageUrl: null,
    startDate: '2026-03-15T06:00:00Z',
    location: 'TP.HCM',
    city: 'TP.HCM',
    isHighlight: true,
    bibSetUp: true,
    status: 'OPEN_FOR_SALE',
    courses: [
      { id: 'c1', name: '5 km', distance: '5km', price: 200_000 },
      { id: 'c2', name: '10 km', distance: '10km', price: 350_000 },
      { id: 'c3', name: '21 km', distance: '21km', price: 500_000 },
    ],
  },
  {
    id: '2',
    slug: 'hanoi-half-marathon-2026',
    title: 'Hanoi Half Marathon 2026',
    coverImageUrl: null,
    startDate: '2026-04-20T06:00:00Z',
    location: 'Hà Nội',
    city: 'Hà Nội',
    isHighlight: false,
    bibSetUp: true,
    status: 'OPEN_FOR_SALE',
    courses: [
      { id: 'c4', name: '5 km', distance: '5km', price: 180_000 },
      { id: 'c5', name: '10 km', distance: '10km', price: 320_000 },
      { id: 'c6', name: '21 km', distance: '21km', price: 480_000 },
    ],
  },
];

type LoadState = 'loading' | 'loaded' | 'error' | 'empty';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const online = useOnline();
  const { width } = useWindowDimensions();

  const [state, setState] = useState<LoadState>('loading');
  const [races, setRaces] = useState<Race[]>([]);
  const [featured, setFeatured] = useState<Race[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userName] = useState<string | null>(null); // wire to authStore in real app
  const [carouselPage, setCarouselPage] = useState(0);

  const load = useCallback(async () => {
    setState('loading');
    try {
      // const result = await sdk.race.list({ status: 'OPEN_FOR_SALE', pageSize: 10 });
      await new Promise((r) => setTimeout(r, 600));
      setRaces(MOCK_RACES);
      setFeatured(MOCK_RACES.filter((r) => r.isHighlight));
      setState(MOCK_RACES.length ? 'loaded' : 'empty');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (state === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header title="5BIB" titleAlign="left" leading="none" actions={[]} />
        <ScrollView contentContainerStyle={{ padding: tokens.space[4], gap: tokens.space[4] }}>
          <Skeleton height={180} borderRadius={tokens.radius.lg} />
          <Skeleton width={200} height={20} />
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: tokens.space[3],
                padding: tokens.space[4],
                backgroundColor: tokens.color.surfaceCard,
                borderRadius: tokens.radius.lg,
                ...tokens.elevation[1],
              }}
            >
              <Skeleton width={80} height={80} borderRadius={tokens.radius.md} />
              <View style={{ flex: 1, gap: tokens.space[2] }}>
                <Skeleton height={18} width="80%" />
                <Skeleton height={14} width="60%" />
                <Skeleton height={14} width="50%" />
                <Skeleton height={20} width={120} borderRadius={tokens.radius.full} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
        <Header title="5BIB" titleAlign="left" leading="none" />
        <EmptyState
          icon={<Text style={{ fontSize: 32 }}>🏃</Text>}
          title={t('browse.emptyNoFilter')}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}>
      <Header
        title="5BIB"
        titleAlign="left"
        leading="none"
        actions={[
          { icon: '🔍', label: t('common.search'), onPress: () => {/* open search modal */} },
          { icon: '🔔', label: t('profile.notifications'), onPress: () => {/* notif screen */} },
        ]}
      />
      {!online && <Banner variant="warning" message={t('errors.offlineCached')} />}

      <FlatList
        data={races}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{
          padding: tokens.space[4],
          paddingBottom: tokens.space[10],
          gap: tokens.space[3],
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={tokens.color.brandPrimary}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: tokens.space[4], marginBottom: tokens.space[2] }}>
            <Text
              style={{
                fontSize: tokens.fontSize.bodyLg,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.color.neutral700,
              }}
            >
              {userName
                ? t('browse.homeGreeting', { name: userName })
                : t('browse.homeGreetingAnon')}
            </Text>

            {/* Featured carousel */}
            {featured.length > 0 && (
              <View>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) =>
                    setCarouselPage(Math.round(e.nativeEvent.contentOffset.x / (width - tokens.space[8])))
                  }
                  accessibilityLabel={t('browse.featuredCarouselLabel')}
                >
                  {featured.map((race) => (
                    <View key={race.id} style={{ width: width - tokens.space[8], paddingRight: tokens.space[3] }}>
                      <RaceCard
                        race={race}
                        variant="featured"
                        onPress={() => router.push(`/events/${race.slug}`)}
                      />
                    </View>
                  ))}
                </ScrollView>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 4,
                    justifyContent: 'center',
                    marginTop: tokens.space[2],
                  }}
                >
                  {featured.map((_, i) => (
                    <View
                      key={i}
                      style={{
                        width: carouselPage === i ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor:
                          carouselPage === i ? tokens.color.brandPrimary : tokens.color.neutral300,
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            <Text
              style={{
                fontSize: tokens.fontSize.h3,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.color.neutral900,
                marginTop: tokens.space[2],
              }}
              accessibilityRole="header"
            >
              {t('browse.upcomingRaces')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <RaceCard race={item} onPress={() => router.push(`/events/${item.slug}`)} />
        )}
        ListFooterComponent={
          races.length >= 5 ? (
            <View style={{ paddingTop: tokens.space[4] }}>
              <Button variant="ghost" size="md" fullWidth onPress={() => router.push('/events')}>
                {t('browse.viewAllRaces')} →
              </Button>
            </View>
          ) : null
        }
      />
    </View>
  );
}
