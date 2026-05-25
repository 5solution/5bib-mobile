/**
 * apps/mobile/src/components/FormLayout.tsx
 *
 * Spec: design-system #15
 * Provides KeyboardAvoidingView + ScrollView + FormSection helpers + sticky bottom CTA bar.
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  Text,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../theme/tokens';

export interface FormLayoutProps {
  children: React.ReactNode;
  /** Optional sticky bottom bar (e.g. Continue button). */
  stickyBottom?: React.ReactNode;
  contentContainerStyle?: ViewStyle;
  scrollEnabled?: boolean;
}

export function FormLayout({
  children,
  stickyBottom,
  contentContainerStyle,
  scrollEnabled = true,
}: FormLayoutProps) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: tokens.color.surfaceBg }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          {
            padding: tokens.layout.screenPaddingH,
            paddingBottom: stickyBottom ? tokens.space[6] : tokens.space[6] + insets.bottom,
            gap: tokens.space[4],
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
      {stickyBottom && (
        <View
          style={{
            paddingHorizontal: tokens.layout.screenPaddingH,
            paddingTop: tokens.space[3],
            paddingBottom: tokens.space[3] + insets.bottom,
            borderTopWidth: 1,
            borderTopColor: tokens.color.neutral100,
            backgroundColor: tokens.color.surfaceBg,
          }}
        >
          {stickyBottom}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <View style={{ gap: tokens.space[3] }}>
      {title && (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: tokens.fontSize.h4,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.neutral900,
            }}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {description && (
            <Text style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral600 }}>
              {description}
            </Text>
          )}
        </View>
      )}
      <View style={{ gap: tokens.space[4] }}>{children}</View>
    </View>
  );
}

export function SectionDivider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: tokens.color.neutral200,
        marginVertical: tokens.space[3],
      }}
    />
  );
}
