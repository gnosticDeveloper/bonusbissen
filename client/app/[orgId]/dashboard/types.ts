export type PagedResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type FormState = {
  message: string | null;
  status: "success" | "error" | null;
};

export type PointActionType = "add" | "subtract" | "edit" | "remove";

export type PointAction = {
  id: string;
  customerId: string;
  customerName: string;
  type: PointActionType;
  /** Net points delta applied to the customer by this action. */
  amount: number;
  /** Optional human context (e.g. amount spent, correction note). */
  note: string;
  byUserId: string;
  byUserName: string;
  createdAt: string;
};

export type CustomerPointsAward = {
  customerName: string;
  pointsGranted: number;
};

export interface Organization {
  name: string;
  iconUrl?: string;
  hours?: string;
  address?: string;
  description?: string;
}

export type LoginState = {
  error: string | null;
};

export interface TopClient {
  id: string;
  name: string;
  totalPoints: number;
}

export interface TopReward {
  id: string;
  title: string;
  claimCount: number;
  points: number;
}

export interface HomeStats {
  totalExchanges: number;
  pendingExchanges: number;
  totalCustomers: number;
  totalPointsAwarded: number;
};

export interface PendingExchangeReview {
  id: string;
  customerName: string;
  rewardTitle: string;
  points: number;
  createdAtFormatted: string;
};
