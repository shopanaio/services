import crypto from "node:crypto";
import { BaseScript } from "../../kernel/BaseScript.js";
import { getS3Client, getBucketName, buildPublicUrl } from "../../infrastructure/s3/index.js";
import { analyzeMedia } from "../../infrastructure/media/index.js";
import type {
  FileUploadMultipartParams,
  FileUploadMultipartResult,
} from "./dto/FileUploadMultipartDto.js";

export class FileUploadMultipartScript extends BaseScript<
  FileUploadMultipartParams,
  FileUploadMultipartResult
> {
  protected async execute(params: FileUploadMultipartParams): Promise<FileUploadMultipartResult> {
    const projectId = this.storeId;

    this.logger.info({ projectId }, "FileUploadMultipartScript: starting");

    // 1. Check idempotency key
    if (params.idempotencyKey) {
      const existingFile = await this.repository.file.findByIdempotencyKey(
        projectId,
        params.idempotencyKey
      );

      if (existingFile) {
        this.logger.info(
          { fileId: existingFile.id, idempotencyKey: params.idempotencyKey },
          "FileUploadMultipartScript: returning existing file by idempotency key"
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

    this.logger.info({ filename, mimetype }, "FileUploadMultipartScript: processing file");

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
        file: null,
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

    this.logger.info(
      {
        detectedMime: metadata.mimeType,
        clientMime: mimetype,
        width: metadata.width,
        height: metadata.height,
      },
      "FileUploadMultipartScript: analyzed file"
    );

    // 4. Generate object key and upload to S3
    const objectKey = this.generateObjectKey(projectId, metadata.ext);
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
        "x-amz-meta-content-hash": contentHash,
        "x-amz-meta-original-name": encodeURIComponent(filename),
      }
    );

    this.logger.info(
      { objectKey, etag: uploadResult.etag, size: buffer.length },
      "FileUploadMultipartScript: uploaded to S3"
    );

    // 5. Build public URL
    const publicUrl = buildPublicUrl(objectKey);

    // 6. Create record in `files` table with detected metadata
    const file = await this.repository.file.create(projectId, {
      provider: "S3",
      url: publicUrl,
      mimeType: metadata.mimeType,
      ext: metadata.ext,
      sizeBytes: contentLength,
      originalName: filename ?? null,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      durationMs: null,
      altText: params.altText ?? null,
      sourceUrl: null,
      idempotencyKey: params.idempotencyKey ?? null,
      isProcessed: true,
    });

    // 7. Create record in `s3Objects` table
    await this.repository.s3Object.create(projectId, {
      fileId: file.id,
      bucketId: bucket.id,
      objectKey,
      contentHash,
      etag: uploadResult.etag,
      storageClass: "STANDARD",
    });

    this.logger.info({ fileId: file.id }, "FileUploadMultipartScript: completed successfully");

    return {
      file: { id: file.id },
      userErrors: [],
    };
  }

  private generateObjectKey(projectId: string, ext: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    return `${projectId}/${timestamp}-${random}.${ext}`;
  }

  protected handleError(_error: unknown): FileUploadMultipartResult {
    return {
      file: null,
      userErrors: [{ message: "Failed to upload file", code: "INTERNAL_ERROR" }],
    };
  }
}
