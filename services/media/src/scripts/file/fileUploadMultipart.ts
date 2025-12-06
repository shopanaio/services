import type { TransactionScript } from "../../kernel/types.js";
import { getContext } from "../../context/index.js";
import { config } from "../../config.js";
import { getS3Client, getBucketName, buildPublicUrl } from "../../infrastructure/s3/index.js";
import { analyzeMedia } from "../../infrastructure/media/index.js";
import crypto from "node:crypto";
import type { FileUpload } from "graphql-upload-minimal";

export interface FileUploadMultipartParams {
  readonly file: Promise<FileUpload>;
  readonly altText?: string;
  readonly idempotencyKey?: string;
}

export interface FileUploadMultipartResult {
  file?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

/**
 * Creates a file record by uploading a multipart file to S3.
 *
 * Logic:
 * 1. Check idempotency key (if exists - return existing file)
 * 2. Read file stream into buffer
 * 3. Upload to S3
 * 4. Create records in `files` + `s3Objects`
 * 5. Return the created File
 */
export const fileUploadMultipart: TransactionScript<
  FileUploadMultipartParams,
  FileUploadMultipartResult
> = async (params, services) => {
  const { logger, repository } = services;
  const ctx = getContext();
  const projectId = ctx.project.id;

  try {
    logger.info({ projectId }, "fileUploadMultipart: starting");

    // 1. Check idempotency key
    if (params.idempotencyKey) {
      const existingFile = await repository.file.findByIdempotencyKey(
        projectId,
        params.idempotencyKey
      );

      if (existingFile) {
        logger.info(
          { fileId: existingFile.id, idempotencyKey: params.idempotencyKey },
          "fileUploadMultipart: returning existing file by idempotency key"
        );
        return {
          file: { id: existingFile.id },
          userErrors: [],
        };
      }
    }

    // 2. Await the file upload promise and read stream
    const upload = await params.file;
    const { filename, mimetype, createReadStream } = upload;

    logger.info({ filename, mimetype }, "fileUploadMultipart: processing file");

    // Read file stream into buffer
    const stream = createReadStream();
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);
    const contentLength = buffer.length;

    if (contentLength === 0) {
      return {
        file: undefined,
        userErrors: [
          {
            message: "Empty file provided",
            field: ["file"],
            code: "EMPTY_FILE",
          },
        ],
      };
    }

    // 3. Analyze file to get real MIME type and metadata
    const metadata = await analyzeMedia(buffer, mimetype);

    logger.info(
      {
        detectedMime: metadata.mimeType,
        clientMime: mimetype,
        width: metadata.width,
        height: metadata.height,
        isAnimated: metadata.isAnimated,
      },
      "fileUploadMultipart: analyzed file"
    );

    // 4. Generate object key and upload to S3
    const objectKey = generateObjectKey(projectId, metadata.ext);
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Get or create bucket
    const bucket = await repository.bucket.getOrCreateDefault(projectId);

    // Initialize S3 client
    const s3Client = getS3Client();
    const bucketName = getBucketName();

    // Upload to S3
    const uploadResult = await s3Client.putObject(
      bucketName,
      objectKey,
      buffer,
      buffer.length,
      {
        "Content-Type": metadata.mimeType,
        "x-amz-meta-content-hash": contentHash,
        "x-amz-meta-original-name": encodeURIComponent(filename),
      }
    );

    logger.info(
      { objectKey, etag: uploadResult.etag, size: buffer.length },
      "fileUploadMultipart: uploaded to S3"
    );

    // 5. Build public URL
    const publicUrl = buildPublicUrl(objectKey);

    // 6. Create record in `files` table with detected metadata
    const file = await repository.file.create(projectId, {
      provider: "S3",
      url: publicUrl,
      mimeType: metadata.mimeType,
      ext: metadata.ext,
      sizeBytes: contentLength,
      originalName: filename ?? null,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      durationMs: metadata.durationMs ?? null,
      altText: params.altText ?? null,
      sourceUrl: null,
      idempotencyKey: params.idempotencyKey ?? null,
      isProcessed: true, // Mark as processed since we extracted metadata
    });

    // 7. Create record in `s3Objects` table
    await repository.s3Object.create(projectId, {
      fileId: file.id,
      bucketId: bucket.id,
      objectKey,
      contentHash,
      etag: uploadResult.etag,
      storageClass: "STANDARD",
    });

    logger.info({ fileId: file.id }, "fileUploadMultipart: completed successfully");

    return {
      file: { id: file.id },
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error }, "fileUploadMultipart failed");
    return {
      file: undefined,
      userErrors: [{ message: "Failed to upload file", code: "INTERNAL_ERROR" }],
    };
  }
};

/**
 * Generates a unique object key for S3 storage
 */
function generateObjectKey(projectId: string, ext: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  const prefix = config.storage.prefix ? `${config.storage.prefix}/` : "";
  return `${prefix}${projectId}/${timestamp}-${random}.${ext}`;
}
