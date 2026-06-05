import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const guideAssets = pgTable("guide_assets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  objectPath: text("object_path").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size"),
  assetType: text("asset_type").notNull().default("file"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow(),
});
