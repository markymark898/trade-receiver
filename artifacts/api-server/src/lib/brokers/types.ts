export interface BrokerOrderOpts {
  signalId: number;
  ticker: string;
  action: string;
  price: number | null;
  quantity: number;
  orderType: string;
  instrumentType: string;
  timeInForce: string;
}

export interface BrokerOrderResult {
  broker: string;
  fillPrice: string | null;
  orderId: string | null;
}
