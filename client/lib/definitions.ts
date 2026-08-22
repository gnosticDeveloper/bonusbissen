import { Coins } from "lucide-react";

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

export type AdminPage = "home" | "points" | "redemptions" | "rewards" | "customers" | "organization";
// TODO: remove hardcoded type here and create a specific type definitions file.
type Role = "ADMIN" | "CASHIER" | "CUSTOMER";

export interface NavItem {
  id: AdminPage;
  label: string;
  icon: typeof Coins;
  roles: Role[];
  url: string;
}
