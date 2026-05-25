/**
 * apps/mobile/src/components/Modal.tsx
 *
 * Spec: design-system #7 — full-screen modal (only when full-screen needed).
 * Use cases: WebView payment, camera, signature.
 */

import React from 'react';
import { Modal as RNModal, View, Text, Pressable, SafeAreaView } from 'react-native';
import { tokens } from '../theme/tokens';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Leading icon position: back arrow or close X */
  leadingIcon?: 'back' | 'close' | 'none';
  trailing?: React.ReactNode;
  children: React.ReactNode;
  /** Status bar overlay color (transparent for camera, white default) */
  backgroundColor?: string;
}

export function Modal({
  open,
  onClose,
  title,
  leadingIcon = 'close',
  trailing,
  children,
  backgroundColor = tokens.color.surfaceBg,
}: ModalProps) {
  return (
    <RNModal visible={open} onRequestClose={onClose} animationType="slide" transparent={false}>
      <SafeAreaView style={{ flex: 1, backgroundColor }}>
        {(title || leadingIcon !== 'none' || trailing) && (
          <View
            style={{
              height: 56,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: tokens.space[2],
              borderBottomWidth: 1,
              borderBottomColor: tokens.color.neutral100,
            }}
          >
            {leadingIcon !== 'none' ? (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={leadingIcon === 'back' ? 'Quay lại' : 'Đóng'}
                hitSlop={12}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 22, color: tokens.color.neutral900 }}>
                  {leadingIcon === 'back' ? '←' : '✕'}
                </Text>
              </Pressable>
            ) : (
              <View style={{ width: 44 }} />
            )}
            {title && (
              <Text
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: tokens.fontSize.h3,
                  fontWeight: tokens.fontWeight.semibold,
                  color: tokens.color.neutral900,
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
            )}
            <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{trailing}</View>
          </View>
        )}
        <View style={{ flex: 1 }}>{children}</View>
      </SafeAreaView>
    </RNModal>
  );
}
