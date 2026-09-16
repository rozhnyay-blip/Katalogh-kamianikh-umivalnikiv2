import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  objectPath: text("object_path").notNull().unique(),
  ownerClerkId: text("owner_clerk_id").notNull(),
  declaredName: text("declared_name").notNull(),
  declaredSize: integer("declared_size").notNull(),
  declaredContentType: text("declared_content_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verifiedGeneration: text("verified_generation"),
  verifiedSize: integer("verified_size"),
  verifiedContentType: text("verified_content_type"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
});

export const insertUploadSchema = createInsertSchema(uploads).omit({
  id: true,
  createdAt: true,
  verifiedGeneration: true,
  verifiedSize: true,
  verifiedContentType: true,
  verifiedAt: true,
});

export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Upload = typeof uploads.$inferSelect;