import type { TransactionScript } from "../../kernel/types.js";
import { getContext } from "../../context/index.js";
import { getPresignedPutUrl } from "../../infrastructure/s3/index.js";
import crypto from "node:crypto";
import { config } from "../../config.js";

export interface FileUploadPrepareParams {
  /** Original filename */
  readonly filename: string;
  /** MIME type */
  readonly mimeType?: string;
  /** File size in bytes (for validation) */
  readonly sizeBytes?: number;
}

export interface FileUploadPrepareResult {
  /** Presigned URL for uploading the file */
  uploadUrl?: string;
  /** Object key to use when confirming upload via fileUpload mutation */
  objectKey?: string;
  /** URL expiry time in seconds */
  expiresIn?: number;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

// Max file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
]);

/**
 * Prepares a presigned URL for direct file upload to S3.
 *
 * Flow:
 * 1. Client calls fileUploadPrepare with filename and optional metadata
 * 2. Server validates and returns presigned PUT URL + objectKey
 * 3. Client uploads file directly to S3 using presigned URL
 * 4. Client calls fileUpload with objectKey to register the file
 */
export const fileUploadPrepare: TransactionScript<
  FileUploadPrepareParams,
  FileUploadPrepareResult
> = async (params, services) => {
  const { logger } = services;
  const ctx = getContext();
  const projectId = ctx.project.id;

  try {
    logger.info({ params, projectId }, "fileUploadPrepare: starting");

    // Validate filename
    if (!params.filename || params.filename.trim().length === 0) {
      return {
        userErrors: [
          {
            message: "Filename is required",
            field: ["filename"],
            code: "REQUIRED",
          },
        ],
      };
    }

    // Validate file size if provided
    if (params.sizeBytes !== undefined && params.sizeBytes > MAX_FILE_SIZE) {
      return {
        userErrors: [
          {
            message: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
            field: ["sizeBytes"],
            code: "FILE_TOO_LARGE",
          },
        ],
      };
    }

    // Validate MIME type if provided
    if (params.mimeType && !ALLOWED_MIME_TYPES.has(params.mimeType)) {
      return {
        userErrors: [
          {
            message: `MIME type '${params.mimeType}' is not allowed`,
            field: ["mimeType"],
            code: "INVALID_MIME_TYPE",
          },
        ],
      };
    }

    // Generate unique object key
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString("hex");
    const sanitizedFilename = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const prefix = config.storage.prefix ? `${config.storage.prefix}/` : "";
    const objectKey = `${prefix}${projectId}/${timestamp}-${randomId}/${sanitizedFilename}`;

    // Generate presigned URL (1 hour expiry)
    const expiresIn = 3600;
    const uploadUrl = await getPresignedPutUrl(objectKey, expiresIn);

    logger.info(
      { objectKey, expiresIn },
      "fileUploadPrepare: presigned URL generated"
    );

    return {
      uploadUrl,
      objectKey,
      expiresIn,
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error, params }, "fileUploadPrepare failed");
    return {
      userErrors: [
        { message: "Failed to prepare upload", code: "INTERNAL_ERROR" },
      ],
    };
  }
};
