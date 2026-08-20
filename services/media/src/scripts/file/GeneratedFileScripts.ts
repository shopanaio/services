import crypto from "node:crypto";
import { BaseScript } from "../../kernel/BaseScript.js";
import { buildPublicUrl, getBucketName, getS3Client } from "../../infrastructure/s3/index.js";
import type {
  DeleteOwnedFilesParams,
  DeleteOwnedFilesResult,
  UploadGeneratedFileParams,
  UploadGeneratedFileResult,
} from "./dto/index.js";

const MAX_GENERATED_FILE_BYTES = 16 * 1024 * 1024;

export class UploadGeneratedFileScript extends BaseScript<
  UploadGeneratedFileParams,
  UploadGeneratedFileResult
> {
  protected async execute(params: UploadGeneratedFileParams): Promise<UploadGeneratedFileResult> {
    if (params.owner.type !== "store") {
      return failure("Generated artifacts must belong to a store", "INVALID_OWNER");
    }
    if (!params.idempotencyKey.trim()) {
      return failure("Idempotency key is required", "INVALID_IDEMPOTENCY_KEY");
    }
    if (!params.mimeType.trim() || !params.filename.trim()) {
      return failure("Filename and MIME type are required", "INVALID_FILE_METADATA");
    }
    const content = decodeBase64(params.contentBase64);
    if (content.length === 0 || content.length > MAX_GENERATED_FILE_BYTES) {
      return failure(
        `Generated file must contain between 1 and ${MAX_GENERATED_FILE_BYTES} bytes`,
        "INVALID_FILE_SIZE",
      );
    }

    const assetGroup =
      (await this.repository.assetGroup.findByOwner("store", params.owner.id)) ??
      (await this.repository.assetGroup.create({
        ownerType: "store",
        ownerId: params.owner.id,
      }));
    const existing = await this.repository.file.findByIdempotencyKey(
      assetGroup.id,
      params.idempotencyKey,
    );
    if (existing) {
      await this.link(existing.id, params);
      return { fileId: existing.id, userErrors: [] };
    }

    const extension = extensionFor(params.filename, params.mimeType);
    const artifactKey = crypto
      .createHash("sha256")
      .update(`${assetGroup.id}:${params.idempotencyKey}`, "utf8")
      .digest("hex");
    const objectKey = `${params.owner.id}/generated/${artifactKey}.${extension}`;
    const bucketName = getBucketName();
    const bucket = await this.repository.bucket.getDefault(bucketName);
    const upload = await getS3Client().putObject(bucketName, objectKey, content, content.length, {
      "Content-Type": params.mimeType,
      "Content-Disposition": `attachment; filename="${safeFilename(params.filename)}"`,
    });
    const file = await this.repository.file.create(assetGroup.id, {
      provider: "S3",
      url: buildPublicUrl(objectKey),
      mimeType: params.mimeType,
      ext: extension,
      sizeBytes: content.length,
      originalName: safeFilename(params.filename),
      width: null,
      height: null,
      durationMs: null,
      altText: null,
      sourceUrl: null,
      idempotencyKey: params.idempotencyKey,
      isProcessed: true,
      mediaType: "GENERIC_FILE",
      meta: { generated: true, access: "PRIVATE" },
    });
    await this.repository.s3Object.create(assetGroup.id, {
      fileId: file.id,
      bucketId: bucket.id,
      objectKey,
      etag: upload.etag,
      storageClass: "STANDARD",
    });
    await this.repository.fileDeletionState.create(file.id);
    await this.link(file.id, params);
    return { fileId: file.id, userErrors: [] };
  }

  protected handleError(_error: unknown): UploadGeneratedFileResult {
    return failure("Failed to upload generated file", "INTERNAL_ERROR");
  }

  private async link(fileId: string, params: UploadGeneratedFileParams): Promise<void> {
    const linked = await this.repository.fileBackRef.link({
      fileId,
      service: params.entityRef.service,
      entityType: params.entityRef.entityType,
      entityId: params.entityRef.entityId,
      ownerType: params.owner.type,
      ownerId: params.owner.id,
      role: params.role,
    });
    if (linked.code !== "LINKED") {
      throw new Error(`Generated file back-reference failed: ${linked.code}`);
    }
  }
}

export class DeleteOwnedFilesScript extends BaseScript<
  DeleteOwnedFilesParams,
  DeleteOwnedFilesResult
> {
  protected async execute(params: DeleteOwnedFilesParams): Promise<DeleteOwnedFilesResult> {
    const acceptedIds: string[] = [];
    const errors: DeleteOwnedFilesResult["errors"] = [];
    for (const fileId of [...new Set(params.fileIds)]) {
      const file = await this.repository.file.findByOwner(
        fileId,
        params.owner.type,
        params.owner.id,
        true,
      );
      if (!file) {
        errors.push({ fileId, code: "FILE_NOT_FOUND" });
        continue;
      }
      await this.repository.file.softDelete(fileId);
      await this.repository.fileDeletionState.softDeleteIfEligible(fileId);
      acceptedIds.push(fileId);
      if (params.permanent) {
        await this.services.broker.runWorkflow("media.fileHardDelete", fileId, {
          source: "workflow",
          workflowId: `privacyFileDelete:${fileId}`,
          stepId: "startHardDelete",
        });
      }
    }
    return { acceptedIds, errors };
  }

  protected handleError(_error: unknown): DeleteOwnedFilesResult {
    return {
      acceptedIds: [],
      errors: [{ fileId: "", code: "INTERNAL_ERROR" }],
    };
  }
}

function decodeBase64(value: string): Buffer {
  const normalized = value.replace(/\s+/g, "");
  if (!normalized || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error("Generated file content is not valid base64");
  }
  return Buffer.from(normalized, "base64");
}

function extensionFor(filename: string, mimeType: string): string {
  const extension = filename.trim().split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{1,16}$/.test(extension)) return extension;
  return mimeType === "application/json" ? "json" : "bin";
}

function safeFilename(value: string): string {
  return (
    value
      .replace(/[\r\n"\\/]/g, "_")
      .trim()
      .slice(0, 255) || "artifact.bin"
  );
}

function failure(message: string, code: string): UploadGeneratedFileResult {
  return { fileId: null, userErrors: [{ field: [], message, code }] };
}
