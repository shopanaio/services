import type { FileUpload } from "graphql-upload-minimal";
import { MediaType } from "./MediaType.js";
import { FileResolver } from "./FileResolver.js";
import { BucketResolver } from "./BucketResolver.js";
import {
  BucketCreateScript,
  FileUploadMultipartScript,
  FileUploadFromUrlScript,
  FileCreateExternalScript,
  FileUpdateScript,
  FileDeleteScript,
} from "../../scripts/index.js";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";

/**
 * MediaMutation namespace resolver.
 * Handles all media mutation operations.
 * Store context is determined from x-store-name header.
 */
export class MediaMutationResolver extends MediaType<Record<string, never>> {
  /**
   * Create a bucket
   */
  async bucketCreate({
    input,
  }: {
    input: {
      bucketName: string;
      region?: string;
      status?: string;
      priority?: number;
      endpointUrl?: string;
    };
  }) {
    const { kernel } = this.$ctx;

    const result = await kernel.runScript(BucketCreateScript, {
      bucketName: input.bucketName,
      region: input.region,
      status: input.status,
      priority: input.priority,
      endpointUrl: input.endpointUrl,
    });

    return {
      bucket: result.bucket
        ? new BucketResolver(result.bucket.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Upload a file via multipart form data (main upload method).
   * Uses store.id from context as ownerId.
   */
  async fileUpload({
    input,
  }: {
    input: {
      file: Promise<FileUpload>;
      altText?: string;
      idempotencyKey?: string;
    };
  }) {
    const { kernel } = this.$ctx;

    const result = await kernel.runScript(FileUploadMultipartScript, {
      file: input.file,
      altText: input.altText,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      file: result.file ? new FileResolver(result.file.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Upload a file from URL.
   * Uses store.id from context as ownerId.
   */
  async fileUploadFromUrl({
    input,
  }: {
    input: {
      sourceUrl: string;
      altText?: string;
      idempotencyKey?: string;
    };
  }) {
    const { kernel } = this.$ctx;

    const result = await kernel.runScript(FileUploadFromUrlScript, {
      sourceUrl: input.sourceUrl,
      altText: input.altText,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      file: result.file ? new FileResolver(result.file.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Create an external media file (YouTube, Vimeo, etc.).
   * Uses store.id from context as ownerId.
   */
  async fileCreateExternal({
    input,
  }: {
    input: {
      provider: string;
      externalId: string;
      url: string;
      thumbnailUrl?: string;
      originalName?: string;
      width?: number;
      height?: number;
      durationMs?: number;
      altText?: string;
      providerMeta?: Record<string, unknown>;
      idempotencyKey?: string;
    };
  }) {
    const { kernel } = this.$ctx;

    const result = await kernel.runScript(FileCreateExternalScript, {
      provider: input.provider,
      externalId: input.externalId,
      url: input.url,
      thumbnailUrl: input.thumbnailUrl,
      originalName: input.originalName,
      width: input.width,
      height: input.height,
      durationMs: input.durationMs,
      altText: input.altText,
      providerMeta: input.providerMeta,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      file: result.file ? new FileResolver(result.file.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Update a file's metadata
   */
  async fileUpdate({
    input,
  }: {
    input: {
      id: string;
      altText?: string;
      originalName?: string;
      meta?: Record<string, unknown>;
    };
  }) {
    const fileId = decodeGlobalIdByType(input.id, GlobalIdEntity.File);
    if (!fileId) {
      return {
        file: null,
        userErrors: [
          { message: "Invalid file ID", field: ["id"], code: "INVALID_ID" },
        ],
      };
    }

    const { kernel } = this.$ctx;

    const result = await kernel.runScript(FileUpdateScript, {
      id: fileId,
      altText: input.altText,
      originalName: input.originalName,
      meta: input.meta,
    });

    return {
      file: result.file ? new FileResolver(result.file.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Delete a file (soft or hard delete)
   */
  async fileDelete({
    input,
  }: {
    input: {
      id: string;
      permanent?: boolean;
    };
  }) {
    const fileId = decodeGlobalIdByType(input.id, GlobalIdEntity.File);
    if (!fileId) {
      return {
        deletedFileId: null,
        userErrors: [
          { message: "Invalid file ID", field: ["id"], code: "INVALID_ID" },
        ],
      };
    }

    const { kernel } = this.$ctx;

    const result = await kernel.runScript(FileDeleteScript, {
      id: fileId,
      permanent: input.permanent,
    });

    return {
      deletedFileId: result.deletedFileId
        ? encodeGlobalIdByType(result.deletedFileId, GlobalIdEntity.File)
        : null,
      userErrors: result.userErrors,
    };
  }
}
