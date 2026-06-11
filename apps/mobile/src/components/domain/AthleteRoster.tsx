/**
 * apps/mobile/src/components/domain/AthleteRoster.tsx
 *
 * Public registered-athletes roster for an event — web parity G-12
 * ("Danh sách vận động viên" tab on dev.5bib.com event detail, which shows
 * a 500+ row table with course chips, name/BIB search, and pagination).
 *
 * Mobile translation of that table:
 *   - course filter chips (Tất cả + one per course)
 *   - debounced search box (300ms — same as web's BR-BROWSE-06 debounce)
 *   - compact rows instead of a table: name / BIB / course / nationality
 *   - "Xem thêm" load-more instead of numbered pagination (mobile-natural;
 *     page numbers make no sense inside a detail scroll)
 *
 * Self-contained: owns its own fetch/filter/page state so the already-large
 * event detail screen only renders `<AthleteRoster raceId courses />`.
 * Renders rows directly (no nested FlatList) because it lives inside the
 * detail ScrollView — pages are 10 rows, so flat rendering is cheap.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Input } from '../Input';
import { Button } from '../Button';
import { FilterChip } from './FilterChip';
import { useDebouncedValue } from '../../hooks';
import { tokens } from '../../theme/tokens';
import {
  athlete as athleteSdk,
  type PublicRosterAthlete,
} from '../../sdk/services/athlete';
import type { RaceCourse } from '../../sdk/models';

const PAGE_SIZE = 10;

export interface AthleteRosterProps {
  raceId: string;
  /** Courses of the race — drives the filter chips. */
  courses: RaceCourse[];
}

export function AthleteRoster({ raceId, courses }: AthleteRosterProps) {
  const { t } = useTranslation();

  const [courseId, setCourseId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [items, setItems] = useState<PublicRosterAthlete[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errored, setErrored] = useState(false);

  const fetchPage = useCallback(
    async (pageNo: number, append: boolean) => {
      try {
        const r = await athleteSdk.listPublicRoster({
          raceId,
          courseId: courseId ?? undefined,
          name: debouncedSearch.trim() || undefined,
          pageNo,
          pageSize: PAGE_SIZE,
        });
        setItems((prev) => (append ? [...prev, ...r.items] : r.items));
        setTotal(r.pagination.totalCount ?? null);
        setTotalPages(r.pagination.totalPages || 1);
        setPage(pageNo);
        setErrored(false);
      } catch {
        // Roster is a nice-to-have section — fail soft, show retry inline,
        // never block the rest of the detail screen.
        setErrored(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [raceId, courseId, debouncedSearch],
  );

  // Refetch from page 1 whenever filter/search change.
  useEffect(() => {
    setLoading(true);
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = () => {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    fetchPage(page + 1, true);
  };

  // Hide the whole section only when the race genuinely has nobody and no
  // filter is active (a filtered-to-zero list should still show the chips).
  const nothingAtAll =
    !loading && !errored && items.length === 0 && !debouncedSearch && !courseId;
  if (nothingAtAll) return null;

  return (
    <View style={{ gap: tokens.space[3] }}>
      <Text
        style={{
          fontSize: tokens.fontSize.labelSm,
          fontWeight: tokens.fontWeight.semibold,
          color: tokens.color.neutral500,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
        accessibilityRole="header"
      >
        {t('browse.athleteRoster')}
        {total != null ? ` (${total})` : ''}
      </Text>

      {/* Course chips — horizontal scroll, "Tất cả" resets. */}
      {courses.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
            <FilterChip
              label={t('browse.allCourses')}
              active={courseId === null}
              onPress={() => setCourseId(null)}
            />
            {courses.map((c) => (
              <FilterChip
                key={c.id}
                label={c.distance || c.name}
                active={courseId === c.id}
                onPress={() => setCourseId(c.id)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder={t('browse.athleteSearchPlaceholder')}
        accessibilityLabel={t('browse.athleteSearchPlaceholder')}
      />

      {loading ? (
        <ActivityIndicator color={tokens.color.brandPrimary} />
      ) : errored ? (
        <View style={{ gap: tokens.space[2], alignItems: 'flex-start' }}>
          <Text style={{ color: tokens.color.neutral600 }}>
            {t('browse.athleteRosterFailed')}
          </Text>
          <Button variant="ghost" size="sm" onPress={() => fetchPage(1, false)}>
            {t('common.retry')}
          </Button>
        </View>
      ) : items.length === 0 ? (
        <Text style={{ color: tokens.color.neutral500 }}>
          {t('errors.noResults')}
        </Text>
      ) : (
        <View
          style={{
            borderRadius: tokens.radius.lg,
            borderWidth: 1,
            borderColor: tokens.color.neutral200,
            overflow: 'hidden',
          }}
        >
          {items.map((a, i) => (
            <View
              key={`${a.bibNumber}-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: tokens.space[3],
                paddingHorizontal: tokens.space[3],
                paddingVertical: tokens.space[2],
                backgroundColor:
                  i % 2 === 0 ? tokens.color.surfaceCard : tokens.color.neutral50,
              }}
            >
              <View style={{ flex: 1, gap: 1 }}>
                <Text
                  style={{
                    fontSize: tokens.fontSize.bodyMd,
                    fontWeight: tokens.fontWeight.medium,
                    color: tokens.color.neutral900,
                  }}
                  numberOfLines={1}
                >
                  {a.name || '—'}
                </Text>
                <Text
                  style={{ fontSize: tokens.fontSize.bodySm, color: tokens.color.neutral500 }}
                  numberOfLines={1}
                >
                  {[a.courseName, a.nationality].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {!!a.bibNumber && (
                <Text
                  style={{
                    fontFamily: 'Menlo',
                    fontSize: tokens.fontSize.bodySm,
                    fontWeight: tokens.fontWeight.semibold,
                    color: tokens.color.neutral700,
                  }}
                >
                  {a.bibNumber}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {!loading && !errored && page < totalPages && (
        <Button
          variant="outline"
          size="md"
          fullWidth
          loading={loadingMore}
          onPress={loadMore}
        >
          {t('browse.loadMoreAthletes')}
        </Button>
      )}
    </View>
  );
}
