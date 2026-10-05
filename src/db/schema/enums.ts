import { pgEnum } from "drizzle-orm/pg-core";
import { ORDER_STATUSES } from "@/domain/order-status";
import { PAYMENT_STATUSES } from "@/domain/payments";
import { PRODUCT_STATUSES } from "@/domain/catalog";
import { USER_ROLES } from "@/domain/roles";

// Los valores viven en `src/domain` (una sola fuente de verdad); aquí solo se
// registran como enums de PostgreSQL.
export const userRoleEnum = pgEnum("user_role", USER_ROLES);
export const productStatusEnum = pgEnum("product_status", PRODUCT_STATUSES);
export const orderStatusEnum = pgEnum("order_status", ORDER_STATUSES);
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);
