/**
 * apps/mobile/src/components/index.ts
 *
 * Barrel export — keep app/* imports tidy.
 */

export { Button } from './Button';
export type { ButtonProps } from './Button';
export { Input } from './Input';
export type { InputProps } from './Input';
export { OTPInput } from './OTPInput';
export { Card } from './Card';
export { Badge } from './Badge';
export { BottomSheet } from './BottomSheet';
export { Modal } from './Modal';
export { ToastProvider, useToast } from './Toast';
export { EmptyState } from './EmptyState';
export { Skeleton, Spinner, FullScreenLoading } from './Skeleton';
export { FullScreenError, Banner } from './ErrorState';
export { TabBar } from './TabBar';
export { Header } from './Header';
export type { HeaderAction } from './Header';
export { ListItem } from './ListItem';
export { FormLayout, FormSection, SectionDivider } from './FormLayout';
export { QRDisplayCard } from './QRDisplayCard';
export { PaymentMethodPicker } from './PaymentMethodPicker';
export type { PaymentMethodId, PaymentMethodOption } from './PaymentMethodPicker';
export { QRScannerView } from './QRScannerView';
export { WebViewWrapper } from './WebViewWrapper';

// Composite / domain components
export { RaceCard } from './domain/RaceCard';
export { TicketCard } from './domain/TicketCard';
export { OrderCard } from './domain/OrderCard';
export { CourseCard } from './domain/CourseCard';
export { Stepper } from './domain/Stepper';
export { SegmentedTabs } from './domain/SegmentedTabs';
export { FilterChip } from './domain/FilterChip';

// Wave 2 — Rolling BIB + Checkout rev2 + Tickets rev2
export { GradientCard } from './domain/GradientCard';
export type { GradientCardProps, GradientVariant } from './domain/GradientCard';
export { RollingNumber } from './domain/RollingNumber';
export type { RollingNumberProps } from './domain/RollingNumber';
export { SlotMachine } from './domain/SlotMachine';
export type { SlotMachineProps } from './domain/SlotMachine';
export { BIBNumberCard } from './domain/BIBNumberCard';
export type { BIBNumberCardProps } from './domain/BIBNumberCard';
export { CountdownTimer } from './domain/CountdownTimer';
export type { CountdownTimerProps, CountdownVariant, CountdownFormat } from './domain/CountdownTimer';
export { VATToggleSection, MST_REGEX } from './domain/VATToggleSection';
export type { VATToggleSectionProps, VATFormFields } from './domain/VATToggleSection';
export { BuyGroupDiscountBadge } from './domain/BuyGroupDiscountBadge';
export type { BuyGroupDiscountBadgeProps } from './domain/BuyGroupDiscountBadge';
export { StatusActionButtons } from './domain/StatusActionButtons';
export type { StatusActionButtonsProps, StatusActionHandlers } from './domain/StatusActionButtons';
export { StatusBadge } from './domain/StatusBadge';
export type { StatusBadgeProps, RaceStatus, StatusBadgeSize } from './domain/StatusBadge';
