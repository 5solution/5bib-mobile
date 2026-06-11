/**
 * apps/mobile/src/utils/sale-state.ts
 *
 * Ticket-tier sale-window resolution — shared by the event-detail picker
 * (G-13) and checkout step-1 (F5). Web parity: events/[path]/order-summary
 * gates each tier on ticket_type.valid_from/valid_to ("Chưa mở" /
 * "Đã kết thúc" / "Hết vé" badges replace the quantity stepper).
 */

export type SaleState = 'open' | 'notYetOpen' | 'closed';

/**
 * Resolve a ticket type's sale window against the current clock.
 * Missing dates fail open (sellable) — matches web behaviour where
 * phases without windows are always purchasable.
 */
export function resolveSaleState(
  validFrom?: string,
  validTo?: string,
): SaleState {
  const now = Date.now();
  if (validFrom) {
    const from = new Date(validFrom).getTime();
    if (Number.isFinite(from) && now < from) return 'notYetOpen';
  }
  if (validTo) {
    const to = new Date(validTo).getTime();
    if (Number.isFinite(to) && now > to) return 'closed';
  }
  return 'open';
}
