import { fileTypeFromBuffer } from "file-type";
import imageSize from "image-size";

export interface MediaMetadata {
  /** Detected MIME type from file content (magic bytes) */
  mimeType: string;
  /** File extension based on detected type */
  ext: string;
  /** Image/video width in pixels */
  width?: number;
  /** Image/video height in pixels */
  height?: number;
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

  // 2. Extract image dimensions using image-size
  if (mimeType.startsWith("image/")) {
    try {
      const dimensions = imageSize(buffer);
      result.width = dimensions.width;
      result.height = dimensions.height;
    } catch {
      // image-size might fail for some formats, that's ok
    }
  }

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
