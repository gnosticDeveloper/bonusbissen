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
