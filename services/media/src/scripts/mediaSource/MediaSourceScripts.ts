import { BaseScript, ZodSchema, ValidationError, toUserErrors } from "../../kernel/BaseScript.js";
import type { UserError } from "../../kernel/BaseScript.js";
import type { MediaSource } from "../../repositories/models/index.js";
import {
  mediaSourceCreateSchema,
  mediaSourceUpdateSchema,
  mediaSourceDeleteSchema,
} from "./dto/MediaSourceDto.js";

export interface MediaSourceCreateParams {
  mediaFileId: string;
  sourceFileId: string;
  kind: string;
  format: string;
  sortOrder?: number;
}

export interface MediaSourceUpdateParams {
  mediaFileId: string;
  sourceFileId: string;
  kind?: string;
  format?: string;
  sortOrder?: number;
}

export interface MediaSourceDeleteParams {
  mediaFileId: string;
  sourceFileId: string;
}

export interface MediaSourceResult {
  source: MediaSource | null;
  userErrors: UserError[];
}

export interface MediaSourceDeleteResult {
  deletedSourceFileId: string | null;
  userErrors: UserError[];
}

abstract class MediaSourceScriptBase<TParams, TResult> extends BaseScript<TParams, TResult> {
  protected async validateFiles(
    mediaFileId: string,
    sourceFileId: string,
    includeDeletedSource = false,
  ): Promise<UserError[]> {
    if (mediaFileId === sourceFileId) {
      return [
        {
          field: ["sourceFileId"],
          code: "SELF_REFERENCE",
          message: "A media file cannot be its own prepared source",
        },
      ];
    }
    const [mediaFile, sourceFile] = await Promise.all([
      this.findStoreFile(mediaFileId),
      this.findStoreFile(sourceFileId, includeDeletedSource),
    ]);
    const errors: UserError[] = [];
    if (!mediaFile) {
      errors.push({ field: ["mediaFileId"], code: "NOT_FOUND", message: "Media file not found" });
    }
    if (!sourceFile) {
      errors.push({ field: ["sourceFileId"], code: "NOT_FOUND", message: "Source file not found" });
    }
    return errors;
  }
}

export class MediaSourceCreateScript extends MediaSourceScriptBase<
  MediaSourceCreateParams,
  MediaSourceResult
> {
  @ZodSchema(mediaSourceCreateSchema)
  protected async execute(params: MediaSourceCreateParams): Promise<MediaSourceResult> {
    const userErrors = await this.validateFiles(params.mediaFileId, params.sourceFileId);
    if (!params.kind.trim()) {
      userErrors.push({ field: ["kind"], code: "REQUIRED", message: "Kind is required" });
    }
    if (!params.format.trim()) {
      userErrors.push({ field: ["format"], code: "REQUIRED", message: "Format is required" });
    }
    if (params.sortOrder !== undefined && params.sortOrder < 0) {
      userErrors.push({
        field: ["sortOrder"],
        code: "INVALID",
        message: "Sort order cannot be negative",
      });
    }
    if (userErrors.length > 0) return { source: null, userErrors };

    const kind = params.kind.trim().toUpperCase();
    const format = params.format.trim().toUpperCase();
    const sortOrder = params.sortOrder ?? 0;
    const existing = await this.repository.mediaSource.find(
      params.mediaFileId,
      params.sourceFileId,
    );
    if (existing) {
      return {
        source: null,
        userErrors: [
          {
            field: ["sourceFileId"],
            code: "ALREADY_EXISTS",
            message: "Prepared source already exists",
          },
        ],
      };
    }
    const occupiedSlot = await this.repository.mediaSource.findBySlot(
      params.mediaFileId,
      kind,
      sortOrder,
    );
    if (occupiedSlot) {
      return {
        source: null,
        userErrors: [
          {
            field: ["sortOrder"],
            code: "SOURCE_SLOT_OCCUPIED",
            message: "Another prepared source already uses this kind and sort order",
          },
        ],
      };
    }

    return {
      source: await this.repository.mediaSource.create({
        ...params,
        kind,
        format,
        sortOrder,
      }),
      userErrors: [],
    };
  }

  protected handleError(error: unknown): MediaSourceResult {
    if (error instanceof ValidationError) {
      return { source: null, userErrors: toUserErrors(error) };
    }
    return {
      source: null,
      userErrors: [
        { code: "MEDIA_SOURCE_CREATE_FAILED", message: "Failed to create prepared media source" },
      ],
    };
  }
}

