/** Customer row from the staff search `GET /users`. */
export interface Customer {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  points: number | null;
  formattedCreatedAt: string;
}

/** Customer affiliated through a storefront, from `GET /storefronts/{id}/users`. */
export interface StorefrontCustomer {
  id: string;
  name: string;
  username: string;
  email: string | null;
  emailVerified: boolean;
  /** ISO timestamp of the affiliation. */
  joinedAt: string;
  /** Balance in the storefront's whole point program. */
  balance: number;
  /** Earned / redeemed at this storefront only. */
  totalEarned: number;
  totalRedeemed: number;
  /** ISO timestamp; `null` when the customer has no transactions at this storefront yet. */
  lastActivityAt: string | null;
}

/** Signed-in customer from `GET /users/me`. */
export type UserInfo = {
  id: string;
  name: string;
  username: string;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string | null;
};

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
