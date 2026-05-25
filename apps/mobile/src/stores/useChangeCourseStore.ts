/**
 * useChangeCourseStore — Change Course 3-step state machine (BR-TICKETS-18)
 *
 * Step 0: course picker + estimate fee
 * Step 1: athlete form update with course-specific fields
 * Step 2: payment (only if fee > 0 — reuses EPIC-3 payment flow)
 *
 * NOT persisted — flow is in-session only. If user exits mid-flow they restart from step 0.
 */

import { create } from 'zustand';
import type { EstimateChangeResponse } from '../sdk/models';
import type { PaymentMethod } from './useCheckoutStore';

export type ChangeCourseStep = 0 | 1 | 2;

export interface ChangeCourseState {
  step: ChangeCourseStep;
  selectedCourseId: string | null;
  estimateData: EstimateChangeResponse | null;
  paymentMethod: PaymentMethod;
  paymentConfirm: boolean;
}

export interface ChangeCourseActions {
  selectCourse: (courseId: string) => void;
  /** Triggers SDK estimate call. TODO(coder): wire to sdk.tickets.estimateChange(). */
  fetchEstimate: (ticketId: string) => Promise<void>;
  goToStep: (step: ChangeCourseStep) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  confirmPayment: () => void;
  /** Submit the change. TODO(coder): wire to sdk.tickets.changeCourse(). */
  commit: (ticketId: string) => Promise<void>;
  reset: () => void;
}

const initial: ChangeCourseState = {
  step: 0,
  selectedCourseId: null,
  estimateData: null,
  paymentMethod: null,
  paymentConfirm: false,
};

export const useChangeCourseStore = create<ChangeCourseState & ChangeCourseActions>(
  (set, _get) => ({
    ...initial,
    selectCourse: (selectedCourseId) =>
      set({ selectedCourseId, estimateData: null }),
    fetchEstimate: async (_ticketId) => {
      // TODO(coder): const res = await sdk.tickets.estimateChange({ ticketId, courseId });
      // set({ estimateData: res });
    },
    goToStep: (step) => set({ step }),
    setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
    confirmPayment: () => set({ paymentConfirm: true }),
    commit: async (_ticketId) => {
      // TODO(coder): await sdk.tickets.changeCourse({ ticketId, courseId, paymentMethod });
    },
    reset: () => set({ ...initial }),
  })
);
