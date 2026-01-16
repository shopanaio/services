import crypto from "node:crypto";
import { BaseScript } from "../../kernel/BaseScript.js";
import {
  getS3Client,
  getBucketName,
  buildPublicUrl,
} from "../../infrastructure/s3/index.js";
import { analyzeMedia } from "../../infrastructure/media/index.js";
import type {
  ProfileAvatarUploadParams,
  ProfileAvatarUploadResult,
} from "./dto/ProfileAvatarUploadDto.js";

/**
 * ProfileAvatarUploadScript - Upload avatar/logo for user profile or organization.
 *
 * This script:
 * 1. Looks up the asset group by ownerType + ownerId
 * 2. Creates the asset group if it doesn't exist
 * 3. Uploads the file to S3
 * 4. Saves the file record with the asset group reference
 */
export class ProfileAvatarUploadScript extends BaseScript<
  ProfileAvatarUploadParams,
  ProfileAvatarUploadResult
> {
  protected async execute(
    params: ProfileAvatarUploadParams
  ): Promise<ProfileAvatarUploadResult> {
    const { ownerType, ownerId } = params;
    const projectId = this.storeId;

    this.logger.info(
      { projectId, ownerType, ownerId },
      "ProfileAvatarUploadScript: starting"
    );

    // 1. Get or create asset group for the owner
    let assetGroup = await this.repository.assetGroup.findByOwner(
      ownerType,
      ownerId
    );

    if (!assetGroup) {
      this.logger.info(
        { ownerType, ownerId },
        "ProfileAvatarUploadScript: creating new asset group"
      );
      assetGroup = await this.repository.assetGroup.create({
        ownerType,
        ownerId,
      });
    }

    const assetGroupId = assetGroup.id;

    this.logger.info(
      { assetGroupId },
      "ProfileAvatarUploadScript: using asset group"
    );

    // 2. Await the file upload promise and read stream
    const upload = await params.file;
    const { filename, mimetype, createReadStream } = upload;

    this.logger.info(
      { filename, mimetype },
      "ProfileAvatarUploadScript: processing file"
    );

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

    // Validate that the file is an image
    if (!metadata.mimeType.startsWith("image/")) {
      return {
        file: null,
        userErrors: [
          {
            message: "Only image files are allowed for avatars and logos",
            field: ["file"],
            code: "INVALID_FILE_TYPE",
          },
        ],
      };
    }

    this.logger.info(
      {
        detectedMime: metadata.mimeType,
        clientMime: mimetype,
        width: metadata.width,
        height: metadata.height,
      },
      "ProfileAvatarUploadScript: analyzed file"
    );

    // 4. Generate object key and upload to S3
    const objectKey = this.generateObjectKey(ownerType, ownerId, metadata.ext);
    const contentHash = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

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
      "ProfileAvatarUploadScript: uploaded to S3"
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
      idempotencyKey: null,
      isProcessed: true,
      assetGroupId,
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

    this.logger.info(
      { fileId: file.id },
      "ProfileAvatarUploadScript: completed successfully"
    );

    return {
      file: { id: file.id },
      userErrors: [],
    };
  }

  private generateObjectKey(
    ownerType: string,
    ownerId: string,
    ext: string
  ): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString("hex");
    return `${ownerType}/${ownerId}/${timestamp}-${random}.${ext}`;
  }

  protected handleError(_error: unknown): ProfileAvatarUploadResult {
    return {
      file: null,
      userErrors: [
        { message: "Failed to upload file", code: "INTERNAL_ERROR" },
      ],
    };
  }
}
