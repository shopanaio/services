import type { TransactionScript } from "../../kernel/types.js";
import { getContext } from "../../context/index.js";
import { config } from "../../config.js";
import { getS3Client, getBucketName, buildPublicUrl } from "../../infrastructure/s3/index.js";
import { analyzeMedia } from "../../infrastructure/media/index.js";
import crypto from "node:crypto";
import path from "node:path";

export interface FileUploadFromUrlParams {
  readonly sourceUrl: string;
  readonly altText?: string;
  readonly idempotencyKey?: string;
}

export interface FileUploadFromUrlResult {
  file?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

/**
 * Creates a file record by downloading content from a URL and uploading to S3.
 *
 * Logic:
 * 1. Check idempotency key (if exists - return existing file)
 * 2. Check if file with same source URL exists (deduplication)
 * 3. Fetch file from URL (HEAD for metadata, then GET for content)
 * 4. Upload to S3
 * 5. Get image dimensions (for images) - TODO: implement image processing
 * 6. Create records in `files` + `s3Objects`
 * 7. Return the created File
 */
export const fileUploadFromUrl: TransactionScript<
  FileUploadFromUrlParams,
  FileUploadFromUrlResult
> = async (params, services) => {
  const { logger, repository } = services;
  const ctx = getContext();
  const projectId = ctx.project.id;

  try {
    logger.info({ params, projectId }, "fileUploadFromUrl: starting");

    // Validate URL format (skip for data URLs)
    if (!params.sourceUrl.startsWith("data:")) {
      try {
        new URL(params.sourceUrl);
      } catch {
        return {
          file: undefined,
          userErrors: [
            {
              message: "Invalid URL format",
              field: ["sourceUrl"],
              code: "INVALID_URL",
            },
          ],
        };
      }
    }

    // 1. Check idempotency key
    if (params.idempotencyKey) {
      const existingFile = await repository.file.findByIdempotencyKey(
        projectId,
        params.idempotencyKey
      );

      if (existingFile) {
        logger.info(
          { fileId: existingFile.id, idempotencyKey: params.idempotencyKey },
          "fileUploadFromUrl: returning existing file by idempotency key"
        );
        return {
          file: { id: existingFile.id },
          userErrors: [],
        };
      }
    }

    // Check if this is a data URL (base64 encoded)
    const isDataUrl = params.sourceUrl.startsWith("data:");

    // 2. Check for existing file by source URL (deduplication)
    // Skip for data URLs as they are unique uploads
    if (!isDataUrl) {
      const existingByUrl = await repository.file.findBySourceUrl(
        projectId,
        params.sourceUrl
      );

      if (existingByUrl) {
        logger.info(
          { fileId: existingByUrl.id, sourceUrl: params.sourceUrl },
          "fileUploadFromUrl: returning existing file by source URL"
        );
        return {
          file: { id: existingByUrl.id },
          userErrors: [],
        };
      }
    }

    // 3. Fetch file from URL
    const fetchResult = await fetchFileFromUrl(params.sourceUrl, logger);
    if (!fetchResult.success) {
      return {
        file: undefined,
        userErrors: [
          {
            message: fetchResult.error ?? "Failed to fetch file from URL",
            field: ["sourceUrl"],
            code: "FETCH_FAILED",
          },
        ],
      };
    }

    const { buffer, contentType, contentLength, originalName } = fetchResult;

    // 4. Analyze file to get real MIME type and metadata
    const metadata = await analyzeMedia(buffer, contentType);

    logger.info(
      {
        detectedMime: metadata.mimeType,
        fetchedMime: contentType,
        width: metadata.width,
        height: metadata.height,
        isAnimated: metadata.isAnimated,
      },
      "fileUploadFromUrl: analyzed file"
    );

    // 5. Generate object key and upload to S3
    const objectKey = generateObjectKey(projectId, metadata.ext);
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Initialize S3 client
    const s3Client = getS3Client();
    const bucketName = getBucketName();

    // Get bucket record
    const bucket = await repository.bucket.getDefault(bucketName);

    // Upload to S3
    const uploadResult = await s3Client.putObject(
      bucketName,
      objectKey,
      buffer,
      buffer.length,
      {
        "Content-Type": metadata.mimeType,
        "x-amz-meta-source-url": params.sourceUrl,
        "x-amz-meta-content-hash": contentHash,
      }
    );

    logger.info(
      { objectKey, etag: uploadResult.etag, size: buffer.length },
      "fileUploadFromUrl: uploaded to S3"
    );

    // 6. Build public URL
    const publicUrl = buildPublicUrl(objectKey);

    // 7. Create record in `files` table with detected metadata
    const file = await repository.file.create(projectId, {
      provider: "S3",
      url: publicUrl,
      mimeType: metadata.mimeType,
      ext: metadata.ext,
      sizeBytes: contentLength,
      originalName: originalName ?? null,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      durationMs: metadata.durationMs ?? null,
      altText: params.altText ?? null,
      // Don't store data URLs (too large), only regular URLs
      sourceUrl: isDataUrl ? null : params.sourceUrl,
      idempotencyKey: params.idempotencyKey ?? null,
      isProcessed: true, // Mark as processed since we extracted metadata
    });

    // 8. Create record in `s3Objects` table
    await repository.s3Object.create(projectId, {
      fileId: file.id,
      bucketId: bucket.id,
      objectKey,
      contentHash,
      etag: uploadResult.etag,
      storageClass: "STANDARD",
    });

    logger.info({ fileId: file.id }, "fileUploadFromUrl: completed successfully");

    return {
      file: { id: file.id },
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error, params }, "fileUploadFromUrl failed");
    return {
      file: undefined,
      userErrors: [{ message: "Failed to upload file from URL", code: "INTERNAL_ERROR" }],
    };
  }
};

