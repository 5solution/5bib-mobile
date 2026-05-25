/**
 * useRollingBibStore — Rolling BIB gamification 4-state machine (BR-TICKETS-15 rev2)
 *
 * State machine:
 *   idle        — NoBIB card visible, "Quay BIB" CTA
 *   rolling     — RollingBIBModal showing 3s slot-machine animation
 *   confirming  — ConfirmBIB preview with gold countdown (user must confirm or cancel)
 *   success     — Final BIB locked on ticket
 *   cancelled   — User backed out at any state → revert to idle / S-TICKETS-02
 *
 * Transitions:
 *   idle      → rolling    via startRoll()
 *   rolling   → confirming via completeRoll(bib, validUntil) [after 3s animation]
 *   confirming → success   via confirmBib()
 *   confirming → cancelled via cancel() [countdown expires OR user taps Cancel]
 *   any        → idle      via reset()
 */

import { create } from 'zustand';

export type RollingBibPhase =
  | 'idle'
  | 'rolling'
  | 'confirming'
  | 'success'
  | 'cancelled';

export interface RollingBibState {
  phase: RollingBibPhase;
  newBib: string | null;
  /** ISO timestamp — gold countdown deadline during 'confirming' phase. */
  validUntil: string | null;
  error: string | null;
}

export interface RollingBibActions {
  startRoll: () => void;
  /** Called when 3s animation completes — server returned proposed BIB. */
  completeRoll: (bib: string, validUntil: string) => void;
  confirmBib: () => void;
  cancel: () => void;
  reset: () => void;
  setError: (error: string | null) => void;
}

const initial: RollingBibState = {
  phase: 'idle',
  newBib: null,
  validUntil: null,
  error: null,
};

export const useRollingBibStore = create<RollingBibState & RollingBibActions>((set) => ({
  ...initial,
  startRoll: () => set({ phase: 'rolling', error: null }),
  completeRoll: (newBib, validUntil) =>
    set({ phase: 'confirming', newBib, validUntil }),
  confirmBib: () => set({ phase: 'success' }),
  cancel: () => set({ phase: 'cancelled', newBib: null, validUntil: null }),
  reset: () => set({ ...initial }),
  setError: (error) => set({ error }),
}));
