/** One row of `GET /users/{id}/movements?storefrontId=` (backend `MovementResponse`). */
export type MovementResponse = {
  id: string;
  type: "redeem" | "earn" | "adjust" | "expire";
  points: number;
  imageUrl?: string;
  title: string;
  orgName?: string;
  storefrontName?: string;
  pointsLabel?: string;
  formattedCreatedAt: string;
  createdAt: string;
  expiresAt: string | null;
  expirationApplicable: boolean;
  correction: boolean;
  correctedTransactionId: string | null;
  correctedTransactionAmount: number | null;
};
