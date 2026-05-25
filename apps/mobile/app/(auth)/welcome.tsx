/**
 * apps/mobile/app/(auth)/welcome.tsx — S-AUTH-01
 *
 * First-launch onboarding: 3-slide swipe carousel + CTA.
 */

import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button } from '../../src/components/Button';
import { tokens } from '../../src/theme/tokens';

const SLIDE_KEYS = [
  { title: 'onboarding.slide1Title', desc: 'onboarding.slide1Desc', glyph: '🏃' },
  { title: 'onboarding.slide2Title', desc: 'onboarding.slide2Desc', glyph: '🎫' },
  { title: 'onboarding.slide3Title', desc: 'onboarding.slide3Desc', glyph: '🏆' },
];

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const next = async () => {
    await AsyncStorage.setItem('first_launch_done', 'true');
    router.replace('/(auth)/register');
  };

  const goLogin = async () => {
    await AsyncStorage.setItem('first_launch_done', 'true');
    router.replace('/(auth)/login');
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg, paddingTop: insets.top }}>
      {/* Logo */}
      <View style={{ alignItems: 'center', paddingVertical: tokens.space[6] }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: tokens.color.brandPrimary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="5BIB"
        >
          <Text
            style={{
              color: tokens.color.neutral0,
              fontSize: 28,
              fontWeight: tokens.fontWeight.bold,
            }}
          >
            5
          </Text>
        </View>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setPage(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        style={{ flex: 1 }}
        accessibilityLabel={t('common.search')}
      >
        {SLIDE_KEYS.map((s, i) => (
          <View
            key={i}
            style={{
              width,
              padding: tokens.space[6],
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.space[4],
            }}
            accessibilityLabel={`Trang ${i + 1} trên ${SLIDE_KEYS.length}`}
          >
            <View
              style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                backgroundColor: tokens.color.brandPrimaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: tokens.space[6],
              }}
            >
              <Text style={{ fontSize: 96 }}>{s.glyph}</Text>
            </View>
            <Text
              style={{
                fontSize: tokens.fontSize.h1,
                fontWeight: tokens.fontWeight.bold,
                color: tokens.color.neutral900,
                textAlign: 'center',
              }}
            >
              {t(s.title)}
            </Text>
            <Text
              style={{
                fontSize: tokens.fontSize.bodyLg,
                color: tokens.color.neutral600,
                textAlign: 'center',
                lineHeight: tokens.lineHeight.bodyLg,
                maxWidth: 320,
              }}
            >
              {t(s.desc)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View
        style={{
          flexDirection: 'row',
          gap: tokens.space[2],
          justifyContent: 'center',
          paddingBottom: tokens.space[4],
        }}
        accessibilityElementsHidden
      >
        {SLIDE_KEYS.map((_, i) => (
          <View
            key={i}
            style={{
              width: page === i ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: page === i ? tokens.color.brandPrimary : tokens.color.neutral300,
            }}
          />
        ))}
      </View>

      {/* CTAs */}
      <View
        style={{
          paddingHorizontal: tokens.space[4],
          paddingBottom: insets.bottom + tokens.space[4],
          gap: tokens.space[2],
        }}
      >
        <Button variant="primary" size="lg" fullWidth onPress={next}>
          {t('onboarding.start')}
        </Button>
        <Button variant="ghost" size="md" fullWidth onPress={goLogin}>
          {t('auth.loginLink')}
        </Button>
        <Button variant="ghost" size="md" fullWidth onPress={() => {/* open language picker */}}>
          🌐 {t('onboarding.switchLang')}
        </Button>
      </View>
    </View>
  );
}
