import { pgEnum } from "drizzle-orm/pg-core";
import { ORDER_STATUSES } from "@/domain/order-status";
import { PAYMENT_STATUSES } from "@/domain/payments";
import { PRODUCT_STATUSES } from "@/domain/catalog";
import { AUTH_TOKEN_PURPOSES } from "@/domain/auth-tokens";
import { CONSENT_TYPES } from "@/domain/consent";
import { SHIPPING_TYPES } from "@/domain/shipping";
import { TAX_ROUNDING_MODES, TAX_RULE_SCOPES, TAX_TREATMENTS } from "@/domain/tax";
import { USER_ROLES } from "@/domain/roles";

// Los valores viven en `src/domain` (una sola fuente de verdad); aquí solo se
// registran como enums de PostgreSQL.
export const userRoleEnum = pgEnum("user_role", USER_ROLES);
export const productStatusEnum = pgEnum("product_status", PRODUCT_STATUSES);
export const orderStatusEnum = pgEnum("order_status", ORDER_STATUSES);
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);
export const consentTypeEnum = pgEnum("consent_type", CONSENT_TYPES);

export const shippingTypeEnum = pgEnum("shipping_method_type", SHIPPING_TYPES);
export const taxRoundingEnum = pgEnum("tax_rounding", TAX_ROUNDING_MODES);
export const taxRuleScopeEnum = pgEnum("tax_rule_scope", TAX_RULE_SCOPES);
export const taxTreatmentEnum = pgEnum("tax_treatment", TAX_TREATMENTS);
export const authTokenPurposeEnum = pgEnum("auth_token_purpose", AUTH_TOKEN_PURPOSES);
