import { pgTable, serial, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { signalsTable } from "./signals";

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  buySignalId: integer("buy_signal_id").references(() => signalsTable.id),
  sellSignalId: integer("sell_signal_id").references(() => signalsTable.id),
  buyPrice: numeric("buy_price"),
  sellPrice: numeric("sell_price"),
  quantity: numeric("quantity").notNull(),
  status: text("status").notNull().default("open"),
  profitLoss: numeric("profit_loss"),
  profitLossPct: numeric("profit_loss_pct"),
  actualBuyPrice: numeric("actual_buy_price"),
  actualSellPrice: numeric("actual_sell_price"),
  actualProfitLoss: numeric("actual_profit_loss"),
  actualProfitLossPct: numeric("actual_profit_loss_pct"),
  openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

export type Trade = typeof tradesTable.$inferSelect;
