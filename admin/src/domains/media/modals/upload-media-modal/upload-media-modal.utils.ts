/**
 * Utility functions for parsing media URLs
 */

export interface ParsedMediaUrl {
  url: string;
  name: string;
  type: "image" | "video" | "youtube";
  thumbnailUrl?: string;
  videoId?: string;
}

/**
 * Regular expressions for YouTube URL patterns
 */
const YOUTUBE_PATTERNS = [
  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([a-zA-Z0-9_-]{11})/,
  // Short URL: youtu.be/VIDEO_ID
  /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  // Embed URL: youtube.com/embed/VIDEO_ID
  /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  // Shorts URL: youtube.com/shorts/VIDEO_ID
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  // Mobile URL: m.youtube.com/watch?v=VIDEO_ID
  /m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
];

/**
 * Image file extensions
 */
const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
  ".avif",
];

/**
 * Video file extensions
 */
const VIDEO_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".ogg",
  ".mov",
  ".avi",
  ".mkv",
  ".m4v",
];

/**
 * Check if a URL is a YouTube video URL
 */
export function isYouTubeUrl(url: string): boolean {
  return YOUTUBE_PATTERNS.some((pattern) => pattern.test(url));
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Get YouTube thumbnail URL from video ID
 * Available qualities: default, mqdefault, hqdefault, sddefault, maxresdefault
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: "default" | "mq" | "hq" | "sd" | "maxres" = "hq"
): string {
  const qualityMap = {
    default: "default",
    mq: "mqdefault",
    hq: "hqdefault",
    sd: "sddefault",
    maxres: "maxresdefault",
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Get YouTube embed URL from video ID
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Check if a URL points to an image based on extension
 */
export function isImageUrl(url: string): boolean {
  const lowercaseUrl = url.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lowercaseUrl.includes(ext));
}

/**
 * Check if a URL points to a video based on extension
 */
export function isVideoUrl(url: string): boolean {
  const lowercaseUrl = url.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lowercaseUrl.includes(ext));
}

/**
 * Extract filename from URL
 */
export function extractFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop() || "";
    // Remove query params from filename
    return filename.split("?")[0] || "media";
  } catch {
    // If URL parsing fails, try simple extraction
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];
    return lastPart?.split("?")[0] || "media";
  }
}

/**
 * Validate if a URL is accessible (for images)
 * Returns true if the URL loads successfully
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
}

/**
 * Parse a media URL and return structured information
 */
export async function parseMediaUrl(
  url: string
): Promise<ParsedMediaUrl | null> {
  // Trim and validate URL format
  const trimmedUrl = url.trim();

  try {
    new URL(trimmedUrl);
  } catch {
    return null;
  }

  // Check if it's a YouTube URL
  if (isYouTubeUrl(trimmedUrl)) {
    const videoId = extractYouTubeId(trimmedUrl);
    if (!videoId) return null;

    return {
      url: getYouTubeEmbedUrl(videoId),
      name: `YouTube Video (${videoId})`,
      type: "youtube",
      thumbnailUrl: getYouTubeThumbnail(videoId, "hq"),
      videoId,
    };
  }

  // Check if it's a direct video URL
  if (isVideoUrl(trimmedUrl)) {
    return {
      url: trimmedUrl,
      name: extractFilename(trimmedUrl),
      type: "video",
    };
  }

  // Check if it's an image URL (by extension or by trying to load it)
  if (isImageUrl(trimmedUrl)) {
    return {
      url: trimmedUrl,
      name: extractFilename(trimmedUrl),
      type: "image",
    };
  }

  // Try to validate as image (might be a URL without extension)
  const isValidImage = await validateImageUrl(trimmedUrl);
  if (isValidImage) {
    return {
      url: trimmedUrl,
      name: extractFilename(trimmedUrl) || "image",
      type: "image",
    };
  }

  return null;
}

/**
 * Generate a unique ID for media items
 */
export function generateMediaId(): string {
  return `media-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
