/**
 * apps/mobile/src/components/domain/Stepper.tsx
 *
 * 3-dot horizontal stepper for checkout flow / waiver flow.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { tokens } from '../../theme/tokens';

export interface StepperProps {
  steps: string[];
  current: number; // 0-indexed
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Bước ${current + 1} trên ${steps.length}: ${steps[current]}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space[2],
        paddingVertical: tokens.space[3],
        paddingHorizontal: tokens.space[4],
      }}
    >
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const color =
          done || active ? tokens.color.brandPrimary : tokens.color.neutral300;
        return (
          <React.Fragment key={i}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: color,
                  ...(active && {
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                  }),
                }}
              />
              <Text
                style={{
                  fontSize: tokens.fontSize.labelSm,
                  color: active ? tokens.color.brandPrimary : tokens.color.neutral500,
                  fontWeight: active ? tokens.fontWeight.semibold : tokens.fontWeight.regular,
                }}
              >
                {label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: i < current ? tokens.color.brandPrimary : tokens.color.neutral200,
                  marginBottom: 18,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}
