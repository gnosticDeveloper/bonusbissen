import { Coins } from "lucide-react";
import { Reward } from "@/lib/types/reward";

type AdminPage = "home" | "points" | "redemptions" | "rewards" | "customers" | "organization";

export enum UserRole {
  ADMIN = "ADMIN",
  CASHIER = "CASHIER",
  USER = "USER",
}

export type AdminUserInfo = {
  username: string;
  name: string;
  role: UserRole;
};

export interface NavItem {
  id: AdminPage;
  label: string;
  icon: typeof Coins;
  roles: UserRole[];
  url: string;
}

export type SignInUser = { name: string; avatarUrl: string | null };

export type Membership = {
  id: string;
  org: { id: string; name: string; category: string; color: string; logoUrl: string | null };
  points: number;
  pointLabel: string;
  totalRedemptions: number;
  memberSince: string;
};

export type PointsResponse = {
  summary: { totalPoints: number };
  memberships: Membership[];
};

export type Business = {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  logoUrl: string;
  pointLabel: string;
  points: number;
  rewards: Reward[];
  address: { street: string; city: string, province: string };
};

export type Location = {
  id: string;
  name: string;
};

export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type SearchOptions = {
  search: string;
  page: number;
  size: number;
};

export type PagedRequestFunction<T> = (options: SearchOptions) => Promise<PagedResponse<T>>;
