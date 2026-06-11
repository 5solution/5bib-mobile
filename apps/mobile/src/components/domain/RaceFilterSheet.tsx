/**
 * apps/mobile/src/components/domain/RaceFilterSheet.tsx — S-BROWSE-09
 *
 * Filter bottom sheet for race list. Edits a transient draft copy of the filter
 * shape; only commits to the Zustand store on "Áp dụng". Drag-down dismiss
 * discards changes.
 *
 * Backed by `useBrowseFilterStore` (status, raceType, city). Provinces fetched
 * via SDK `province.listProvinces()` — backend cache, NOT external API.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheet } from '../BottomSheet';
import { Button } from '../Button';
import { tokens } from '../../theme/tokens';
import {
  useBrowseFilterStore,
  type BrowseFilterState,
} from '../../stores/useBrowseFilterStore';
import { province as provinceSdk } from '../../sdk/services/province';
import type { Province, RaceStatus } from '../../sdk/models';

export interface RaceFilterSheetProps {
  open: boolean;
  onClose: () => void;
  /** Optional callback after Apply tap (parent re-fetches list). */
  onApply?: () => void;
}

interface Draft {
  status: BrowseFilterState['status'];
  raceType: BrowseFilterState['raceType'];
  city: BrowseFilterState['city'];
  timeWindow: BrowseFilterState['timeWindow'];
}

/**
 * Event-date windows (days from today) — web's "Thời gian tổ chức" combobox.
 * Maps to from_date=now / to_date=now+N on the wire. Labels via
 * t(`browse.timeWindow.${key}`).
 */
const TIME_WINDOWS: ReadonlyArray<{ value: number | 'ALL'; key: string }> = [
  { value: 'ALL', key: 'all' },
  { value: 7, key: 'week' },
  { value: 30, key: 'month' },
  { value: 90, key: 'quarter' },
  { value: 180, key: 'halfYear' },
];

const STATUS_OPTIONS: { value: RaceStatus | 'ALL'; key: string }[] = [
  { value: 'ALL', key: 'all' },
  { value: 'OPEN_FOR_SALE', key: 'open' },
  { value: 'COMING_SOON', key: 'comingSoon' },
  { value: 'CLOSED', key: 'closed' },
  { value: 'FINISHED', key: 'finished' },
];

/**
 * Real backend race_type enum + display labels — copied from the deployed
 * web's filter sidebar (dev.5bib.com/vi/events?rt=...). The previous list
 * (MARATHON/TRAIL/TRIATHLON/CHALLENGE) was invented and never matched a
 * single backend value, so the filter silently did nothing.
 */
