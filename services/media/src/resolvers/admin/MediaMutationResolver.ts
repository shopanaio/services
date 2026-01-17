import type { FileUpload } from "graphql-upload-minimal";
import { MediaType } from "./MediaType.js";
import { FileResolver, FileAnyResolver } from "./FileResolver.js";
import { BucketResolver } from "./BucketResolver.js";
import {
  BucketCreateScript,
  FileUploadMultipartScript,
  FileUploadFromUrlScript,
  FileCreateExternalScript,
  FileUpdateScript,
  FileDeleteScript,
  FileDeleteManyScript,
  FileRestoreScript,
  FileClearErrorScript,
  ProfileAvatarUploadScript,
} from "../../scripts/index.js";
import type { AssetOwnerType } from "../../repositories/models/index.js";
import {
  decodeGlobalId,
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

  async fileDeleteMany({
    input,
  }: {
    input: {
      ids: string[];
      permanent?: boolean;
    };
  }) {
    const decodedIds: string[] = [];
    const invalidIds: string[] = [];

    for (const id of input.ids) {
      const fileId = decodeGlobalIdByType(id, GlobalIdEntity.File);
      if (!fileId) {
        invalidIds.push(id);
        continue;
      }
      decodedIds.push(fileId);
    }

    const { kernel } = this.$ctx;
    const result = await kernel.runScript(FileDeleteManyScript, {
      ids: decodedIds,
      permanent: input.permanent ?? false,
    });

    const userErrors = [
      ...invalidIds.map(() => ({
        field: ["ids"],
        code: "INVALID_ID",
        message: this.getErrorMessage("INVALID_ID"),
      })),
      ...result.errors.map((error) => ({
        field: ["ids"],
        code: error.code,
        message: this.getErrorMessage(error.code),
      })),
    ];

    return {
      acceptedIds: result.acceptedIds.map((id) =>
        encodeGlobalIdByType(id, GlobalIdEntity.File)
      ),
      startedHardDeleteIds: result.startedHardDeleteIds.map((id) =>
        encodeGlobalIdByType(id, GlobalIdEntity.File)
      ),
      userErrors,
    };
  }

  async fileRestore({
    input,
  }: {
    input: {
      id: string;
    };
  }) {
    const fileId = decodeGlobalIdByType(input.id, GlobalIdEntity.File);
    if (!fileId) {
      return {
        file: null,
        userErrors: [
          {
            field: ["id"],
            code: "INVALID_ID",
            message: this.getErrorMessage("INVALID_ID"),
          },
        ],
      };
    }

    const { kernel } = this.$ctx;
    const result = await kernel.runScript(FileRestoreScript, { id: fileId });

    if (result.error) {
      return {
        file: null,
        userErrors: [
          {
            field: ["id"],
            code: result.error,
            message: this.getErrorMessage(result.error),
          },
        ],
      };
    }

    return {
      file: result.file ? new FileResolver(result.file.id, this.$ctx) : null,
      userErrors: [],
    };
  }

  async fileClearError({
    input,
  }: {
    input: {
      id: string;
    };
  }) {
    const fileId = decodeGlobalIdByType(input.id, GlobalIdEntity.File);
    if (!fileId) {
      return {
        file: null,
        userErrors: [
          {
            field: ["id"],
            code: "INVALID_ID",
            message: this.getErrorMessage("INVALID_ID"),
          },
        ],
      };
    }

    const { kernel } = this.$ctx;
    const result = await kernel.runScript(FileClearErrorScript, { id: fileId });

    if (result.error) {
      return {
        file: null,
        userErrors: [
          {
            field: ["id"],
            code: result.error,
            message: this.getErrorMessage(result.error),
          },
        ],
      };
    }

    return {
      file: result.file ? new FileAnyResolver(result.file.id, this.$ctx) : null,
      userErrors: [],
    };
  }

  /**
   * Upload avatar or logo for an entity (user profile or organization).
   * The file is stored in the entity's asset group.
   */
  async avatarUpload({
    input,
  }: {
    input: {
      ownerId: string;
      file: Promise<FileUpload>;
    };
  }) {
    const { kernel } = this.$ctx;

    // Decode ownerId and determine ownerType from global ID
    let ownerId: string;
    let ownerType: AssetOwnerType;

    try {
      const decoded = decodeGlobalId(input.ownerId);
      ownerId = decoded.id;

      // Map GlobalIdEntity type to AssetOwnerType
      if (decoded.typeName === GlobalIdEntity.User) {
        ownerType = "user_profile";
      } else if (decoded.typeName === GlobalIdEntity.Organization) {
        ownerType = "organization";
      } else if (decoded.typeName === GlobalIdEntity.Store) {
        ownerType = "store";
      } else {
        return {
          file: null,
          userErrors: [
            {
              message: `Invalid owner type: ${decoded.typeName}. Expected User, Organization, or Store.`,
              field: ["ownerId"],
              code: "INVALID_OWNER_TYPE",
            },
          ],
        };
      }
    } catch {
      return {
        file: null,
        userErrors: [
          {
            message: "Invalid ownerId format",
            field: ["ownerId"],
            code: "INVALID_ID",
          },
        ],
      };
    }

    const result = await kernel.runScript(ProfileAvatarUploadScript, {
      file: input.file,
      ownerType,
      ownerId,
    });

    return {
      file: result.file ? new FileResolver(result.file.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  private getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      FILE_NOT_FOUND: "File not found",
      FILE_BEING_DELETED: "File is currently being deleted",
      INVALID_STATE: "Invalid file state for this operation",
      INVALID_ID: "Invalid file ID",
      INTERNAL_ERROR: "Internal error",
    };
    return messages[code] ?? "Unknown error";
  }
}
