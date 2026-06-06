import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const strategiesTable = pgTable("strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ticker: text("ticker"),
  signalTag: text("signal_tag"),
  pineScript: text("pine_script"),
  alertMessageTemplate: text("alert_message_template"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Strategy = typeof strategiesTable.$inferSelect;
