import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authTokenPurposeEnum } from "./enums";
import { users } from "./users";
import { primaryId } from "./common";

/**
 * Enlaces de un solo uso que se envían por correo: verificar el correo y
 * restablecer la contraseña.
 *
 * Igual que las sesiones, aquí solo se guarda el HASH (sha256) del token: quien
 * viera esta tabla no podría usar ningún enlace. `used_at` se llena de forma
 * atómica al usarlo (un enlace no se puede reutilizar) y `expires_at` lo vence.
 */
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: authTokenPurposeEnum("purpose").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_tokens_user_purpose_idx").on(t.userId, t.purpose), index("auth_tokens_expires_idx").on(t.expiresAt)],
);

/**
 * Contador de intentos para limitar la frecuencia (anti-abuso) de las acciones
 * públicas: "olvidé mi contraseña", reenvío de verificación, uso de enlaces.
 * `key_hash` es un HMAC del correo/IP: no se guardan correos ni IPs en claro.
 */
export const authThrottle = pgTable(
  "auth_throttle",
  {
    id: primaryId(),
    bucket: text("bucket").notNull(),
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_throttle_lookup_idx").on(t.bucket, t.keyHash, t.createdAt)],
);

export type AuthToken = typeof authTokens.$inferSelect;
