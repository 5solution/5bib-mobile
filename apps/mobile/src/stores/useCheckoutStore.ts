/**
 * useCheckoutStore — Checkout flow draft state (EPIC-3 Checkout rev2)
 *
 * Lifecycle: Race chosen → Course chosen → Athlete form → optional VAT → discount → payment
 * Draft persisted to AsyncStorage so user resuming app sees prior progress
 * (BR-CHECKOUT-15 draft auto-save pattern, restored via useDraftPersist hook).
 *
 * NOT stored in SecureStore — non-sensitive UX state only. JWT lives in useAuthStore.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AthleteCreatePayload } from '../sdk/models';
import { zustandAsyncStorage } from '../adapters/async-storage';

export type PaymentMethod = 'VNPAY' | 'PAYOO' | 'MOMO' | null;

export interface VatForm {
  enabled: boolean;
  companyName?: string;
  taxCode?: string;
  address?: string;
  email?: string;
}

export interface DiscountState {
  code: string | null;
  amount: number; // VND
  valid: boolean;
}

export interface CheckoutState {
  raceId: string | null;
  courseId: string | null;
  athleteForm: Partial<AthleteCreatePayload> | null;
  vatForm: VatForm;
  discount: DiscountState;
  paymentMethod: PaymentMethod;
  draftSavedAt: number | null;
}

export interface CheckoutActions {
  setRace: (raceId: string) => void;
  setCourse: (courseId: string) => void;
  setAthlete: (form: Partial<AthleteCreatePayload>) => void;
  toggleVat: (enabled: boolean) => void;
  setVatFields: (fields: Partial<Omit<VatForm, 'enabled'>>) => void;
  applyDiscount: (discount: DiscountState) => void;
  selectPaymentMethod: (method: PaymentMethod) => void;
  saveDraft: () => void;
  restoreDraft: () => Promise<void>;
  clear: () => void;
}

const initial: CheckoutState = {
  raceId: null,
  courseId: null,
  athleteForm: null,
  vatForm: { enabled: false },
  discount: { code: null, amount: 0, valid: false },
  paymentMethod: null,
  draftSavedAt: null,
};

export const useCheckoutStore = create<CheckoutState & CheckoutActions>()(
  persist(
    (set) => ({
      ...initial,
      setRace: (raceId) => set({ raceId, courseId: null }),
      setCourse: (courseId) => set({ courseId }),
      setAthlete: (form) =>
        set((s) => ({ athleteForm: { ...(s.athleteForm ?? {}), ...form } })),
      toggleVat: (enabled) => set((s) => ({ vatForm: { ...s.vatForm, enabled } })),
      setVatFields: (fields) => set((s) => ({ vatForm: { ...s.vatForm, ...fields } })),
      applyDiscount: (discount) => set({ discount }),
      selectPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      saveDraft: () => set({ draftSavedAt: Date.now() }),
      restoreDraft: async () => {
        // persist middleware auto-rehydrates; explicit no-op for symmetry with hook API.
        // TODO(coder): expose `useDraftPersist` hook that wraps this + age-out logic.
      },
      clear: () => set({ ...initial }),
    }),
    {
      name: 'checkout-draft',
      storage: createJSONStorage(() => zustandAsyncStorage),
      partialize: (s) => ({
        raceId: s.raceId,
        courseId: s.courseId,
        athleteForm: s.athleteForm,
        vatForm: s.vatForm,
        discount: s.discount,
        paymentMethod: s.paymentMethod,
        draftSavedAt: s.draftSavedAt,
      }),
    }
  )
);
