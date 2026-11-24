export type FormState = {
  message: string | null;
  status: "success" | "error" | null;
};

export type PointActionType = "add" | "subtract" | "edit";

export type PointAction = {
  id: string;
  userId: string;
  userName: string;
  type: PointActionType;
  /** Net points delta applied to the customer by this action. */
  amount: number;
  /** Corrected total for original grants; correction rows use their signed delta. */
  effectiveAmount: number;
  /** Optional human context (e.g. amount spent, correction note). */
  note: string;
  byUserId: string;
  byUserName: string;
  createdAt: string;
  expiresAt: string | null;
  expirationApplicable: boolean;
  correctedTransaction: {
    id: string;
    amount: number;
    note: string | null;
    createdAt: string;
    expiresAt: string | null;
    expirationApplicable: boolean;
  } | null;
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

/**
 * `GET /users/home-stats`: figures of the selected storefront's point program for the last
 * `periodDays` days, each with the same figure for the `periodDays` days before (`previous*`).
 * `pendingExchanges` is the program's open queue now, at any age. `programId`/`programName` are
 * `null` (and every figure 0) when the storefront has no program.
 */
export interface HomeStats {
  programId: string | null;
  programName: string | null;
  periodDays: number;
  exchanges: number;
  previousExchanges: number;
  activeCustomers: number;
  previousActiveCustomers: number;
  pointsGranted: number;
  previousPointsGranted: number;
  pendingExchanges: number;
}

/** Pending redemption in the staff review queue (backend `PendingExchangeReviewResponse`). */
export interface PendingExchangeReview {
  id: string;
  userName: string;
  rewardTitle: string;
  /** Negative: the points the redemption took. */
  points: number;
  /** ISO instant the customer claimed it. */
  createdAt: string;
}

/** `GET /exchanges/pending-queue`: the oldest `items`, and how many are pending in all. */
export interface PendingExchangeQueue {
  total: number;
  items: PendingExchangeReview[];
}

/** `GET /rewards/unclaimed`: an active reward with no claims in the dashboard window. */
export interface UnclaimedReward {
  id: string;
  title: string;
  points: number;
}
