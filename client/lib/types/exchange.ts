export enum ExchangeState {
  PENDING = "pending",
  COMPLETED = "delivered",
  CANCELLED = "cancelled",
}

export interface HistoricalExchangeBase {
  id: string;
  rewardTitle: string;
  rewardDescription: string;
  rewardImagePath: string;
  discountValue: number;
  costPoints: number;
  pointsUnitLabel: string;
  formattedCreatedAt: string;
  organizationId: string;
  organizationName: string;
  storefrontName: string;
}

export interface PendingExchange extends HistoricalExchangeBase {
  state: ExchangeState.PENDING;
  exchangeCode: string; // required here
}

export interface CompletedExchange extends HistoricalExchangeBase {
  state: ExchangeState.COMPLETED | ExchangeState.CANCELLED;
  exchangeCode?: never; // forbidden here
}

export type HistoricalExchangeResponse = PendingExchange | CompletedExchange;
