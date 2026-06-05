import { pgTable, serial, integer, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { signalsTable } from "./signals";

export const executionsTable = pgTable("executions", {
  id: serial("id").primaryKey(),
  signalId: integer("signal_id").notNull().references(() => signalsTable.id),
  status: text("status").notNull(), // pending | submitted | filled | failed | skipped
  publicOrderId: text("public_order_id"),
  orderType: text("order_type"),
  side: text("side"),
  quantity: text("quantity"),
  limitPrice: text("limit_price"),
  errorMessage: text("error_message"),
  responseRaw: jsonb("response_raw"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Execution = typeof executionsTable.$inferSelect;
