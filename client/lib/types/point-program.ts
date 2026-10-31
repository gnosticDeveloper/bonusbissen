export interface StorefrontSummary {
  id: string;
  name: string;
}

export type PointExpirationMonths = 3 | 6 | 9 | 12 | null;

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
