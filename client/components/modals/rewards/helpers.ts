import type { Reward } from "@/lib/types/reward";

export function appendRewardFields(
  formData: FormData,
  values: Pick<Reward, "title" | "description" | "costPoints" | "discountValue">,
  image?: File | null,
) {
  formData.set("title", values.title.trim());
  formData.set("description", values.description.trim());
  formData.set("costPoints", String(values.costPoints));
  formData.set("discountValue", String(values.discountValue));

  if (image && image.size > 0) {
    formData.set("image", image);
  }
}

export function isValidImage(file: File) {
  return file.type.startsWith("image/");
}
