export interface Reward {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  imageThumbnailUrl?: string | null;
  costPoints: number;
  discountValue: number;
  active: boolean;
  createdAtFormatted: string;
}
