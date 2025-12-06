import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";

export interface MediaMetadata {
  /** Detected MIME type from file content (magic bytes) */
  mimeType: string;
  /** File extension based on detected type */
  ext: string;
  /** Image/video width in pixels */
  width?: number;
  /** Image/video height in pixels */
  height?: number;
  /** Duration in milliseconds (for video/audio) */
  durationMs?: number;
  /** Whether the file is animated (GIF, APNG, WebP) */
  isAnimated?: boolean;
  /** Color space (sRGB, Adobe RGB, etc) */
  colorSpace?: string;
  /** Has alpha channel */
  hasAlpha?: boolean;
}

// Extension mapping for common types that file-type might not detect
const FALLBACK_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "application/pdf": "pdf",
};

/**
 * Analyzes a file buffer and extracts metadata.
 * Uses magic bytes for reliable MIME detection and sharp for image metadata.
 */
export async function analyzeMedia(
  buffer: Buffer,
  fallbackMimeType?: string
): Promise<MediaMetadata> {
  // 1. Detect MIME type from magic bytes
  const fileType = await fileTypeFromBuffer(buffer);

  const mimeType = fileType?.mime ?? fallbackMimeType ?? "application/octet-stream";
  const ext = fileType?.ext ?? FALLBACK_EXT[mimeType] ?? "bin";

  const result: MediaMetadata = {
    mimeType,
    ext,
  };

  // 2. Extract image metadata using sharp
  if (mimeType.startsWith("image/")) {
    try {
      const metadata = await sharp(buffer).metadata();

      result.width = metadata.width;
      result.height = metadata.height;
      result.colorSpace = metadata.space;
      result.hasAlpha = metadata.hasAlpha;

      // Check for animated images
      if (metadata.pages && metadata.pages > 1) {
        result.isAnimated = true;

        // For animated GIFs/WebP, try to calculate duration
        if (metadata.delay && Array.isArray(metadata.delay)) {
          // delay is in ms per frame
          const totalDelay = metadata.delay.reduce((sum, d) => sum + (d || 100), 0);
          result.durationMs = totalDelay;
        }
      }
    } catch (error) {
      // Sharp might fail for some formats (SVG, etc.), that's ok
    }
  }

  // 3. For video/audio, we'd need ffprobe - leaving as TODO for now
  // Could use fluent-ffmpeg or ffprobe-static packages

  return result;
}

/**
 * Checks if a MIME type is an image
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

/**
 * Checks if a MIME type is a video
 */
export function isVideo(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

/**
 * Checks if a MIME type is audio
 */
export function isAudio(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}
