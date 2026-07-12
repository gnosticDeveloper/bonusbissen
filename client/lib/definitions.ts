export interface Employee {
  name: string;
  role: string;
}

export interface Customer {
  phone: string;
  name: string;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  costPoints: number;
  discountValue: number;
  active: boolean;
  createdAt: number;
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

export interface PointsEntry {
  id: string;
  customerName: string;
  employeeName: string;
  points: number;
  createdAt: number;
}

export type Movement = Exchange | PointsEntry;

export const isExchange = (movement: Movement): movement is Exchange => {
  return "rewardId" in movement;
}
