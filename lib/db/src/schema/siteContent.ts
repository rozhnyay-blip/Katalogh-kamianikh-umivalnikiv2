import { jsonb, pgTable, serial, timestamp } from "drizzle-orm/pg-core";

export const siteContent = pgTable("site_content", {
  id: serial("id").primaryKey(),
  content: jsonb("content").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SiteContentRow = typeof siteContent.$inferSelect;