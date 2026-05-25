/**
 * apps/mobile/app/+not-found.tsx
 */

import React from 'react';
import { useRouter } from 'expo-router';
import { FullScreenError } from '../src/components';

export default function NotFound() {
  const router = useRouter();
  return (
    <FullScreenError
      title="Không tìm thấy trang"
      description="Đường dẫn này không tồn tại trong ứng dụng."
      onGoHome={() => router.replace('/(tabs)/home')}
    />
  );
}
