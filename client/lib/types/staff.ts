import type { UserRole } from "./user";

export type StaffRole = UserRole.ADMIN | UserRole.CASHIER;

/** Staff membership from `GET /staff`. The list also returns deactivated memberships (`active: false`). */
export interface StaffMember {
  /** Membership id, used by the `/staff/{id}` endpoints. Not the user id. */
  id: string;
  userId: string;
  username: string;
  name: string;
  role: StaffRole;
  active: boolean;
  storefronts: { id: string; name: string }[];
  /** ISO timestamp of when the membership was created. */
  createdAt: string;
}
