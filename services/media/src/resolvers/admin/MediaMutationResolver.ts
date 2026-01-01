import type { FileUpload } from "graphql-upload-minimal";
import { MediaType } from "./MediaType.js";
import { FileResolver } from "./FileResolver.js";
import { BucketResolver } from "./BucketResolver.js";
import { decodeGlobalId, encodeGlobalId } from "./utils/globalId.js";
import {
  bucketCreate,
  fileUploadMultipart,
  fileUploadFromUrl,
  fileCreateExternal,
  fileUpdate,
  fileDelete,
} from "../../scripts/index.js";

/**
 * MediaMutation namespace resolver.
 * Handles all media mutation operations.
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
    const services = this.ctx.kernel.getServices();

    const result = await bucketCreate(
      {
        bucketName: input.bucketName,
        region: input.region,
        status: input.status,
        priority: input.priority,
        endpointUrl: input.endpointUrl,
      },
      services
    );

    return {
      bucket: result.bucket
        ? new BucketResolver(result.bucket.id, this.ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Upload a file via multipart form data (main upload method)
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
    const services = this.ctx.kernel.getServices();

    const result = await fileUploadMultipart(
      {
        file: input.file,
        altText: input.altText,
        idempotencyKey: input.idempotencyKey,
      },
      services
    );

    return {
      file: result.file ? new FileResolver(result.file.id, this.ctx) : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Upload a file from URL
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
    const services = this.ctx.kernel.getServices();

    const result = await fileUploadFromUrl(
      {
        sourceUrl: input.sourceUrl,
        altText: input.altText,
        idempotencyKey: input.idempotencyKey,
      },
      services
    );

    return {
      file: result.file ? new FileResolver(result.file.id, this.ctx) : null,
      userErrors: result.userErrors,
    };
  }

  /**
   * Create an external media file (YouTube, Vimeo, etc.)
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
    const services = this.ctx.kernel.getServices();

    const result = await fileCreateExternal(
      {
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
      },
      services
    );

    return {
      file: result.file ? new FileResolver(result.file.id, this.ctx) : null,
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
    const decoded = decodeGlobalId(input.id);
    if (!decoded || decoded.type !== "File") {
      return {
        file: null,
        userErrors: [
          { message: "Invalid file ID", field: ["id"], code: "INVALID_ID" },
        ],
      };
    }

    const services = this.ctx.kernel.getServices();

    const result = await fileUpdate(
      {
        id: decoded.id,
        altText: input.altText,
        originalName: input.originalName,
        meta: input.meta,
      },
      services
    );

    console.log(result.file?.id, input.altText, "ALT TEX");

    return {
      file: result.file ? new FileResolver(result.file.id, this.ctx) : null,
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
    const decoded = decodeGlobalId(input.id);
    if (!decoded || decoded.type !== "File") {
      return {
        deletedFileId: null,
        userErrors: [
          { message: "Invalid file ID", field: ["id"], code: "INVALID_ID" },
        ],
      };
    }

    const services = this.ctx.kernel.getServices();

    const result = await fileDelete(
      {
        id: decoded.id,
        permanent: input.permanent,
      },
      services
    );

    return {
      deletedFileId: result.deletedFileId
        ? encodeGlobalId("File", result.deletedFileId)
        : null,
      userErrors: result.userErrors,
    };
  }
}
