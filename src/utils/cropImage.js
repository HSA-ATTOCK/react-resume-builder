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

    // Handle cross-origin images
    img.crossOrigin = "anonymous";

    // Add cleanup function to revoke object URL if needed
    let shouldRevoke = url.startsWith("blob:");

    img.onload = () => {
      if (shouldRevoke) {
        URL.revokeObjectURL(url);
      }
      resolve(img);
    };

    img.onerror = (err) => {
      if (shouldRevoke) {
        URL.revokeObjectURL(url);
      }
      reject(new Error(`Failed to load image: ${err.message}`));
    };

    img.src = url;
  });
}

/**
 * Generates a cropped version of the source image
 * @param {string} imageSrc - Source image URL
 * @param {Object} crop - Crop dimensions and position
 * @param {number} crop.x - X coordinate of crop start
 * @param {number} crop.y - Y coordinate of crop start
 * @param {number} crop.width - Width of crop area
 * @param {number} crop.height - Height of crop area
 * @param {string} [fileType='image/jpeg'] - Output image type
 * @param {number} [quality=0.9] - Image quality (0-1)
 * @returns {Promise<string>} Promise that resolves with the cropped image URL
 */
export async function getCroppedImg(
  imageSrc,
  crop,
  fileType = "image/jpeg",
  quality = 0.9
) {
  try {
    if (!crop || !crop.width || !crop.height) {
      throw new Error("Invalid crop dimensions provided");
    }

    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    // Set canvas dimensions to match crop area
    canvas.width = Math.floor(crop.width);
    canvas.height = Math.floor(crop.height);

    // Draw the cropped image
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

    // Return as blob URL
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }

          // Safari has memory limits with blob URLs
          // So we'll use a different approach if needed
          const croppedImageUrl = URL.createObjectURL(blob);
          resolve(croppedImageUrl);
        },
        fileType,
        quality
      );
    });
  } catch (error) {
    console.error("Image cropping failed:", error);
    throw error; // Re-throw for error handling in calling code
  }
}

/**
 * Cleanup function to revoke object URLs
 * @param {string} url - The object URL to revoke
 */
export function revokeObjectUrl(url) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
