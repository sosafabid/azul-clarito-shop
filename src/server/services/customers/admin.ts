import "server-only";
import { count, desc, inArray } from "drizzle-orm";
import type { Database } from "@/db/client";
import { users } from "@/db/schema";
import type { UserRole } from "@/domain/roles";

/**
 * Listado de cuentas para el PANEL (solo lectura).
 *
 * Selecciona columnas EXPLÍCITAS: nunca `password_hash`, intentos de ingreso, tokens de
 * verificación ni de restablecimiento. El estado de verificación es solo la fecha
 * `email_verified_at` (o su ausencia).
 */
export type AdminAccountRow = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  createdAt: Date;
};

const LIMIT = 200;

const columns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  emailVerifiedAt: users.emailVerifiedAt,
  createdAt: users.createdAt,
};

export async function listAccountsForAdmin(db: Database, scope: "customers" | "team"): Promise<{ rows: AdminAccountRow[]; total: number }> {
  const roles: UserRole[] = scope === "customers" ? ["CUSTOMER"] : ["SUPER_ADMIN", "STAFF"];
  const [rows, [totals]] = await Promise.all([
    db.select(columns).from(users).where(inArray(users.role, roles)).orderBy(desc(users.createdAt)).limit(LIMIT),
    db.select({ n: count() }).from(users).where(inArray(users.role, roles)),
  ]);
  return { rows, total: totals?.n ?? rows.length };
}

