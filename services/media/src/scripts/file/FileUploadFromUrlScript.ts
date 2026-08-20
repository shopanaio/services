import crypto from "node:crypto";
import path from "node:path";
import { Agent, fetch } from "undici";
import { BaseScript, ZodSchema, ValidationError, toUserErrors } from "../../kernel/BaseScript.js";
import { getS3Client, getBucketName, buildPublicUrl } from "../../infrastructure/s3/index.js";
import { analyzeMedia } from "../../infrastructure/media/index.js";
import { ALLOWED_UPLOAD_MIME_TYPES } from "../../infrastructure/media/allowedMimeTypes.js";
import { assertFetchAllowed, type FetchTarget } from "../../infrastructure/media/urlFetchPolicy.js";
import {
  fileUploadFromUrlSchema,
  type FileUploadFromUrlParams,
  type FileUploadFromUrlResult,
} from "./dto/FileUploadFromUrlDto.js";

const MAX_FETCH_BYTES = 50 * 1024 * 1024;

function pinnedDispatcher(pinnedIp: string, pinnedFamily: 4 | 6): Agent {
  return new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => {
        callback(null, [{ address: pinnedIp, family: pinnedFamily }]);
      },
    },
  });
}

async function readWithCap(body: ReadableStream<Uint8Array>, maxBytes: number): Promise<Buffer> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("max size exceeded");
        throw new Error("File exceeds the maximum allowed size");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    total,
  );
}

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

export class FileUploadFromUrlScript extends BaseScript<
  FileUploadFromUrlParams,
  FileUploadFromUrlResult
