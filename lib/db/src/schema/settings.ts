import { pgTable, serial, text, boolean, timestamp, numeric } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  publicApiToken: text("public_api_token"),
  publicAccountId: text("public_account_id"),
  orderType: text("order_type").notNull().default("MARKET"),
  instrumentType: text("instrument_type").notNull().default("EQUITY"),
  defaultQuantity: text("default_quantity").notNull().default("1"),
  timeInForce: text("time_in_force").notNull().default("DAY"),
  autoExecute: boolean("auto_execute").notNull().default(true),
  buyFraction: numeric("buy_fraction").notNull().default("1"),
  neverSellAtLoss: boolean("never_sell_at_loss").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Settings = typeof settingsTable.$inferSelect;
