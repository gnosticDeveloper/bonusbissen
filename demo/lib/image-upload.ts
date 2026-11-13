export const IMAGE_ACCEPT = ".webp,.jpg,.jpeg,.png";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/webp", "image/jpeg", "image/jpg", "image/png"]);

/** Same rules as the main app: WEBP, JPG, JPEG or PNG up to 2 MB. */
export function validateImageUpload(file: File): string | null {
  if (!/\.(webp|jpe?g|png)$/i.test(file.name) || !IMAGE_TYPES.has(file.type)) {
    return "Elegí una imagen WEBP, JPG, JPEG o PNG.";
  }
  if (!file.size || file.size > MAX_IMAGE_BYTES) {
    return "La imagen debe pesar como máximo 2 MB y no estar vacía.";
  }
  return null;
}

/**
 * Demo-only "upload": the image is scaled down and kept as a data URL in
 * sessionStorage, so it never leaves the browser and fits the storage quota.
 */
export async function fileToDataUrl(file: File, maxSide = 1200): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
