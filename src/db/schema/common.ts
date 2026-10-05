import { bigint, timestamp, uuid } from "drizzle-orm/pg-core";

/** Clave primaria UUID generada por la base de datos. */
export const primaryId = () => uuid("id").primaryKey().defaultRandom();

/** created_at / updated_at para casi todas las tablas. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Dinero: ENTERO en la unidad mínima de la moneda (ver `src/domain/money.ts`).
 * `bigint` para no tener límite de 2.147 millones; `mode: "number"` devuelve
 * un `number` normal de JavaScript.
 */
export const money = (name: string) => bigint(name, { mode: "number" });
