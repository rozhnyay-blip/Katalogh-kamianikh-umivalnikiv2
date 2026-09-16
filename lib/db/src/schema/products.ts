import { createInsertSchema } from "drizzle-zod";
import { boolean, pgTable, serial, text } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subtitle: text("subtitle").notNull(),
  price: text("price").notNull(),
  kind: text("kind").notNull(),
  images: text("images").array().notNull(),
  available: boolean("available").notNull().default(true),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;