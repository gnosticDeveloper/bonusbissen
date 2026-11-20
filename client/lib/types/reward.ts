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
  /** Set only on create/update responses when the reward was saved but its image was not. */
  imageError?: string | null;
}
