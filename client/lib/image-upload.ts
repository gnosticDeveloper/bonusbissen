export const IMAGE_ACCEPT = ".webp,.jpg,.jpeg,.png";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/webp", "image/jpeg", "image/jpg", "image/png"]);

export function validateImageUpload(file: File): string | null {
  if (!/\.(webp|jpe?g|png)$/i.test(file.name) || !IMAGE_TYPES.has(file.type)) {
    return "Elegí una imagen WEBP, JPG, JPEG o PNG.";
  }
  if (!file.size || file.size > MAX_IMAGE_BYTES) {
    return "La imagen debe pesar como máximo 2 MB y no estar vacía.";
  }
  return null;
}
