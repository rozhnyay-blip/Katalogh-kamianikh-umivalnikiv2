import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id").notNull(),
    eventName: text("event_name").notNull(),
    productId: integer("product_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("analytics_events_created_at_idx").on(table.createdAt),
    index("analytics_events_session_created_idx").on(
      table.sessionId,
      table.createdAt,
    ),
  ],
);

export const insertAnalyticsEventSchema = createInsertSchema(
  analyticsEvents,
).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;