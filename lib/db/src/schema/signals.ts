import { pgTable, serial, text, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signalsTable = pgTable("signals", {
  id: serial("id").primaryKey(),
  ticker: text("ticker").notNull(),
  action: text("action").notNull(),
  price: numeric("price"),
  open: numeric("open"),
  high: numeric("high"),
  low: numeric("low"),
  volume: numeric("volume"),
  quantity: numeric("quantity"),
  strategy: text("strategy"),
  message: text("message"),
  exchange: text("exchange"),
  interval: text("interval"),
  currency: text("currency"),
  basecurrency: text("basecurrency"),
  alertTime: text("alert_time"),
  timenow: text("timenow"),
  positionSize: numeric("position_size"),
  orderPrice: numeric("order_price"),
  orderId: text("order_id"),
  orderComment: text("order_comment"),
  raw: jsonb("raw").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSignalSchema = createInsertSchema(signalsTable).omit({ id: true, receivedAt: true });
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Signal = typeof signalsTable.$inferSelect;
