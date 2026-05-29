/**
 * apps/mobile/src/components/domain/StatusActionButtons.tsx
 *
 * Component-18 — Per-status action button matrix (S-TICKETS-02).
 *
 * Reference:
 *   - 01-ba-prd-epic-4-tickets.md rev2 — BR-TICKETS-01b action matrix
 *   - src/sdk/constants/athlete-status.ts — single source of truth for matrix
 *
 * Layout (2026-05-29 redesign per Danny: "các nút tính năng đang rất lộn xộn"):
 *
 *   ┌──────────────────────────────────────────┐
 *   │  PRIMARY FULL-WIDTH BUTTON (variant prim) │   ← the most urgent action
 *   └──────────────────────────────────────────┘
 *   ┌────────┬────────┬────────┬────────┐
 *   │  icon  │  icon  │  icon  │  icon  │           ← secondary as compact
 *   │ label  │ label  │ label  │ label  │             icon-tiles, wraps
 *   └────────┴────────┴────────┴────────┘
 *
 * The PRIMARY = the first action in ATHLETE_STATUS_ACTIONS for that status
 * (matches the BA spec order). Everything else becomes a compact tile.
 * Tiles wrap if there are more than 4 so the row never overflows.
 *
 * 8 athlete statuses supported: NEW, TRANSFERRING, REGISTER, REMIND_CHECK_IN,
 * CHECKED_IN, RACEKIT_RECEIVED, RACEKIT_NOT_RECEIVED, CANCELLED.
 */

import React from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Button } from '../Button';
import { tokens } from '../../theme/tokens';
import { haptics } from '../motion/haptics';
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

/** Icon glyph per action — single emoji, intentionally simple. */
const ACTION_ICONS: Record<AthleteAction, string> = {
  REGISTER_FORM: '📝',
  ROLLING_BIB: '🎰',
  EWAIVER: '✍️',
  SHARE_BIB: '⤴',
  DELEGATE_RACEKIT: '🎁',
  VIEW_RESULT: '🏁',
  EDIT_INFO: '✏️',
  CHANGE_COURSE: '🔁',
  TRANSFER: '↗',
  CONTACT_SUPPORT: '💬',
  VIEW_ORDER: '🧾',
};

/** Color accent for icon tiles — neutral by default, brand for engagement. */
const ACTION_ACCENT: Partial<Record<AthleteAction, string>> = {
  ROLLING_BIB: tokens.color.brandAccent,
  SHARE_BIB: tokens.color.brandPrimary,
  DELEGATE_RACEKIT: tokens.color.info,
  VIEW_RESULT: tokens.color.success,
  TRANSFER: tokens.color.warning,
  CHANGE_COURSE: tokens.color.warning,
  CONTACT_SUPPORT: tokens.color.brandPrimary,
};

/** Compact icon-tile button — 1/4 width by default, wraps to 2/8 etc. */
function ActionTile({
  action,
  onPress,
}: {
  action: AthleteAction;
  onPress: () => void;
}) {
  const accent = ACTION_ACCENT[action] ?? tokens.color.neutral700;
  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={ATHLETE_ACTION_LABELS[action]}
      style={({ pressed }) => [
        {
          // Fixed % width so wrapping doesn't stretch the last row's tile to
          // full-width. 23% × 4 + 3 gaps fits in a row with breathing room.
          width: '23%',
          aspectRatio: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? tokens.color.neutral100 : tokens.color.neutral50,
          borderRadius: tokens.radius.lg,
          gap: 6,
          paddingHorizontal: tokens.space[1],
        },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: tokens.color.surfaceCard,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18, color: accent }}>{ACTION_ICONS[action]}</Text>
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: tokens.fontWeight.medium,
          color: tokens.color.neutral800,
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {compactLabel(action)}
      </Text>
    </Pressable>
  );
}

/**
 * Shorter labels for the compact tiles — full localized label fits in the
 * full-width primary button but is too long for a 72-96px tile. Returns the
 * full label if no compact override is defined.
 */
function compactLabel(action: AthleteAction): string {
  switch (action) {
    case 'TRANSFER':
      return 'Chuyển nhượng';
    case 'EDIT_INFO':
      return 'Sửa thông tin';
    case 'CHANGE_COURSE':
      return 'Đổi cự ly';
    case 'DELEGATE_RACEKIT':
      return 'Uỷ quyền';
    case 'CONTACT_SUPPORT':
      return 'Hỗ trợ';
    case 'VIEW_ORDER':
      return 'Đơn hàng';
    case 'VIEW_RESULT':
      return 'Kết quả';
    case 'SHARE_BIB':
      return 'Chia sẻ';
    default:
      return ATHLETE_ACTION_LABELS[action];
  }
}

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

  // The first action is the spec-designated primary for that status (e.g.
  // REGISTER_FORM for NEW, EWAIVER for REMIND_CHECK_IN, SHARE_BIB for
  // CHECKED_IN). The rest become compact secondary tiles.
  const [primaryAction, ...secondaryActions] = visible;
  const primaryHandler = handlers[primaryAction!];

  return (
    <View
      style={[{ gap: tokens.space[3] }, style]}
      accessibilityRole="menu"
      accessibilityLabel="Các hành động cho vé này"
    >
      {primaryAction && primaryHandler ? (
        <Button variant="primary" size="lg" fullWidth onPress={primaryHandler}>
          {ATHLETE_ACTION_LABELS[primaryAction]}
        </Button>
      ) : null}

      {secondaryActions.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: tokens.space[2],
          }}
        >
          {secondaryActions.map((action) => {
            const onPress = handlers[action];
            if (!onPress) return null;
            return <ActionTile key={action} action={action} onPress={onPress} />;
          })}
        </View>
      ) : null}
    </View>
  );
}
