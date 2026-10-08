import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { primaryId } from "./common";

/**
 * Invitaciones para unirse al equipo (rol STAFF).
 *
 * Solo una persona SUPER_ADMIN las crea. Como en las sesiones y los enlaces de correo, aquí solo
 * se guarda el HASH del token. Una invitación vence, se acepta una sola vez y se puede revocar.
 * El rol STAFF se asigna ÚNICAMENTE al aceptar una invitación válida (ver `services/users/invitations.ts`).
 */
export const staffInvitations = pgTable(
  "staff_invitations",
  {
    id: primaryId(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("staff_invitations_email_idx").on(t.email), index("staff_invitations_invited_by_idx").on(t.invitedBy, t.createdAt)],
);

export type StaffInvitation = typeof staffInvitations.$inferSelect;
