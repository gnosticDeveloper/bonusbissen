export type FormState = {
  message: string | null;
  status: "success" | "error" | null;
};

export type PointActionType = "add" | "subtract" | "edit" | "remove";

export type PointAction = {
  id: string;
  userId: string;
  userName: string;
  type: PointActionType;
  /** Net points delta applied to the customer by this action. */
  amount: number;
  /** Optional human context (e.g. amount spent, correction note). */
  note: string;
  byUserId: string;
  byUserName: string;
  createdAt: string;
};

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
  totalUsers: number;
  totalPointsAwarded: number;
};

export interface PendingExchangeReview {
  id: string;
  customerName: string;
  rewardTitle: string;
  points: number;
  createdAtFormatted: string;
};
