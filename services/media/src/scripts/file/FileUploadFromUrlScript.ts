import crypto from "node:crypto";
import path from "node:path";
import { BaseScript } from "../../kernel/BaseScript.js";
import { getS3Client, getBucketName, buildPublicUrl } from "../../infrastructure/s3/index.js";
import { analyzeMedia } from "../../infrastructure/media/index.js";
import type {
  FileUploadFromUrlParams,
  FileUploadFromUrlResult,
} from "./dto/FileUploadFromUrlDto.js";

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
  protected async execute(params: FileUploadFromUrlParams): Promise<FileUploadFromUrlResult> {
    // Resolve asset group ID from store context (ownerType = "store", ownerId = storeId)
    const assetGroup = await this.repository.assetGroup.findByOwner(
      "store",
      this.storeId
    );
    const assetGroupId = assetGroup?.id ?? null;

    this.logger.info({ params, storeId: this.storeId, assetGroupId }, "FileUploadFromUrlScript: starting");

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
    if (params.idempotencyKey && assetGroupId) {
      const existingFile = await this.repository.file.findByIdempotencyKey(
        assetGroupId,
        params.idempotencyKey
      );

      if (existingFile) {
        this.logger.info(
          { fileId: existingFile.id, idempotencyKey: params.idempotencyKey },
          "FileUploadFromUrlScript: returning existing file by idempotency key"
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
    if (!isDataUrl && assetGroupId) {
      const existingByUrl = await this.repository.file.findBySourceUrl(
        assetGroupId,
        params.sourceUrl
      );

      if (existingByUrl) {
        this.logger.info(
          { fileId: existingByUrl.id, sourceUrl: params.sourceUrl },
          "FileUploadFromUrlScript: returning existing file by source URL"
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
      return {
        file: null,
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

    this.logger.info(
      {
        detectedMime: metadata.mimeType,
        fetchedMime: contentType,
        width: metadata.width,
        height: metadata.height,
      },
      "FileUploadFromUrlScript: analyzed file"
    );

    // 5. Generate object key and upload to S3
    const objectKey = this.generateObjectKey(this.storeId, metadata.ext);
    const contentHash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Initialize S3 client
    const s3Client = getS3Client();
    const bucketName = getBucketName();

    // Get bucket record
    const bucket = await this.repository.bucket.getDefault(bucketName);

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

    this.logger.info(
      { objectKey, etag: uploadResult.etag, size: buffer.length },
      "FileUploadFromUrlScript: uploaded to S3"
    );

    // 6. Build public URL
    const publicUrl = buildPublicUrl(objectKey);

    // 7. Create record in `files` table with detected metadata
    const file = await this.repository.file.create(assetGroupId!, {
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
    await this.repository.s3Object.create(assetGroupId!, {
      fileId: file.id,
      bucketId: bucket.id,
      objectKey,
      contentHash,
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
    }
  }

  private generateObjectKey(storeId: string, ext: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    return `${storeId}/${timestamp}-${random}.${ext}`;
  }

  protected handleError(_error: unknown): FileUploadFromUrlResult {
    return {
      file: null,
      userErrors: [{ message: "Failed to upload file from URL", code: "INTERNAL_ERROR" }],
    };
  }
}
