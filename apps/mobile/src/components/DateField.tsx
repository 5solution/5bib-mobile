/**
 * apps/mobile/src/components/DateField.tsx
 *
 * Tap-to-pick date-of-birth field. Pure JS (no native datetimepicker module —
 * deliberately, so no dev-client rebuild is required): renders like an Input,
 * opens a BottomSheet with three scroll columns (ngày / tháng / năm).
 *
 * Display format: DD/MM/YYYY (VN convention + what the backend's LocalDate
 * deserializer wants on the wire — see src/utils/date.ts).
 * Value contract: ISO YYYY-MM-DD in / out, so screens keep one canonical
 * format in state and convert at the wire.
 */

import React, { useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { tokens } from '../theme/tokens';
import { toDDMMYYYY, toIsoDate } from '../utils/date';
import { haptics } from './motion/haptics';

export interface DateFieldProps {
  label?: string;
  required?: boolean;
  /** ISO YYYY-MM-DD (tolerates DD/MM/YYYY). Empty = unset. */
  value: string;
  /** Receives ISO YYYY-MM-DD. */
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Confirm button label (default "Xong"). */
  confirmLabel?: string;
  /** Years range — DOB default spans 100 years back from today. */
  minYear?: number;
  maxYear?: number;
}

const ROW_H = 44;

function Column({
  items,
  selected,
  onPick,
  testIDPrefix,
}: {
  items: number[];
  selected: number;
  onPick: (n: number) => void;
  testIDPrefix: string;
}) {
  const ref = useRef<ScrollView>(null);
  const idx = Math.max(0, items.indexOf(selected));

  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1, height: ROW_H * 5 }}
      showsVerticalScrollIndicator={false}
      // Jump straight to the selected row on open.
      contentOffset={{ x: 0, y: Math.max(0, (idx - 2) * ROW_H) }}
    >
      {items.map((n) => {
        const active = n === selected;
        return (
          <Pressable
            key={n}
            testID={`${testIDPrefix}-${n}`}
            onPress={() => {
              haptics.tick();
              onPick(n);
            }}
            style={{
              height: ROW_H,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? tokens.color.brandPrimaryLight : 'transparent',
              borderRadius: tokens.radius.md,
            }}
          >
            <Text
              style={{
                fontSize: tokens.fontSize.bodyLg,
                fontWeight: active ? tokens.fontWeight.bold : tokens.fontWeight.regular,
                color: active ? tokens.color.brandPrimary : tokens.color.neutral800,
                fontFamily: 'Menlo',
              }}
            >
              {String(n).padStart(2, '0')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function DateField({
  label,
  required,
  value,
  onChange,
  placeholder = 'DD/MM/YYYY',
  confirmLabel = 'Xong',
  minYear,
  maxYear,
}: DateFieldProps) {
  const now = new Date();
  const yMax = maxYear ?? now.getFullYear();
  const yMin = minYear ?? yMax - 100;

  const [open, setOpen] = useState(false);

  // Working selection while the sheet is open (committed on confirm).
  const iso = toIsoDate(value);
  const initial = iso
    ? { d: Number(iso.slice(8, 10)), m: Number(iso.slice(5, 7)), y: Number(iso.slice(0, 4)) }
    : { d: 1, m: 1, y: 1990 };
  const [sel, setSel] = useState(initial);

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = yMax; y >= yMin; y--) out.push(y);
    return out;
  }, [yMax, yMin]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(
    () => Array.from({ length: daysInMonth(sel.m, sel.y) }, (_, i) => i + 1),
    [sel.m, sel.y],
  );

  const display = toDDMMYYYY(value);

  const openSheet = () => {
    // Re-seed the working selection from the current value each open.
    const cur = toIsoDate(value);
    if (cur) {
      setSel({
        d: Number(cur.slice(8, 10)),
        m: Number(cur.slice(5, 7)),
        y: Number(cur.slice(0, 4)),
      });
    }
    setOpen(true);
  };

  const confirm = () => {
    const d = Math.min(sel.d, daysInMonth(sel.m, sel.y));
    onChange(
      `${sel.y}-${String(sel.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    );
    setOpen(false);
  };

  return (
    <View style={{ gap: 6 }}>
      {!!label && (
        <Text
          style={{
            fontSize: tokens.fontSize.labelMd,
            fontWeight: tokens.fontWeight.medium,
            color: tokens.color.neutral700,
          }}
        >
          {label}
          {required ? <Text style={{ color: tokens.color.error }}> *</Text> : null}
        </Text>
      )}
      <Pressable
        onPress={openSheet}
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Chọn ngày'}
        accessibilityValue={{ text: display || placeholder }}
        style={({ pressed }) => ({
          height: 48,
          borderWidth: 1,
          borderColor: pressed ? tokens.color.brandPrimary : tokens.color.neutral300,
          borderRadius: tokens.radius.md,
          backgroundColor: tokens.color.surfaceBg,
          paddingHorizontal: tokens.space[3],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        })}
      >
        <Text
          style={{
            fontSize: tokens.fontSize.bodyMd,
            color: display ? tokens.color.neutral900 : tokens.color.neutral400,
          }}
        >
          {display || placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={tokens.color.neutral500} />
      </Pressable>

      {/* Plain RN Modal, NOT the project BottomSheet: that one wraps
         @gorhom's non-modal sheet, which only works mounted at screen root —
         nested inside a form ScrollView it collapses into a broken strip
         (found live in E2E 2026-06-11). Modal portals to the window, so the
         field works anywhere. */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: tokens.color.surfaceOverlay }}
          onPress={() => setOpen(false)}
          accessibilityLabel="Đóng"
        />
        <View
          style={{
            backgroundColor: tokens.color.surfaceCard,
            borderTopLeftRadius: tokens.radius.xl,
            borderTopRightRadius: tokens.radius.xl,
            padding: tokens.space[4],
            paddingBottom: tokens.space[7],
            gap: tokens.space[4],
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: tokens.color.neutral300,
              }}
            />
          </View>
          <Text
            style={{
              fontSize: tokens.fontSize.h3,
              fontWeight: tokens.fontWeight.semibold,
              color: tokens.color.neutral900,
              textAlign: 'center',
            }}
          >
            {label ?? 'Chọn ngày'}
          </Text>
          {/* Column headers */}
          <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
            {['Ngày', 'Tháng', 'Năm'].map((h) => (
              <Text
                key={h}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: tokens.fontSize.labelSm,
                  color: tokens.color.neutral500,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                {h}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
            <Column
              items={days}
              selected={Math.min(sel.d, days.length)}
              onPick={(d) => setSel((p) => ({ ...p, d }))}
              testIDPrefix="datefield-day"
            />
            <Column
              items={months}
              selected={sel.m}
              onPick={(m) => setSel((p) => ({ ...p, m }))}
              testIDPrefix="datefield-month"
            />
            <Column
              items={years}
              selected={sel.y}
              onPick={(y) => setSel((p) => ({ ...p, y }))}
              testIDPrefix="datefield-year"
            />
          </View>
          <Button variant="primary" size="lg" fullWidth onPress={confirm}>
            {confirmLabel}
          </Button>
        </View>
      </Modal>
    </View>
  );
}
