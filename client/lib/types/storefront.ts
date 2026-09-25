export interface Storefront {
  id: string;
  name: string;
  online: boolean;
  address: string | null;
  city: string | null;
  province: string | null;
  category: string | null;
  color: string | null;
  hours: string | null;
  iconUrl: string | null;
  description: string | null;
  active: boolean;
}

export interface StorefrontPayload {
  name: string;
  online: boolean;
  address?: string;
  city?: string;
  province?: string;
  category?: string;
  color?: string;
  hours?: string;
  description?: string;
  active?: boolean;
}

export interface StorefrontDiscoverInfo {
  id: string;
  name: string;
  orgName: string;
  color: string;
  iconUrl: string | null;
  pointLabel: string | null;
}