> {
  @ZodSchema(fileUploadFromUrlSchema)
  protected async execute(params: FileUploadFromUrlParams): Promise<FileUploadFromUrlResult> {
    // Resolve asset group ID from store context (ownerType = "store", ownerId = storeId)
    const assetGroup = await this.getOrCreateStoreAssetGroup();
    const assetGroupId = assetGroup.id;

    this.logger.info(
      { params, storeId: this.storeId, assetGroupId },
      "FileUploadFromUrlScript: starting",
    );

    // Validate URL format (skip for data URLs)
    if (!params.sourceUrl.startsWith("data:")) {
      try {
        new URL(params.sourceUrl);
      } catch {
        return {
          file: null,
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
      const existingFile = await this.repository.file.findByIdempotencyKey(
        assetGroupId,
        params.idempotencyKey,
      );

      if (existingFile) {
        this.logger.info(
          { fileId: existingFile.id, idempotencyKey: params.idempotencyKey },
          "FileUploadFromUrlScript: returning existing file by idempotency key",
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
      const existingByUrl = await this.repository.file.findBySourceUrl(
        assetGroupId,
        params.sourceUrl,
      );

      if (existingByUrl) {
        this.logger.info(
          { fileId: existingByUrl.id, sourceUrl: params.sourceUrl },
          "FileUploadFromUrlScript: returning existing file by source URL",
        );
        return {
          file: { id: existingByUrl.id },
          userErrors: [],
        };
      }
    }

    // 3. Fetch file from URL
    const fetchResult = await this.fetchFileFromUrl(params.sourceUrl);
    if (!fetchResult.success) {
      this.logger.warn(
        { error: fetchResult.error, sourceUrl: params.sourceUrl },
        "FileUploadFromUrlScript: fetch failed",
      );
      return {
        file: null,
        userErrors: [
          {
            message: "Failed to fetch file from URL",
            field: ["sourceUrl"],
            code: "FETCH_FAILED",
          },
        ],
      };
    }

    const { buffer, contentType, contentLength, originalName } = fetchResult;

    // 4. Analyze file to get real MIME type and metadata
    const metadata = await analyzeMedia(buffer, contentType);

    this.logger.info(
      {
        detectedMime: metadata.mimeType,
        fetchedMime: contentType,
        width: metadata.width,
        height: metadata.height,
      },
      "FileUploadFromUrlScript: analyzed file",
    );

    if (!ALLOWED_UPLOAD_MIME_TYPES.has(metadata.mimeType)) {
      return {
        file: null,
        userErrors: [
          {
            message: `Unsupported media type: ${metadata.mimeType}`,
            field: ["sourceUrl"],
            code: "UNSUPPORTED_MEDIA_TYPE",
          },
        ],
      };
    }

    // 5. Generate object key and upload to S3
    const objectKey = this.generateObjectKey(this.storeId, metadata.ext);

    // Initialize S3 client
    const s3Client = getS3Client();
    const bucketName = getBucketName();

    // Get bucket record
    const bucket = await this.repository.bucket.getDefault(bucketName);

    // Upload to S3
    const uploadResult = await s3Client.putObject(bucketName, objectKey, buffer, buffer.length, {
      "Content-Type": metadata.mimeType,
      "x-amz-meta-source-url": params.sourceUrl,
    });

    this.logger.info(
      { objectKey, etag: uploadResult.etag, size: buffer.length },
      "FileUploadFromUrlScript: uploaded to S3",
    );

    // 6. Build public URL
    const publicUrl = buildPublicUrl(objectKey);

    // 7. Create record in `files` table with detected metadata
    const file = await this.repository.file.create(assetGroupId, {
      provider: "S3",
      url: publicUrl,
      mimeType: metadata.mimeType,
      ext: metadata.ext,
      sizeBytes: contentLength,
      originalName: originalName ?? null,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      durationMs: null,
      altText: params.altText ?? null,
      // Don't store data URLs (too large), only regular URLs
      sourceUrl: isDataUrl ? null : params.sourceUrl,
      idempotencyKey: params.idempotencyKey ?? null,
      isProcessed: true,
    });

    // 8. Create record in `s3Objects` table
    await this.repository.s3Object.create(assetGroupId, {
      fileId: file.id,
      bucketId: bucket.id,
      objectKey,
      etag: uploadResult.etag,
      storageClass: "STANDARD",
    });

    // 9. Create deletion state record
    await this.repository.fileDeletionState.create(file.id);

    this.logger.info({ fileId: file.id }, "FileUploadFromUrlScript: completed successfully");

    return {
      file: { id: file.id },
      userErrors: [],
    };
  }

  private parseDataUrl(dataUrl: string): FetchResult | FetchError {
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
    } catch {
      return {
        success: false,
        error: "Failed to decode base64 data",
      };
    }
  }

  private async fetchFileFromUrl(url: string): Promise<FetchResult | FetchError> {
    // Handle data URLs
    if (url.startsWith("data:")) {
      this.logger.info("fetchFileFromUrl: processing data URL");
      return this.parseDataUrl(url);
    }

    let target: FetchTarget;
    try {
      target = await assertFetchAllowed(url);
    } catch (error) {
      this.logger.warn({ error, url }, "fetchFileFromUrl: URL not allowed");
      return {
        success: false,
        error: error instanceof Error ? error.message : "URL not allowed",
      };
    }

    const dispatcher = pinnedDispatcher(target.pinnedIp, target.pinnedFamily);
    try {
      const response = await fetch(target.url, {
        method: "GET",
        redirect: "manual", // do not silently follow to an unvalidated host
        dispatcher,
        headers: {
          "User-Agent": "ShopanaMediaService/1.0",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        return {
          success: false,
          error: "Redirects are not followed for security reasons",
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP error: ${response.status} ${response.statusText}`,
        };
      }

      const contentType = response.headers.get("content-type") ?? "application/octet-stream";
      const contentDisposition = response.headers.get("content-disposition");
      const contentLengthHeader = Number(response.headers.get("content-length") ?? "0");
      if (contentLengthHeader > MAX_FETCH_BYTES) {
        return {
          success: false,
          error: "File exceeds the maximum allowed size",
        };
      }

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

      if (!response.body) {
        return { success: false, error: "Empty response body" };
      }
      const buffer = await readWithCap(response.body, MAX_FETCH_BYTES);

      return {
        success: true,
        buffer,
        contentType: contentType.split(";")[0].trim(),
        contentLength: buffer.length,
        originalName,
      };
    } catch (error) {
      this.logger.error({ error, url }, "fetchFileFromUrl: fetch failed");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown fetch error",
      };
    } finally {
      await dispatcher.close();
    }
  }

  private generateObjectKey(storeId: string, ext: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    return `${storeId}/${timestamp}-${random}.${ext}`;
  }

  protected handleError(error: unknown): FileUploadFromUrlResult {
    if (error instanceof ValidationError) {
      return { file: null, userErrors: toUserErrors(error) };
    }
    return {
      file: null,
      userErrors: [{ message: "Failed to upload file from URL", code: "INTERNAL_ERROR" }],
    };
  }
}
