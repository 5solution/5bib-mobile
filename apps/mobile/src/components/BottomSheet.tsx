/**
 * apps/mobile/src/components/BottomSheet.tsx
 *
 * Spec: design-system #6
 * Backed by @gorhom/bottom-sheet (recommended).
 * This file is a thin wrapper that enforces design-system tokens consistently.
 */

import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import BS, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { tokens } from '../theme/tokens';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Snap points as percentages of screen height OR pixel strings (e.g. ['50%', '90%']). */
  snapPoints?: (string | number)[];
  children: React.ReactNode;
  /** Show drag handle indicator at top. Default: true */
  showHandle?: boolean;
  /** Show close X button in header. Default: false */
  showClose?: boolean;
}

export function BottomSheet({
  open,
  onClose,
  title,
  snapPoints,
  children,
  showHandle = true,
  showClose = false,
}: BottomSheetProps) {
  const ref = useRef<BS>(null);
  const points = useMemo(() => snapPoints ?? ['50%', '90%'], [snapPoints]);

  useEffect(() => {
    if (open) ref.current?.expand();
    else ref.current?.close();
  }, [open]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BS
      ref={ref}
      index={-1}
      snapPoints={points}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{
        backgroundColor: tokens.color.neutral300,
        width: 40,
        height: 4,
        display: showHandle ? 'flex' : 'none',
      }}
      backgroundStyle={{
        backgroundColor: tokens.color.surfaceCard,
        borderTopLeftRadius: tokens.radius['2xl'],
        borderTopRightRadius: tokens.radius['2xl'],
      }}
    >
      <BottomSheetView style={{ flex: 1, paddingHorizontal: tokens.space[4] }}>
        {(title || showClose) && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: tokens.space[3],
              borderBottomWidth: 1,
              borderBottomColor: tokens.color.neutral100,
              marginBottom: tokens.space[3],
            }}
          >
            {title && (
              <Text
                style={{
                  fontSize: tokens.fontSize.h2,
                  fontWeight: tokens.fontWeight.semibold,
                  color: tokens.color.neutral900,
                  flex: 1,
                }}
              >
                {title}
              </Text>
            )}
            {showClose && (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                hitSlop={8}
              >
                <Text style={{ fontSize: 20, color: tokens.color.neutral600 }}>✕</Text>
              </Pressable>
            )}
          </View>
        )}
        {children}
      </BottomSheetView>
    </BS>
  );
}
