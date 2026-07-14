export type Customer = {
  id: string;
  name: string;
  phone: string;
  points: number;
};

export interface Reward {
  id: string;
  title: string;
  description: string;
  imagePath?: string | null;
  costPoints: number;
  discountValue: number;
  active: boolean;
  createdAtFormatted: number;
}

export type ExchangeState = "pending" | "approved" | "cancelled";

export interface Exchange {
  id: string;
  customerName: string;
  employeeName?: string | null;
  rewardTitle: string;
  state: ExchangeState;
  points: number;
  createdAt: number;
}
