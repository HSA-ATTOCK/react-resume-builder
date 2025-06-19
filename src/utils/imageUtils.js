/**
 * Image Utility Functions
 *
 * Provides helper functions for working with images in the browser
 */

/**
 * Creates and loads an image from a URL with CORS support
 * @param {string} url - The image URL to load
 * @param {boolean} [revokeBlob=true] - Whether to revoke blob URLs after loading
 * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded image
 * @throws {Error} If the URL is invalid or image fails to load
 */
export function createImage(url, revokeBlob = true) {
  return new Promise((resolve, reject) => {
    // Validate input
    if (!url || typeof url !== "string") {
      reject(new Error("Invalid image URL provided"));
      return;
    }

    const image = new Image();
    const isBlobUrl = url.startsWith("blob:");

    // Cleanup function for blob URLs
    const cleanup = () => {
      if (isBlobUrl && revokeBlob) {
        URL.revokeObjectURL(url);
      }
    };

    // Success handler
    const handleLoad = () => {
      cleanup();
      resolve(image);
    };

    // Error handler
    const handleError = (error) => {
      cleanup();
      reject(new Error(`Failed to load image from URL: ${error.message}`));
    };

    // Set up event listeners
    image.addEventListener("load", handleLoad, { once: true });
    image.addEventListener("error", handleError, { once: true });

    // Configure CORS (must be set before src)
    image.crossOrigin = "anonymous";

    // Start loading
    image.src = url;

    // Handle cases where the image might be already loaded (cached)
    if (image.complete) {
      handleLoad();
    }
  });
}

/**
 * Helper function to check if an image URL is valid
 * @param {string} url - The URL to check
 * @returns {boolean} True if the URL appears to be a valid image URL
 */
export function isValidImageUrl(url) {
  if (!url || typeof url !== "string") return false;

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return false;
  }

  // Common image extensions
  const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  return imageExtensions.some((ext) => url.toLowerCase().includes(ext));
}

/**
 * Preloads an image and returns dimensions
 * @param {string} url - The image URL
 * @returns {Promise<{width: number, height: number}>} The image dimensions
 */
export async function getImageDimensions(url) {
  const img = await createImage(url);
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

/**
 * Creates a thumbnail from an image URL
 * @param {string} url - Source image URL
 * @param {number} maxSize - Maximum width/height of thumbnail
 * @returns {Promise<string>} Data URL of the thumbnail
 */
export async function createThumbnail(url, maxSize = 150) {
  const img = await createImage(url);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Calculate thumbnail dimensions while maintaining aspect ratio
  const ratio = Math.min(maxSize / img.width, maxSize / img.height);
  canvas.width = img.width * ratio;
  canvas.height = img.height * ratio;

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}
