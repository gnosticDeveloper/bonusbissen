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
