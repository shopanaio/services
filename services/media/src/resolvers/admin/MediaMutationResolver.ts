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
  FileRestoreManyScript,
  FileClearErrorScript,
  ProfileAvatarUploadScript,
  CdnConfigurationCreateScript,
  CdnConfigurationUpdateScript,
  CdnConfigurationDeleteScript,
  CdnConfigurationSetDefaultScript,
  CdnConfigurationTestScript,
  CdnRoutingRuleCreateScript,
  CdnRoutingRuleUpdateScript,
  CdnRoutingRuleDeleteScript,
  MediaSourceCreateScript,
  MediaSourceUpdateScript,
  MediaSourceDeleteScript,
} from "../../scripts/index.js";
import type { AssetOwnerType } from "../../repositories/models/index.js";
import {
  decodeGlobalId,
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { TypePolicy } from "@shopana/type-resolver";
import { CdnConfigurationResolver } from "./CdnConfigurationResolver.js";
import { CdnRoutingRuleResolver } from "./CdnRoutingRuleResolver.js";
import { CdnDeliveryPreviewResolver } from "./CdnDeliveryPreviewResolver.js";
import { MediaSourceResolver } from "./MediaSourceResolver.js";
import type { ImageTransformOptions } from "../../infrastructure/cdn/index.js";
import type {
  CdnRoutingConditions,
  CdnTransformOverrides,
} from "../../repositories/models/index.js";
import type {
  MediaProcessingStatus,
  MediaType as FileMediaType,
} from "../../repositories/FileRepository.js";

interface CdnConfigurationMutationInput {
  name?: string;
  provider?: string;
  baseUrl?: string;
  pathPrefix?: string;
  enabled?: boolean;
  isDefault?: boolean;
  signingMode?: string;
  secretRef?: string | null;
  transformStrategy?: string;
  urlTemplate?: string | null;
  providerConfig?: Record<string, unknown>;
  transformConfig?: Record<string, unknown>;
}

interface CdnRoutingRuleMutationInput {
  cdnConfigurationId?: string | null;
  name?: string;
  priority?: number;
  enabled?: boolean;
  conditions?: CdnRoutingConditions;
  transformOverrides?: CdnTransformOverrides;
}

/**
 * MediaMutation namespace resolver.
 * Handles all media mutation operations.
 * Store context is determined from x-store-name header.
 */
@TypePolicy<MediaMutationResolver>({
  resource: "store.data",
  action: "write",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
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
      bucket: result.bucket ? new BucketResolver(result.bucket.id, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async cdnConfigurationCreate({
    input,
  }: {
    input: CdnConfigurationMutationInput & {
      name: string;
      provider: string;
      baseUrl: string;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(CdnConfigurationCreateScript, input);
    return {
      configuration: result.configuration
        ? new CdnConfigurationResolver(result.configuration.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async cdnConfigurationUpdate({
    input,
  }: {
    input: CdnConfigurationMutationInput & { id: string };
  }) {
    const id = this.decodeId(input.id, GlobalIdEntity.CdnConfiguration);
    if (!id) return this.invalidEntityPayload("configuration", "id");
    const { id: _globalId, ...changes } = input;
    const result = await this.$ctx.kernel.runScript(CdnConfigurationUpdateScript, {
      id,
      ...changes,
    });
    return {
      configuration: result.configuration
        ? new CdnConfigurationResolver(result.configuration.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async cdnConfigurationDelete({ id: globalId }: { id: string }) {
    const id = this.decodeId(globalId, GlobalIdEntity.CdnConfiguration);
    if (!id) {
      return {
        deletedConfigurationId: null,
        userErrors: [this.invalidIdError("id")],
      };
    }
    const result = await this.$ctx.kernel.runScript(CdnConfigurationDeleteScript, { id });
    return {
      deletedConfigurationId: result.deletedConfigurationId
        ? encodeGlobalIdByType(result.deletedConfigurationId, GlobalIdEntity.CdnConfiguration)
        : null,
      userErrors: result.userErrors,
    };
  }

  async cdnConfigurationSetDefault({ id: globalId }: { id: string }) {
    const id = this.decodeId(globalId, GlobalIdEntity.CdnConfiguration);
    if (!id) return this.invalidEntityPayload("configuration", "id");
    const result = await this.$ctx.kernel.runScript(CdnConfigurationSetDefaultScript, { id });
    return {
      configuration: result.configuration
        ? new CdnConfigurationResolver(result.configuration.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async cdnConfigurationTest({
    input,
  }: {
    input: {
      configuration: CdnConfigurationMutationInput & {
        name: string;
        provider: string;
        baseUrl: string;
      };
      objectPath: string;
      transform?: ImageTransformOptions | null;
    };
  }) {
    const result = await this.$ctx.kernel.runScript(CdnConfigurationTestScript, {
      ...input.configuration,
      objectPath: input.objectPath,
      transform: input.transform,
    });
    return {
      preview: result.preview ? new CdnDeliveryPreviewResolver(result.preview, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async cdnRoutingRuleCreate({
    input,
  }: {
    input: CdnRoutingRuleMutationInput & {
      cdnConfigurationId: string;
      name: string;
    };
  }) {
    const cdnConfigurationId = this.decodeId(
      input.cdnConfigurationId,
      GlobalIdEntity.CdnConfiguration,
    );
    if (!cdnConfigurationId) return this.invalidEntityPayload("routingRule", "cdnConfigurationId");
    const result = await this.$ctx.kernel.runScript(CdnRoutingRuleCreateScript, {
      ...input,
      cdnConfigurationId,
    });
    return {
      routingRule: result.routingRule
        ? new CdnRoutingRuleResolver(result.routingRule.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async cdnRoutingRuleUpdate({ input }: { input: CdnRoutingRuleMutationInput & { id: string } }) {
    const id = this.decodeId(input.id, GlobalIdEntity.CdnRoutingRule);
    if (!id) return this.invalidEntityPayload("routingRule", "id");
    const cdnConfigurationId = input.cdnConfigurationId
      ? this.decodeId(input.cdnConfigurationId, GlobalIdEntity.CdnConfiguration)
      : undefined;
    if (input.cdnConfigurationId && !cdnConfigurationId) {
      return this.invalidEntityPayload("routingRule", "cdnConfigurationId");
    }
    const { id: _globalId, ...changes } = input;
    const result = await this.$ctx.kernel.runScript(CdnRoutingRuleUpdateScript, {
      ...changes,
      id,
      cdnConfigurationId: cdnConfigurationId ?? undefined,
    });
    return {
      routingRule: result.routingRule
        ? new CdnRoutingRuleResolver(result.routingRule.id, this.$ctx)
        : null,
      userErrors: result.userErrors,
    };
  }

  async cdnRoutingRuleDelete({ id: globalId }: { id: string }) {
    const id = this.decodeId(globalId, GlobalIdEntity.CdnRoutingRule);
    if (!id) {
      return {
        deletedRoutingRuleId: null,
        userErrors: [this.invalidIdError("id")],
      };
    }
    const result = await this.$ctx.kernel.runScript(CdnRoutingRuleDeleteScript, { id });
    return {
      deletedRoutingRuleId: result.deletedRoutingRuleId
        ? encodeGlobalIdByType(result.deletedRoutingRuleId, GlobalIdEntity.CdnRoutingRule)
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
      altText?: string | null;
      originalName?: string | null;
      meta?: Record<string, unknown> | null;
      mediaType?: FileMediaType;
      previewFileId?: string | null;
      thumbhash?: string | null;
      processingStatus?: MediaProcessingStatus;
      processingError?: string | null;
    };
  }) {
    const fileId = this.decodeId(input.id, GlobalIdEntity.File);
    if (!fileId) {
      return {
        file: null,
        userErrors: [{ message: "Invalid file ID", field: ["id"], code: "INVALID_ID" }],
      };
    }

    const previewFileId = input.previewFileId
      ? this.decodeId(input.previewFileId, GlobalIdEntity.File)
      : input.previewFileId;
    if (input.previewFileId && !previewFileId) {
      return {
        file: null,
        userErrors: [this.invalidIdError("previewFileId")],
      };
    }

    const { kernel } = this.$ctx;

    const result = await kernel.runScript(FileUpdateScript, {
      id: fileId,
      altText: input.altText,
      originalName: input.originalName,
      meta: input.meta,
      mediaType: input.mediaType,
      previewFileId,
      thumbhash: input.thumbhash,
      processingStatus: input.processingStatus,
      processingError: input.processingError,
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
    const fileId = this.decodeId(input.id, GlobalIdEntity.File);
    if (!fileId) {
      return {
        deletedFileId: null,
        userErrors: [{ message: "Invalid file ID", field: ["id"], code: "INVALID_ID" }],
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
      const fileId = this.decodeId(id, GlobalIdEntity.File);
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
      acceptedIds: result.acceptedIds.map((id) => encodeGlobalIdByType(id, GlobalIdEntity.File)),
      startedHardDeleteIds: result.startedHardDeleteIds.map((id) =>
        encodeGlobalIdByType(id, GlobalIdEntity.File),
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
    const fileId = this.decodeId(input.id, GlobalIdEntity.File);
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

  async fileRestoreMany({
    input,
  }: {
    input: {
      ids: string[];
    };
  }) {
    const decodedIds: string[] = [];
    const invalidIds: string[] = [];

    for (const id of input.ids) {
      const fileId = this.decodeId(id, GlobalIdEntity.File);
      if (!fileId) {
        invalidIds.push(id);
        continue;
      }
      decodedIds.push(fileId);
    }

    const { kernel } = this.$ctx;
    const result = await kernel.runScript(FileRestoreManyScript, {
      ids: decodedIds,
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
      restoredIds: result.restoredIds.map((id) => encodeGlobalIdByType(id, GlobalIdEntity.File)),
      userErrors,
    };
  }

  async fileClearError({
    input,
  }: {
    input: {
      id: string;
    };
  }) {
    const fileId = this.decodeId(input.id, GlobalIdEntity.File);
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

  async mediaSourceCreate({
    input,
  }: {
    input: {
      mediaFileId: string;
      sourceFileId: string;
      kind: string;
      format: string;
      sortOrder?: number;
    };
  }) {
    const ids = this.decodeMediaSourceIds(input);
    if (!ids) return this.invalidEntityPayload("source", "fileId");
    const result = await this.$ctx.kernel.runScript(MediaSourceCreateScript, {
      ...input,
      ...ids,
    });
    return {
      source: result.source ? new MediaSourceResolver(result.source, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async mediaSourceUpdate({
    input,
  }: {
    input: {
      mediaFileId: string;
      sourceFileId: string;
      kind?: string;
      format?: string;
      sortOrder?: number;
    };
  }) {
    const ids = this.decodeMediaSourceIds(input);
    if (!ids) return this.invalidEntityPayload("source", "fileId");
    const result = await this.$ctx.kernel.runScript(MediaSourceUpdateScript, {
      ...input,
      ...ids,
    });
    return {
      source: result.source ? new MediaSourceResolver(result.source, this.$ctx) : null,
      userErrors: result.userErrors,
    };
  }

  async mediaSourceDelete({ input }: { input: { mediaFileId: string; sourceFileId: string } }) {
    const ids = this.decodeMediaSourceIds(input);
    if (!ids) {
      return {
        deletedSourceFileId: null,
        userErrors: [this.invalidIdError("fileId")],
      };
    }
    const result = await this.$ctx.kernel.runScript(MediaSourceDeleteScript, ids);
    return {
      deletedSourceFileId: result.deletedSourceFileId
        ? encodeGlobalIdByType(result.deletedSourceFileId, GlobalIdEntity.File)
        : null,
      userErrors: result.userErrors,
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

    const allowedOwnerId =
      ownerType === "store"
        ? this.$ctx.store.id
        : ownerType === "organization"
          ? this.$ctx.store.organizationId
          : this.$ctx.user.id;

    if (ownerId !== allowedOwnerId) {
      return {
        file: null,
        userErrors: [
          {
            message: "The media owner is outside the current access scope",
            field: ["ownerId"],
            code: "OWNER_SCOPE_MISMATCH",
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
      VALIDATION_ERROR: "Invalid input",
      INTERNAL_ERROR: "Internal error",
    };
    return messages[code] ?? "Unknown error";
  }

  private decodeId(id: string, type: GlobalIdEntity): string | null {
    try {
      return decodeGlobalIdByType(id, type);
    } catch {
      return null;
    }
  }

  private decodeMediaSourceIds(input: {
    mediaFileId: string;
    sourceFileId: string;
  }): { mediaFileId: string; sourceFileId: string } | null {
    const mediaFileId = this.decodeId(input.mediaFileId, GlobalIdEntity.File);
    const sourceFileId = this.decodeId(input.sourceFileId, GlobalIdEntity.File);
    return mediaFileId && sourceFileId ? { mediaFileId, sourceFileId } : null;
  }

  private invalidIdError(field: string) {
    return {
      field: [field],
      code: "INVALID_ID",
      message: "Invalid global ID",
    };
  }

  private invalidEntityPayload(field: string, idField: string) {
    return {
      [field]: null,
      userErrors: [this.invalidIdError(idField)],
    };
  }
}
