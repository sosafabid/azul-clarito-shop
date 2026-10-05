export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
