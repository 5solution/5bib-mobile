/**
 * apps/mobile/src/components/ErrorState.tsx
 *
 * Spec: design-system #11 — inline error, full-screen error, banner.
 * BR-GLOBAL-04 retry compliance.
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { tokens } from '../theme/tokens';
import { Button } from './Button';

export interface FullScreenErrorProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  retryLabel?: string;
  homeLabel?: string;
  icon?: React.ReactNode;
}

export function FullScreenError({
  title = 'Có lỗi xảy ra',
  description,
  onRetry,
  onGoHome,
  retryLabel = 'Thử lại',
  homeLabel = 'Về trang chủ',
  icon,
}: FullScreenErrorProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: tokens.space[6],
        backgroundColor: tokens.color.surfaceBg,
      }}
      accessibilityRole="alert"
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: tokens.color.errorBg,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: tokens.space[5],
        }}
      >
        {icon ?? <Text style={{ fontSize: 40 }}>⚠</Text>}
      </View>
      <Text
        style={{
          fontSize: tokens.fontSize.h2,
          fontWeight: tokens.fontWeight.bold,
          color: tokens.color.neutral900,
          textAlign: 'center',
          marginBottom: tokens.space[2],
        }}
      >
        {title}
      </Text>
      {description && (
        <Text
          style={{
            fontSize: tokens.fontSize.bodyMd,
            color: tokens.color.neutral600,
            textAlign: 'center',
            lineHeight: tokens.lineHeight.bodyMd,
            marginBottom: tokens.space[6],
            maxWidth: 360,
          }}
        >
          {description}
        </Text>
      )}
      <View style={{ gap: tokens.space[3], alignItems: 'stretch', alignSelf: 'stretch' }}>
        {onRetry && (
          <Button variant="primary" size="lg" fullWidth onPress={onRetry}>
            {retryLabel}
          </Button>
        )}
        {onGoHome && (
          <Button variant="ghost" size="lg" fullWidth onPress={onGoHome}>
            {homeLabel}
          </Button>
        )}
      </View>
    </View>
  );
}

export interface BannerProps {
  variant?: 'error' | 'warning' | 'info' | 'success';
  icon?: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const BANNER_COLORS = {
  error: { bg: tokens.color.errorBg, fg: tokens.color.error, icon: '⚠' },
  warning: { bg: tokens.color.warningBg, fg: tokens.color.warning, icon: '⚠' },
  info: { bg: tokens.color.infoBg, fg: tokens.color.info, icon: 'ⓘ' },
  success: { bg: tokens.color.successBg, fg: tokens.color.success, icon: '✓' },
};

export function Banner({
  variant = 'warning',
  icon,
  message,
  actionLabel,
  onAction,
  dismissible,
  onDismiss,
}: BannerProps) {
  const c = BANNER_COLORS[variant];
  return (
    <View
      style={{
        backgroundColor: c.bg,
        paddingHorizontal: tokens.space[4],
        paddingVertical: tokens.space[3],
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space[2],
        borderBottomWidth: 1,
        borderBottomColor: c.fg + '33',
      }}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      {icon ?? <Text style={{ color: c.fg, fontSize: 16 }}>{c.icon}</Text>}
      <Text
        style={{
          flex: 1,
          color: c.fg,
          fontSize: tokens.fontSize.bodySm,
          fontWeight: tokens.fontWeight.medium,
        }}
      >
        {message}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={6}>
          <Text
            style={{
              color: c.fg,
              fontSize: tokens.fontSize.labelSm,
              fontWeight: tokens.fontWeight.bold,
              textDecorationLine: 'underline',
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      )}
      {dismissible && onDismiss && (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Đóng banner"
          hitSlop={8}
        >
          <Text style={{ color: c.fg, fontSize: 16 }}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}
