export interface StorefrontSummary {
  id: string;
  name: string;
}

export interface PointProgram {
  id: string;
  name: string;
  unitLabel: string | null;
  active: boolean;
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
}
