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

// Mirror of the backend's reward image rules (RewardService: MAX_DIMENSION_PX,
// MIN_ASPECT_RATIO, MAX_ASPECT_RATIO). The backend stays authoritative; this
// only lets the form reject the file while it is still open.
const REWARD_MAX_DIMENSION_PX = 4000;
const REWARD_MIN_ASPECT_RATIO = 1;
const REWARD_MAX_ASPECT_RATIO = 2;

export function validateRewardImageDimensions(width: number, height: number): string | null {
  if (width > REWARD_MAX_DIMENSION_PX || height > REWARD_MAX_DIMENSION_PX) {
    return `La imagen no puede superar los ${REWARD_MAX_DIMENSION_PX}px de ancho o alto.`;
  }
  const ratio = width / height;
  if (!(ratio >= REWARD_MIN_ASPECT_RATIO && ratio <= REWARD_MAX_ASPECT_RATIO)) {
    return "La imagen debe tener una relación de aspecto entre 1:1 y 2:1 (horizontal).";
  }
  return null;
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    // Raw pixel size, ignoring EXIF orientation, like the backend's ImageIO reader.
    bitmap = await createImageBitmap(file, { imageOrientation: "none" });
  } catch (error) {
    // Browsers that predate the "none" value reject the option itself.
    if (!(error instanceof TypeError)) throw error;
    bitmap = await createImageBitmap(file);
  }
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

/** Full client-side check for a reward image: type and size, then dimensions and aspect ratio. */
export async function validateRewardImage(file: File): Promise<string | null> {
  const basicError = validateImageUpload(file);
  if (basicError) return basicError;

  let dimensions: { width: number; height: number };
  try {
    dimensions = await readImageDimensions(file);
  } catch {
    return "No se pudo leer la imagen. Probá con otro archivo.";
  }
  return validateRewardImageDimensions(dimensions.width, dimensions.height);
}
