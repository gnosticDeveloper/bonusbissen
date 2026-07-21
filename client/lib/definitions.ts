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
  createdAtFormatted: string;
}

export type ExchangeState = "pending" | "delivered" | "cancelled";

export interface Exchange {
  id: string;
  customerName: string;
  employeeName?: string;
  rewardTitle: string;
  state: ExchangeState;
  points: number;
  formattedCreatedAt: string;
}
