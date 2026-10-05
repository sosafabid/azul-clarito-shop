import { relations } from "drizzle-orm";
import { addresses } from "./addresses";
import { auditLogs } from "./audit";
import { categories, collections, productImages, productVariants, products } from "./catalog";
import { inventory } from "./inventory";
import { orderItems, orders } from "./orders";
import { payments } from "./payments";
import { shippingMethods, shippingRates } from "./shipping";
import { users } from "./users";

// Relaciones para el "relational query builder" de Drizzle (db.query.*).
// Las llaves foráneas reales ya están en cada tabla; esto solo permite
// consultar con `with: {...}`.

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  auditLogs: many(auditLogs),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_parent",
  }),
  children: many(categories, { relationName: "category_parent" }),
  products: many(products),
}));

export const collectionsRelations = relations(collections, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  collection: one(collections, { fields: [products.collectionId], references: [collections.id] }),
  variants: many(productVariants),
  images: many(productImages),
  inventory: many(inventory),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  images: many(productImages),
  inventory: many(inventory),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [productImages.variantId], references: [productVariants.id] }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, { fields: [inventory.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [inventory.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  shippingMethod: one(shippingMethods, {
    fields: [orders.shippingMethodId],
    references: [shippingMethods.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const shippingMethodsRelations = relations(shippingMethods, ({ many }) => ({
  rates: many(shippingRates),
}));

export const shippingRatesRelations = relations(shippingRates, ({ one }) => ({
  method: one(shippingMethods, { fields: [shippingRates.methodId], references: [shippingMethods.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
}));
