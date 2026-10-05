import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { primaryId } from "./common";

/**
 * Sesiones de inicio de sesión.
 *
 * La cookie del navegador contiene un token aleatorio; aquí solo se guarda su
 * HASH (sha256). Si alguien viera esta tabla, no podría usar las sesiones.
 * El rol NUNCA se guarda en la sesión: se lee de `users` en cada petición, así
 * que quitarle un permiso a alguien o desactivarla surte efecto de inmediato.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export type Session = typeof sessions.$inferSelect;
