export interface Reward {
  id: string;
  title: string;
  description: string;
  imagePath?: string | null;
  costPoints: number;
  discountValue: number;
  active: boolean;
  createdAtFormatted: string;
}