export const RACE_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'ALL', label: '' }, // label resolved via t('browse.filterAll')
  { value: 'ROAD_MARATHON', label: 'Marathon' },
  { value: 'ROAD_HALF_MARATHON', label: 'Half Marathon' },
  { value: 'TRAIL_RACE', label: 'Trail' },
  { value: 'ULTRA_RAIL_RACE', label: 'Ultra Trail' }, // sic — backend typo "RAIL"
  { value: 'ULTRA_ROAD_RACE', label: 'Ultra Road' },
  { value: 'HILLROAD_RACE', label: 'Hill Road' },
  { value: 'EKIDEN_RACE', label: 'Ekiden' },
  { value: 'ULTRA_LOOP', label: 'Ultra Loop' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

export function RaceFilterSheet({ open, onClose, onApply }: RaceFilterSheetProps) {
  const { t } = useTranslation();
  const store = useBrowseFilterStore();

  const [draft, setDraft] = useState<Draft>({
    status: store.status,
    raceType: store.raceType,
    city: store.city,
    timeWindow: store.timeWindow,
  });

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [provincesLoaded, setProvincesLoaded] = useState(false);

  // Sync draft when sheet opens (snapshot current filters)
  useEffect(() => {
    if (open) {
      setDraft({
        status: store.status,
        raceType: store.raceType,
        city: store.city,
        timeWindow: store.timeWindow,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lazy load provinces once
  useEffect(() => {
    if (!open || provincesLoaded) return;
    (async () => {
      try {
        const list = await provinceSdk.listProvinces();
        setProvinces(list);
      } catch {
        // silent — filter still usable without provinces
      } finally {
        setProvincesLoaded(true);
      }
    })();
  }, [open, provincesLoaded]);

  const apply = () => {
    store.setFilter('status', draft.status);
    store.setFilter('raceType', draft.raceType);
    store.setFilter('city', draft.city);
    store.setFilter('timeWindow', draft.timeWindow);
    onClose();
    onApply?.();
  };

  const reset = () => {
    setDraft({ status: 'ALL', raceType: 'ALL', city: 'ALL', timeWindow: 'ALL' });
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('browse.filter')} snapPoints={['80%']}>
      <ScrollView contentContainerStyle={{ paddingBottom: tokens.space[6], gap: tokens.space[5] }}>
        {/* Status (radio) */}
        <View style={{ gap: tokens.space[2] }}>
          <SectionLabel label={t('browse.filterStatus')} />
          {STATUS_OPTIONS.map((opt) => (
            <RadioRow
              key={opt.value}
              label={statusLabel(opt.value, t)}
              checked={draft.status === opt.value}
              onPress={() => setDraft((d) => ({ ...d, status: opt.value }))}
            />
          ))}
        </View>

        {/* Race type */}
        <View style={{ gap: tokens.space[2] }}>
          <SectionLabel label={t('browse.filterType')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] }}>
            {RACE_TYPES.map((rt) => {
              const active = draft.raceType === rt.value;
              return (
                <Pressable
                  key={rt.value}
                  onPress={() => setDraft((d) => ({ ...d, raceType: rt.value }))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    paddingHorizontal: tokens.space[3],
                    paddingVertical: tokens.space[2],
                    borderRadius: tokens.radius.full,
                    borderWidth: 1,
                    borderColor: active ? tokens.color.brandPrimary : tokens.color.neutral300,
                    backgroundColor: active
                      ? tokens.color.brandPrimaryLight
                      : tokens.color.surfaceCard,
                  }}
                >
                  <Text
                    style={{
                      fontSize: tokens.fontSize.bodySm,
                      color: active ? tokens.color.brandPrimary : tokens.color.neutral700,
                      fontWeight: tokens.fontWeight.medium,
                    }}
                  >
                    {rt.value === 'ALL' ? t('browse.filterAll') : rt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Event-date window — web "Thời gian tổ chức" */}
        <View style={{ gap: tokens.space[2] }}>
          <SectionLabel label={t('browse.filterTime')} />
          {TIME_WINDOWS.map((tw) => (
            <RadioRow
              key={String(tw.value)}
              label={t(`browse.timeWindow.${tw.key}`)}
              checked={draft.timeWindow === tw.value}
              onPress={() => setDraft((d) => ({ ...d, timeWindow: tw.value }))}
            />
          ))}
        </View>

        {/* City picker */}
        <View style={{ gap: tokens.space[2] }}>
          <SectionLabel label={t('browse.filterRegion')} />
          {!provincesLoaded ? (
            <Text style={{ color: tokens.color.neutral500, fontSize: tokens.fontSize.bodySm }}>
              {t('common.loading')}
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 200 }}>
              <RadioRow
                label={t('browse.filterAll')}
                checked={draft.city === 'ALL'}
                onPress={() => setDraft((d) => ({ ...d, city: 'ALL' }))}
              />
              {provinces.map((p) => (
                <RadioRow
                  key={p.name}
                  label={p.name}
                  checked={draft.city === p.name}
                  onPress={() => setDraft((d) => ({ ...d, city: p.name }))}
                />
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Sticky CTA row */}
      <View
        style={{
          flexDirection: 'row',
          gap: tokens.space[2],
          paddingTop: tokens.space[3],
          borderTopWidth: 1,
          borderTopColor: tokens.color.neutral100,
        }}
      >
        <View style={{ flex: 1 }}>
          <Button variant="ghost" size="lg" fullWidth onPress={reset}>
            {t('browse.filterClearAll')}
          </Button>
        </View>
        <View style={{ flex: 2 }}>
          <Button variant="primary" size="lg" fullWidth onPress={apply}>
            {t('browse.filterApply')}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <Text
      style={{
        fontSize: tokens.fontSize.bodyLg,
        fontWeight: tokens.fontWeight.semibold,
        color: tokens.color.neutral900,
      }}
    >
      {label}
    </Text>
  );
}

function RadioRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: tokens.space[3],
        paddingVertical: tokens.space[2],
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: checked ? tokens.color.brandPrimary : tokens.color.neutral300,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: tokens.color.brandPrimary,
            }}
          />
        )}
      </View>
      <Text style={{ fontSize: tokens.fontSize.bodyMd, color: tokens.color.neutral800 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function statusLabel(value: RaceStatus | 'ALL' | string, t: (k: string) => string): string {
  switch (String(value)) {
    case 'ALL':
      return t('browse.filterAll');
    case 'OPEN_FOR_SALE':
    case 'GENERATED_CODE':
      return t('browse.statusOpen');
    case 'COMING_SOON':
      return t('browse.statusComingSoon');
    case 'CLOSED':
      return t('browse.statusClosed');
    case 'FINISHED':
    case 'COMPLETE':
      return t('browse.statusFinished');
    default:
      return String(value ?? '—');
  }
}
