/**
 * apps/mobile/src/components/Toast.tsx
 *
 * Spec: design-system #8 — bottom snackbar.
 * Implemented as portal-like singleton using context. Max 1 visible, queue auto.
 * Auto-dismiss 3s default, 5s for error. Manual dismiss tap.
 *
 * Usage:
 *   <ToastProvider>
 *     <App />
 *   </ToastProvider>
 *   const { show } = useToast();
 *   show({ variant: 'success', message: 'Đăng nhập thành công' })
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../theme/tokens';

type Variant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

interface ToastConfig {
  variant?: Variant;
  message: string;
  durationMs?: number;
}

interface ToastInstance extends ToastConfig {
  id: number;
}

interface ToastContextValue {
  show: (cfg: ToastConfig) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<Variant, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ⓘ',
  neutral: '•',
};

const COLORS: Record<Variant, { bg: string; fg: string; iconFg: string; iconBg: string }> = {
  success: {
    bg: tokens.color.surfaceElevated,
    fg: tokens.color.neutral900,
    iconFg: tokens.color.neutral0,
    iconBg: tokens.color.success,
  },
  error: {
    bg: tokens.color.surfaceElevated,
    fg: tokens.color.neutral900,
    iconFg: tokens.color.neutral0,
    iconBg: tokens.color.error,
  },
  warning: {
    bg: tokens.color.surfaceElevated,
    fg: tokens.color.neutral900,
    iconFg: tokens.color.neutral0,
    iconBg: tokens.color.warning,
  },
  info: {
    bg: tokens.color.surfaceElevated,
    fg: tokens.color.neutral900,
    iconFg: tokens.color.neutral0,
    iconBg: tokens.color.info,
  },
  neutral: {
    bg: tokens.color.neutral800,
    fg: tokens.color.neutral0,
    iconFg: tokens.color.neutral0,
    iconBg: tokens.color.neutral600,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastInstance | null>(null);
  const queue = useRef<ToastInstance[]>([]);
  const translate = useRef(new Animated.Value(80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const idCounter = useRef(0);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translate, {
        toValue: 80,
        duration: tokens.duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, { toValue: 0, duration: tokens.duration.fast, useNativeDriver: true }),
    ]).start(() => {
      setCurrent(null);
      // pop next
      const next = queue.current.shift();
      if (next) {
        setCurrent(next);
      }
    });
  }, [opacity, translate]);

  const show = useCallback(
    (cfg: ToastConfig) => {
      const inst: ToastInstance = { id: ++idCounter.current, ...cfg };
      if (current) {
        queue.current.push(inst);
      } else {
        setCurrent(inst);
      }
    },
    [current],
  );

  useEffect(() => {
    if (!current) return;
    Animated.parallel([
      Animated.timing(translate, {
        toValue: 0,
        duration: tokens.duration.normal,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: tokens.duration.normal,
        useNativeDriver: true,
      }),
    ]).start();
    const dur = current.durationMs ?? (current.variant === 'error' ? 5000 : 3000);
    const t = setTimeout(hide, dur);
    return () => clearTimeout(t);
  }, [current, hide, opacity, translate]);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {current && <ToastView toast={current} translate={translate} opacity={opacity} onPress={hide} />}
    </ToastContext.Provider>
  );
}

function ToastView({
  toast,
  translate,
  opacity,
  onPress,
}: {
  toast: ToastInstance;
  translate: Animated.Value;
  opacity: Animated.Value;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = COLORS[toast.variant ?? 'neutral'];
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + tokens.layout.tabBarHeight + tokens.space[3],
        paddingHorizontal: tokens.space[4],
        transform: [{ translateY: translate }],
        opacity,
        zIndex: 1000,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
        style={{
          backgroundColor: c.bg,
          borderRadius: tokens.radius.lg,
          borderWidth: 1,
          borderColor: tokens.color.neutral200,
          padding: tokens.space[3],
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[3],
          ...tokens.elevation[2],
          alignSelf: 'center',
          maxWidth: 480,
          width: '100%',
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: c.iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: c.iconFg, fontWeight: tokens.fontWeight.bold as any, fontSize: 16 }}>
            {ICONS[toast.variant ?? 'neutral']}
          </Text>
        </View>
        <Text
          style={{
            color: c.fg,
            fontSize: tokens.fontSize.bodyMd,
            flex: 1,
            lineHeight: tokens.lineHeight.bodyMd,
          }}
        >
          {toast.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