interface FetchResult {
  success: true;
  buffer: Buffer;
  contentType: string;
  contentLength: number;
  originalName: string | null;
}

interface FetchError {
  success: false;
  error: string;
}

/**
 * Parses a data URL and returns its content
 */
function parseDataUrl(dataUrl: string): FetchResult | FetchError {
  // Format: data:[<mediatype>][;base64],<data>
  const match = dataUrl.match(/^data:([^;,]+)?(?:;base64)?,(.*)$/);
  if (!match) {
    return {
      success: false,
      error: "Invalid data URL format",
    };
  }

  const contentType = match[1] || "application/octet-stream";
  const base64Data = match[2];

  try {
    const buffer = Buffer.from(base64Data, "base64");
    return {
      success: true,
      buffer,
      contentType,
      contentLength: buffer.length,
      originalName: null,
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to decode base64 data",
    };
  }
}

/**
 * Fetches a file from URL and returns its content
 * Supports both HTTP(S) URLs and data URLs (base64)
 */
async function fetchFileFromUrl(
  url: string,
  logger: any
): Promise<FetchResult | FetchError> {
  // Handle data URLs
  if (url.startsWith("data:")) {
    logger.info("fetchFileFromUrl: processing data URL");
    return parseDataUrl(url);
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "ShopanaMediaService/1.0",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP error: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const contentDisposition = response.headers.get("content-disposition");

    // Extract filename from Content-Disposition header if present
    let originalName: string | null = null;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch) {
        originalName = filenameMatch[1].replace(/['"]/g, "");
      }
    }

    // If no filename from header, try to extract from URL path
    if (!originalName) {
      try {
        const urlPath = new URL(url).pathname;
        const pathFilename = path.basename(urlPath);
        if (pathFilename && pathFilename !== "/" && !pathFilename.startsWith("?")) {
          originalName = decodeURIComponent(pathFilename);
        }
      } catch {
        // Ignore URL parsing errors
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      success: true,
      buffer,
      contentType: contentType.split(";")[0].trim(), // Remove charset etc.
      contentLength: buffer.length,
      originalName,
    };
  } catch (error) {
    logger.error({ error, url }, "fetchFileFromUrl: fetch failed");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

/**
 * Generates a unique object key for S3 storage
 */
function generateObjectKey(projectId: string, ext: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  const prefix = config.storage.prefix ? `${config.storage.prefix}/` : "";
  return `${prefix}${projectId}/${timestamp}-${random}.${ext}`;
}
