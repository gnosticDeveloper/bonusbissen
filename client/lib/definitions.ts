import { Coins } from "lucide-react";
import { UserRole } from "./auth/session";

type AdminPage = "home" | "points" | "redemptions" | "rewards" | "customers" | "organization";

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

export type NearbyBusiness = {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
  logoUrl: string;
  pointLabel: string;
  points: number;
  rewards: Reward[];
  address: { street: string };
};
