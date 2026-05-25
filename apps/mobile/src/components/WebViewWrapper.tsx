/**
 * apps/mobile/src/components/WebViewWrapper.tsx
 *
 * Spec: design-system #20
 * - URL whitelist enforcement (BR-CHECKOUT-12, BR-WAIVER-06, BR-RESULT-02)
 * - Loading progress bar at top
 * - Deep link return detection
 * - Close confirm
 */

import React, { useRef, useState } from 'react';
import { View, Text, Pressable, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../theme/tokens';

let WebView: any;
try {
  ({ WebView } = require('react-native-webview'));
} catch {}

export interface WebViewWrapperProps {
  url: string;
  /** Domains allowed for navigation. Anything outside → block + warn. */
  allowedDomains: string[];
  /** URL prefix that signals success/cancel — close WebView + emit. */
  returnUrlPrefix: string;
  /** Called with parsed query when returnUrl matched. */
  onReturn: (params: Record<string, string>) => void;
  onClose: () => void;
  title?: string;
  /** Optional badge text shown next to URL (e.g. "PayX QR"). */
  badge?: string;
  /** Show share/refresh actions. */
  showRefresh?: boolean;
  /** Idle timeout in ms (no URL change). 0 = disabled. */
  idleTimeoutMs?: number;
}

export function WebViewWrapper({
  url,
  allowedDomains,
  returnUrlPrefix,
  onReturn,
  onClose,
  title,
  badge,
  showRefresh = true,
  idleTimeoutMs = 0,
}: WebViewWrapperProps) {
  const insets = useSafeAreaInsets();
  const ref = useRef<any>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAllowedHost = (raw: string) => {
    try {
      const u = new URL(raw);
      return allowedDomains.some((d) => u.hostname === d || u.hostname.endsWith('.' + d));
    } catch {
      return false;
    }
  };

  const handleShouldStart = (req: any) => {
    const next = req.url ?? '';
    // Detect return prefix
    if (next.startsWith(returnUrlPrefix)) {
      try {
        const u = new URL(next);
        const params: Record<string, string> = {};
        u.searchParams.forEach((v, k) => (params[k] = v));
        onReturn(params);
      } catch {
        onReturn({});
      }
      return false;
    }
    if (!isAllowedHost(next)) {
      Alert.alert('Liên kết ngoài', 'URL không nằm trong danh sách cho phép');
      return false;
    }
    return true;
  };

  const handleClose = () => {
    Alert.alert('Huỷ giao dịch?', 'Order chưa hoàn tất sẽ tự huỷ sau 15 phút', [
      { text: 'Tiếp tục', style: 'cancel' },
      { text: 'Huỷ', style: 'destructive', onPress: onClose },
    ]);
  };

  const armIdle = () => {
    if (!idleTimeoutMs) return;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      Alert.alert('Phiên thanh toán hết hạn', 'Vui lòng thử lại', [{ text: 'OK', onPress: onClose }]);
    }, idleTimeoutMs);
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.surfaceBg, paddingTop: insets.top }}>
      <View
        style={{
          height: tokens.layout.headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: tokens.space[2],
          gap: tokens.space[2],
          borderBottomWidth: 1,
          borderBottomColor: tokens.color.neutral100,
        }}
      >
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng"
          hitSlop={12}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 22 }}>✕</Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            fontSize: tokens.fontSize.bodyMd,
            color: tokens.color.neutral700,
            fontWeight: tokens.fontWeight.medium,
          }}
          numberOfLines={1}
        >
          {title ?? (() => {
            try {
              return new URL(url).hostname;
            } catch {
              return url;
            }
          })()}
        </Text>
        {badge && (
          <View
            style={{
              paddingHorizontal: tokens.space[2],
              paddingVertical: 2,
              borderRadius: tokens.radius.full,
              backgroundColor: tokens.color.brandPrimaryLight,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: tokens.color.brandPrimary,
              }}
            />
            <Text
              style={{
                color: tokens.color.brandPrimary,
                fontSize: tokens.fontSize.labelSm,
                fontWeight: tokens.fontWeight.semibold,
              }}
            >
              {badge}
            </Text>
          </View>
        )}
        {showRefresh && (
          <Pressable
            onPress={() => ref.current?.reload?.()}
            accessibilityRole="button"
            accessibilityLabel="Tải lại"
            hitSlop={8}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 18 }}>↻</Text>
          </Pressable>
        )}
      </View>

      {!loaded && (
        <View
          style={{
            height: 2,
            backgroundColor: tokens.color.neutral100,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 2,
              width: `${progress * 100}%`,
              backgroundColor: tokens.color.brandPrimary,
            }}
          />
        </View>
      )}

      {WebView ? (
        <WebView
          ref={ref}
          source={{ uri: url }}
          onShouldStartLoadWithRequest={handleShouldStart}
          onLoadProgress={(e: any) => {
            setProgress(e?.nativeEvent?.progress ?? 0);
            armIdle();
          }}
          onLoadEnd={() => setLoaded(true)}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled={Platform.OS === 'ios'}
          style={{ flex: 1 }}
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text>react-native-webview not installed.</Text>
        </View>
      )}
    </View>
  );
}
