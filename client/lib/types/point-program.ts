export interface StorefrontSummary {
  id: string;
  name: string;
}

export const POINT_EXPIRATION_MONTHS = [3, 6, 9, 12] as const;

/** `null` means the program's points never expire. */
export type PointExpirationMonths = (typeof POINT_EXPIRATION_MONTHS)[number] | null;

export interface PointProgram {
  id: string;
  name: string;
  unitLabel: string | null;
  active: boolean;
  expirationMonths: PointExpirationMonths;
  storefronts: StorefrontSummary[];
}

export interface PointProgramCreateRequest {
  name: string;
  unitLabel?: string;
  storefrontIds: string[];
}

export interface PointProgramUpdateRequest {
  name: string;
  unitLabel?: string;
  active?: boolean;
  expirationMonths: PointExpirationMonths;
}
