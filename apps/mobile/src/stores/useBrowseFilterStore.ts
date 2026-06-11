/**
 * useBrowseFilterStore — Browse / Search filters (EPIC-2)
 *
 * In-memory: status, raceType, city, sort, searchQuery
 * Persisted to AsyncStorage: recentSearches (LRU max 10)
 *
 * recentSearches uses LRU semantics: addRecentSearch moves existing entry
 * to head if already present, else prepends and trims to 10.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RaceStatus } from '../sdk/models';
import { zustandAsyncStorage } from '../adapters/async-storage';

export type SortField = 'date' | 'name' | 'distance' | 'price';
export type SortDirection = 'asc' | 'desc';

const MAX_RECENT = 10;

export interface BrowseFilterState {
  status: RaceStatus | 'ALL';
  raceType: string | 'ALL';
  city: string | 'ALL';
  /**
   * Event-date window in days from today (web "Thời gian tổ chức"):
   * 'ALL' = no window, otherwise from_date=now → to_date=now+N days.
   */
  timeWindow: number | 'ALL';
  sortField: SortField;
  sortDirection: SortDirection;
  searchQuery: string;
  recentSearches: string[];
}

export interface BrowseFilterActions {
  setFilter: <K extends keyof BrowseFilterState>(
    field: K,
    value: BrowseFilterState[K]
  ) => void;
  clearFilters: () => void;
  addRecentSearch: (term: string) => void;
  clearRecent: () => void;
}

const initial: BrowseFilterState = {
  status: 'ALL',
  raceType: 'ALL',
  city: 'ALL',
  timeWindow: 'ALL',
  sortField: 'date',
  sortDirection: 'desc',
  searchQuery: '',
  recentSearches: [],
};

export const useBrowseFilterStore = create<BrowseFilterState & BrowseFilterActions>()(
  persist(
    (set) => ({
      ...initial,
      setFilter: (field, value) => set({ [field]: value } as Partial<BrowseFilterState>),
      clearFilters: () =>
        set({
          status: 'ALL',
          raceType: 'ALL',
          city: 'ALL',
          timeWindow: 'ALL',
          sortField: 'date',
          sortDirection: 'desc',
          searchQuery: '',
        }),
      addRecentSearch: (term) => {
        const t = term.trim();
        if (!t) return;
        set((s) => {
          const deduped = s.recentSearches.filter((x) => x.toLowerCase() !== t.toLowerCase());
          return { recentSearches: [t, ...deduped].slice(0, MAX_RECENT) };
        });
      },
      clearRecent: () => set({ recentSearches: [] }),
    }),
    {
      name: 'browse-filter',
      storage: createJSONStorage(() => zustandAsyncStorage),
      // Only recentSearches persisted; transient filters reset between app launches.
      partialize: (s) => ({ recentSearches: s.recentSearches }),
    }
  )
);
