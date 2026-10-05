import { boolean, char, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { primaryId, timestamps } from "./common";

/** Libreta de direcciones de una clienta registrada. */
export const addresses = pgTable(
  "addresses",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label"),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone"),
    countryCode: char("country_code", { length: 2 }).notNull().default("CR"),
    stateProvince: text("state_province").notNull(),
    city: text("city").notNull(),
    district: text("district"),
    postalCode: text("postal_code"),
    line1: text("line_1").notNull(),
    line2: text("line_2"),
    deliveryNotes: text("delivery_notes"),
    isDefaultShipping: boolean("is_default_shipping").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("addresses_user_idx").on(t.userId),
    // A lo sumo una dirección de envío predeterminada por persona.
    uniqueIndex("addresses_one_default_per_user")
      .on(t.userId)
      .where(sql`${t.isDefaultShipping}`),
  ],
);

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
