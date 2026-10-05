import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { userRoleEnum } from "./enums";
import { primaryId, timestamps } from "./common";

/**
 * Usuarios (clientas, staff y super admins).
 *
 * Autenticación: email + contraseña propia (hash scrypt en `password_hash`) con
 * sesiones en la tabla `sessions`. `auth_provider_id` queda disponible por si
 * más adelante se agrega un proveedor externo para clientas.
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
    /** Hash de la contraseña (scrypt, con sal). NUNCA la contraseña. `null` = no puede iniciar sesión con contraseña. */
    passwordHash: text("password_hash"),
    /** Intentos fallidos consecutivos; al llegar al límite se bloquea temporalmente (ver `src/domain/auth.ts`). */
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
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
