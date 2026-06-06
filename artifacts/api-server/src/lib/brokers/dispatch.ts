import { placeOrderForSignal } from "../public-com";
import { placeRobinhoodOrder } from "./robinhood";
import { placeWebullOrder } from "./webull";
import { getSettings } from "../public-com";
import type { BrokerOrderOpts } from "./types";

/**
 * Dispatches an order to every configured broker in parallel.
 * Returns the first fill price received from any broker (or null).
 */
export async function dispatchToBrokers(opts: {
  signalId: number;
  ticker: string;
  action: string;
  price: number | null;
  quantity: number | null;
}): Promise<{ fillPrice: string | null }> {
  const settings = await getSettings();

  if (!settings?.autoExecute) {
    return { fillPrice: null };
  }

  const brokerOpts: BrokerOrderOpts = {
    signalId: opts.signalId,
    ticker: opts.ticker,
    action: opts.action,
    price: opts.price,
    quantity: opts.quantity ?? Number(settings.defaultQuantity ?? "1"),
    orderType: settings.orderType ?? "MARKET",
    instrumentType: settings.instrumentType ?? "EQUITY",
    timeInForce: settings.timeInForce ?? "DAY",
  };

  const tasks: Promise<{ fillPrice: string | null }>[] = [];

  // Public.com
  if (settings.publicApiToken && settings.publicAccountId) {
    tasks.push(
      placeOrderForSignal(opts.signalId, {
        ticker: opts.ticker,
        action: opts.action,
        price: opts.price,
        quantity: opts.quantity,
      })
    );
  }

  // Robinhood
  if (settings.robinhoodBearerToken) {
    tasks.push(
      placeRobinhoodOrder(brokerOpts, settings.robinhoodBearerToken)
        .then((r) => ({ fillPrice: r.fillPrice }))
    );
  }

  // Webull
  if (settings.webullAppKey && settings.webullAppSecret) {
    tasks.push(
      placeWebullOrder(brokerOpts, settings.webullAppKey, settings.webullAppSecret, settings.webullAccountId ?? null)
        .then((r) => ({ fillPrice: r.fillPrice }))
    );
  }

  if (tasks.length === 0) {
    return { fillPrice: null };
  }

  const results = await Promise.allSettled(tasks);

  // Return the first successful fill price
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.fillPrice != null) {
      return { fillPrice: r.value.fillPrice };
    }
  }
  return { fillPrice: null };
}
