import { boolean, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { userRoleEnum } from "./enums";
import { primaryId, timestamps } from "./common";

/**
 * Usuarios (clientas, staff y super admins).
 *
 * El proveedor de autenticación aún NO está decidido, por eso no hay columna
 * de contraseña: si se elige un esquema "email + contraseña" propio se agrega
 * en una migración; si se usa un proveedor externo, `auth_provider_id` guarda
 * el id de la persona en ese proveedor.
 */
export const users = pgTable(
  "users",
  {
    id: primaryId(),
    email: text("email").notNull(),
    name: text("name"),
    phone: text("phone"),
    role: userRoleEnum("role").notNull().default("CUSTOMER"),
    authProviderId: text("auth_provider_id"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    // El correo es único sin distinguir mayúsculas/minúsculas.
    uniqueIndex("users_email_lower_unique").on(sql`lower(${t.email})`),
    uniqueIndex("users_auth_provider_id_unique").on(t.authProviderId),
    index("users_role_idx").on(t.role),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
