import { BaseScript } from "../../kernel/BaseScript.js";
import type { FileProvider } from "../../repositories/index.js";
import type {
  FileCreateExternalParams,
  FileCreateExternalResult,
} from "./dto/FileCreateExternalDto.js";
import type { AssetOwnerType } from "../../repositories/models/index.js";

const VALID_PROVIDERS = ["YOUTUBE", "VIMEO", "URL"] as const;
type ExternalProvider = (typeof VALID_PROVIDERS)[number];

function isValidProvider(provider: string): provider is ExternalProvider {
  return VALID_PROVIDERS.includes(provider as ExternalProvider);
}

function getMimeTypeForProvider(provider: string): string {
  switch (provider) {
    case "YOUTUBE":
    case "VIMEO":
      return "video/mp4";
    case "URL":
    default:
      return "application/octet-stream";
  }
}

export class FileCreateExternalScript extends BaseScript<
  FileCreateExternalParams,
  FileCreateExternalResult
> {
  protected async execute(params: FileCreateExternalParams): Promise<FileCreateExternalResult> {
    const projectId = this.storeId;

    // Resolve asset group ID from ownerType + ownerId
    let assetGroupId: string | null = null;
    if (params.ownerType && params.ownerId) {
      const assetGroup = await this.repository.assetGroup.findByOwner(
        params.ownerType as AssetOwnerType,
        params.ownerId
      );
      assetGroupId = assetGroup?.id ?? null;
    }

    this.logger.info({ params, projectId }, "FileCreateExternalScript: starting");

    // 1. Validate provider
    if (!isValidProvider(params.provider)) {
      this.logger.warn({ provider: params.provider }, "FileCreateExternalScript: invalid provider");
      return {
        file: null,
        userErrors: [
          {
            message: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(", ")}`,
            field: ["provider"],
            code: "INVALID_PROVIDER",
          },
        ],
      };
    }

    // 2. Check idempotency key
    if (params.idempotencyKey) {
      const existingFile = await this.repository.file.findByIdempotencyKey(
        projectId,
        params.idempotencyKey
      );

      if (existingFile) {
        this.logger.info(
          { fileId: existingFile.id, idempotencyKey: params.idempotencyKey },
          "FileCreateExternalScript: returning existing file by idempotency key"
        );
        return {
          file: { id: existingFile.id },
          userErrors: [],
        };
      }
    }

    // 3. Check for existing file by externalId (deduplication)
    const existingExternal = await this.repository.externalMedia.findByExternalId(
      projectId,
      params.externalId
    );

    if (existingExternal) {
      // Check if the existing file's provider matches
      const existingFile = await this.repository.file.findById(
        projectId,
        existingExternal.fileId
      );

      if (existingFile && existingFile.provider === params.provider) {
        this.logger.info(
          { fileId: existingFile.id, externalId: params.externalId },
          "FileCreateExternalScript: returning existing file by external ID"
        );
        return {
          file: { id: existingFile.id },
          userErrors: [],
        };
      }
    }

    // 4. Determine MIME type based on provider
    const mimeType = getMimeTypeForProvider(params.provider);

    // 5. Create record in `files` table
    const file = await this.repository.file.create(projectId, {
      provider: params.provider as FileProvider,
      url: params.url,
      mimeType,
      sizeBytes: 0,
      originalName: params.originalName ?? null,
      width: params.width ?? null,
      height: params.height ?? null,
      durationMs: params.durationMs ?? null,
      altText: params.altText ?? null,
      sourceUrl: params.url,
      idempotencyKey: params.idempotencyKey ?? null,
      isProcessed: true,
      assetGroupId,
    });

    // 6. Create record in `externalMedia` table
    await this.repository.externalMedia.create(projectId, {
      fileId: file.id,
      externalId: params.externalId,
      providerMeta: {
        ...params.providerMeta,
        thumbnailUrl: params.thumbnailUrl,
      },
    });

    this.logger.info({ fileId: file.id }, "FileCreateExternalScript: completed successfully");

    return {
      file: { id: file.id },
      userErrors: [],
    };
  }

  protected handleError(_error: unknown): FileCreateExternalResult {
    return {
      file: null,
      userErrors: [{ message: "Failed to create external file record", code: "INTERNAL_ERROR" }],
    };
  }
}
