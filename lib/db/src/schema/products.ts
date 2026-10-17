import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { boolean, check, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subtitle: text("subtitle").notNull(),
  price: text("price").notNull(),
  kind: text("kind").notNull(),
  images: text("images").array().notNull(),
  available: boolean("available").notNull().default(true),
  availabilityMode: text("availability_mode").notNull().default("made_to_order"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
}, (table) => [
  check(
    "products_stock_availability_consistent",
    sql`(${table.availabilityMode} = 'in_stock' AND ${table.stockQuantity} >= 1) OR (${table.availabilityMode} = 'made_to_order' AND ${table.stockQuantity} = 0)`,
  ),
]);

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;