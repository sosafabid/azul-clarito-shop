import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { consentTypeEnum } from "./enums";
import { users } from "./users";
import { primaryId } from "./common";

/**
 * Historial de consentimientos: una fila por cada aceptación o retiro.
 * `version` es la versión del texto legal que la persona vio (ver `src/config/legal.ts`).
 * Se borra junto con la cuenta (derecho de cancelación).
 */
export const userConsents = pgTable(
  "user_consents",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: consentTypeEnum("type").notNull(),
    version: text("version").notNull(),
    /** true = aceptó / autorizó · false = retiró el consentimiento. */
    granted: boolean("granted").notNull(),
    /** Dónde ocurrió: "registration" o "account". */
    source: text("source").notNull().default("registration"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_consents_user_type_idx").on(t.userId, t.type, t.createdAt)],
);

export type UserConsent = typeof userConsents.$inferSelect;
