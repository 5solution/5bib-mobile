/**
 * apps/mobile/app/+not-found.tsx
 */

import React from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { FullScreenError } from '../src/components';

export default function NotFound() {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <FullScreenError
      title={t('errors.pageNotFound')}
      description={t('errors.pageNotFoundDesc')}
      onGoHome={() => router.replace('/home')}
    />
  );
}
