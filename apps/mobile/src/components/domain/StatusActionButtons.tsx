/**
 * apps/mobile/src/components/domain/StatusActionButtons.tsx
 *
 * Component-18 — Per-status action button matrix (S-TICKETS-02).
 *
 * Reference:
 *   - 01-ba-prd-epic-4-tickets.md rev2 — BR-TICKETS-01b action matrix
 *   - src/sdk/constants/athlete-status.ts — single source of truth for matrix
 *
 * Renders a vertical stack of action buttons whose presence depends on the
 * current athlete status. Parent provides callback handlers per action — only
 * the actions visible for that status will be triggered.
 *
 * 8 athlete statuses supported: NEW, TRANSFERRING, REGISTER, REMIND_CHECK_IN,
 * CHECKED_IN, RACEKIT_RECEIVED, RACEKIT_NOT_RECEIVED, CANCELLED.
 */

import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { Button } from '../Button';
import { tokens } from '../../theme/tokens';
import {
  ATHLETE_STATUS_ACTIONS,
  ATHLETE_ACTION_LABELS,
  type AthleteAction,
  type AthleteStatus,
} from '../../sdk/constants/athlete-status';

export type StatusActionHandlers = Partial<Record<AthleteAction, () => void>>;

export interface StatusActionButtonsProps {
  status: AthleteStatus;
  /** Map of action → onPress handler. Missing handler → button hidden. */
  handlers: StatusActionHandlers;
  /** Hide actions where the handler is missing (default true). */
  hideMissing?: boolean;
  /** Optional override: hide ROLLING_BIB if not available for this ticket. */
  rollingBibAvailable?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Map action → button variant for visual hierarchy. */
const ACTION_VARIANTS: Partial<Record<AthleteAction, 'primary' | 'secondary' | 'tertiary' | 'danger'>> = {
  REGISTER_FORM: 'primary',
  ROLLING_BIB: 'primary',
  EWAIVER: 'primary',
  SHARE_BIB: 'secondary',
  VIEW_RESULT: 'secondary',
  DELEGATE_RACEKIT: 'secondary',
  EDIT_INFO: 'tertiary',
  CHANGE_COURSE: 'tertiary',
  TRANSFER: 'tertiary',
  CONTACT_SUPPORT: 'tertiary',
  VIEW_ORDER: 'tertiary',
};

export function StatusActionButtons({
  status,
  handlers,
  hideMissing = true,
  rollingBibAvailable,
  style,
}: StatusActionButtonsProps) {
  const actions = ATHLETE_STATUS_ACTIONS[status] ?? [];

  // Empty matrix (e.g., TRANSFERRING) → render nothing.
  if (actions.length === 0) return null;

  const visible = actions.filter((a) => {
    if (a === 'ROLLING_BIB' && rollingBibAvailable === false) return false;
    if (hideMissing && !handlers[a]) return false;
    return true;
  });

  if (visible.length === 0) return null;

  return (
    <View
      style={[{ gap: tokens.space[2] }, style]}
      accessibilityRole="menu"
      accessibilityLabel="Các hành động cho vé này"
    >
      {visible.map((action) => {
        const onPress = handlers[action];
        const variant = (ACTION_VARIANTS[action] ?? 'secondary') as any;
        return (
          <Button
            key={action}
            variant={variant}
            onPress={onPress}
            accessibilityLabel={ATHLETE_ACTION_LABELS[action]}
          >
            {ATHLETE_ACTION_LABELS[action]}
          </Button>
        );
      })}
    </View>
  );
}
