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

// MIME types with no reliable magic-byte signature for file-type to sniff
// (glTF's JSON variant is plain text). The caller-declared type is only
// trusted for these, and only after an additional content check — never
// for types file-type normally *can* sniff, or a spoofed Content-Type on an
// unrecognized payload would sail straight through the upload allowlist.
const UNSNIFFABLE_TEXTUAL_MIME_TYPES = new Set(["model/gltf+json"]);

function isJsonBuffer(buffer: Buffer): boolean {
  try {
    JSON.parse(buffer.toString("utf8"));
    return true;
  } catch {
    return false;
  }
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
  "model/gltf+json": "gltf",
  "model/gltf-binary": "glb",
  "model/vnd.usdz+zip": "usdz",
};

/**
 * Analyzes a file buffer and extracts metadata.
 * Uses magic bytes for reliable MIME detection and sharp for image metadata.
 */
export async function analyzeMedia(
  buffer: Buffer,
  fallbackMimeType?: string,
): Promise<MediaMetadata> {
  // 1. Detect MIME type from magic bytes
  const fileType = await fileTypeFromBuffer(buffer);

  let mimeType: string;
  let sniffedExt = fileType?.ext;
  if (fileType) {
    // USDZ is a plain ZIP container with no magic bytes of its own beyond
    // the generic ZIP signature; only promote it to the declared USDZ type
    // once the container is confirmed to actually be a ZIP.
    if (fileType.mime === "application/zip" && fallbackMimeType === "model/vnd.usdz+zip") {
      mimeType = fallbackMimeType;
      sniffedExt = "usdz";
    } else {
      mimeType = fileType.mime;
    }
  } else if (
    fallbackMimeType &&
    UNSNIFFABLE_TEXTUAL_MIME_TYPES.has(fallbackMimeType) &&
    isJsonBuffer(buffer)
  ) {
    mimeType = fallbackMimeType;
  } else {
    // Sniffing failed for anything else — never trust a caller-declared
    // type here, or the upload MIME allowlist becomes trivially spoofable
    // by lying about Content-Type on an unrecognized payload.
    mimeType = "application/octet-stream";
  }
  const ext = sniffedExt ?? FALLBACK_EXT[mimeType] ?? "bin";

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
