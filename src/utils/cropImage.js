/**
 * Utility functions for image cropping operations
 */

/**
 * Creates an image element from a URL
 * @param {string} url - The image URL
 * @returns {Promise<HTMLImageElement>} Promise that resolves with the loaded image
 */
export function createImage(url) {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== "string") {
      reject(new Error("Invalid image URL provided"));
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous"; // Allow CORS

    img.onload = () => resolve(img);
    img.onerror = (err) =>
      reject(new Error(`Failed to load image: ${err.message}`));

    img.src = url;
  });
}

/**
 * Generates a cropped base64 image from a given image and crop area
 * @param {string} imageSrc - Source image URL
 * @param {Object} crop - Crop dimensions
 * @param {number} crop.x - X coordinate of crop start
 * @param {number} crop.y - Y coordinate of crop start
 * @param {number} crop.width - Width of crop area
 * @param {number} crop.height - Height of crop area
 * @param {string} [fileType='image/png'] - Output image type
 * @param {number} [quality=0.9] - Quality (0 to 1)
 * @returns {Promise<string>} Base64 Data URL of the cropped image
 */
export async function getCroppedImg(
  imageSrc,
  crop,
  fileType = "image/png",
  quality = 0.9
) {
  try {
    if (!crop || !crop.width || !crop.height) {
      throw new Error("Invalid crop dimensions provided");
    }

    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    // Preserve alpha channel by ensuring the 2D context supports transparency
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Could not get canvas context");

    canvas.width = Math.floor(crop.width);
    canvas.height = Math.floor(crop.height);

    // Clear canvas to ensure any alpha is preserved (avoid garbage pixels)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
      image,
      Math.floor(crop.x),
      Math.floor(crop.y),
      Math.floor(crop.width),
      Math.floor(crop.height),
      0,
      0,
      Math.floor(crop.width),
      Math.floor(crop.height)
    );

    // ✅ Return as base64 Data URL for compatibility on Vercel
    return canvas.toDataURL(fileType, quality);
  } catch (error) {
    console.error("Image cropping failed:", error);
    throw error;
  }
}
