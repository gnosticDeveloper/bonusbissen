import { Reward } from "@/lib/types/reward";

export type Business = {
  id: string;
  name: string;
  orgName: string;
  category: string;
  description: string;
  color: string;
  logoUrl: string | null;
  orgLogoUrl: string | null;
  orgBannerUrl: string | null;
  pointLabel: string;
  points: number;
  rewards: Reward[];
  address: { street: string; city: string; province: string };
};

export type Location = {
  id: string;
  name: string;
};