export class MediaSourceUpdateScript extends MediaSourceScriptBase<
  MediaSourceUpdateParams,
  MediaSourceResult
> {
  @ZodSchema(mediaSourceUpdateSchema)
  protected async execute(params: MediaSourceUpdateParams): Promise<MediaSourceResult> {
    const userErrors = await this.validateFiles(params.mediaFileId, params.sourceFileId);
    if (params.kind !== undefined && !params.kind.trim()) {
      userErrors.push({ field: ["kind"], code: "REQUIRED", message: "Kind is required" });
    }
    if (params.format !== undefined && !params.format.trim()) {
      userErrors.push({ field: ["format"], code: "REQUIRED", message: "Format is required" });
    }
    if (params.sortOrder !== undefined && params.sortOrder < 0) {
      userErrors.push({
        field: ["sortOrder"],
        code: "INVALID",
        message: "Sort order cannot be negative",
      });
    }
    if (userErrors.length > 0) return { source: null, userErrors };

    const existing = await this.repository.mediaSource.find(
      params.mediaFileId,
      params.sourceFileId,
    );
    if (!existing) {
      return {
        source: null,
        userErrors: [{ code: "NOT_FOUND", message: "Prepared media source not found" }],
      };
    }
    const kind = params.kind?.trim().toUpperCase() ?? existing.kind;
    const sortOrder = params.sortOrder ?? existing.sortOrder;
    const occupiedSlot = await this.repository.mediaSource.findBySlot(
      params.mediaFileId,
      kind,
      sortOrder,
    );
    if (occupiedSlot && occupiedSlot.sourceFileId !== params.sourceFileId) {
      return {
        source: null,
        userErrors: [
          {
            field: ["sortOrder"],
            code: "SOURCE_SLOT_OCCUPIED",
            message: "Another prepared source already uses this kind and sort order",
          },
        ],
      };
    }

    const source = await this.repository.mediaSource.update(
      params.mediaFileId,
      params.sourceFileId,
      {
        ...(params.kind !== undefined ? { kind } : {}),
        ...(params.format !== undefined ? { format: params.format.trim().toUpperCase() } : {}),
        ...(params.sortOrder !== undefined ? { sortOrder: params.sortOrder } : {}),
      },
    );
    return source
      ? { source, userErrors: [] }
      : {
          source: null,
          userErrors: [{ code: "NOT_FOUND", message: "Prepared media source not found" }],
        };
  }

  protected handleError(error: unknown): MediaSourceResult {
    if (error instanceof ValidationError) {
      return { source: null, userErrors: toUserErrors(error) };
    }
    return {
      source: null,
      userErrors: [
        { code: "MEDIA_SOURCE_UPDATE_FAILED", message: "Failed to update prepared media source" },
      ],
    };
  }
}

export class MediaSourceDeleteScript extends MediaSourceScriptBase<
  MediaSourceDeleteParams,
  MediaSourceDeleteResult
> {
  @ZodSchema(mediaSourceDeleteSchema)
  protected async execute(params: MediaSourceDeleteParams): Promise<MediaSourceDeleteResult> {
    const userErrors = await this.validateFiles(params.mediaFileId, params.sourceFileId, true);
    if (userErrors.length > 0) {
      return { deletedSourceFileId: null, userErrors };
    }
    const deleted = await this.repository.mediaSource.delete(
      params.mediaFileId,
      params.sourceFileId,
    );
    return deleted
      ? { deletedSourceFileId: params.sourceFileId, userErrors: [] }
      : {
          deletedSourceFileId: null,
          userErrors: [{ code: "NOT_FOUND", message: "Prepared media source not found" }],
        };
  }

  protected handleError(error: unknown): MediaSourceDeleteResult {
    if (error instanceof ValidationError) {
      return { deletedSourceFileId: null, userErrors: toUserErrors(error) };
    }
    return {
      deletedSourceFileId: null,
      userErrors: [
        { code: "MEDIA_SOURCE_DELETE_FAILED", message: "Failed to delete prepared media source" },
      ],
    };
  }
}
