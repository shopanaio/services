import type { TransactionScript } from "../../kernel/types.js";
import { getContext } from "../../context/index.js";
import type { FileProvider } from "../../repositories/index.js";

export interface FileCreateExternalParams {
  readonly provider: string;
  readonly externalId: string;
  readonly url: string;
  readonly thumbnailUrl?: string;
  readonly originalName?: string;
  readonly width?: number;
  readonly height?: number;
  readonly durationMs?: number;
  readonly altText?: string;
  readonly providerMeta?: Record<string, unknown>;
  readonly idempotencyKey?: string;
}

export interface FileCreateExternalResult {
  file?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

const VALID_PROVIDERS = ["YOUTUBE", "VIMEO", "URL"] as const;
type ExternalProvider = (typeof VALID_PROVIDERS)[number];

function isValidProvider(provider: string): provider is ExternalProvider {
  return VALID_PROVIDERS.includes(provider as ExternalProvider);
}

/**
 * Creates a file record for external media (YouTube, Vimeo, or generic URL).
 *
 * Logic:
 * 1. Validate provider
 * 2. Check idempotency key (if exists - return existing file)
 * 3. Check for existing file by externalId
 * 4. Create record in `files` table
 * 5. Create record in `externalMedia` table
 * 6. Return the created File
 */
export const fileCreateExternal: TransactionScript<
  FileCreateExternalParams,
  FileCreateExternalResult
> = async (params, services) => {
  const { logger, repository } = services;
  const ctx = getContext();
  const projectId = ctx.project.id;

  try {
    logger.info({ params, projectId }, "fileCreateExternal: starting");

    // 1. Validate provider
    if (!isValidProvider(params.provider)) {
      logger.warn({ provider: params.provider }, "fileCreateExternal: invalid provider");
      return {
        file: undefined,
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
      const existingFile = await repository.file.findByIdempotencyKey(
        projectId,
        params.idempotencyKey
      );

      if (existingFile) {
        logger.info(
          { fileId: existingFile.id, idempotencyKey: params.idempotencyKey },
          "fileCreateExternal: returning existing file by idempotency key"
        );
        return {
          file: { id: existingFile.id },
          userErrors: [],
        };
      }
    }

    // 3. Check for existing file by externalId (deduplication)
    const existingExternal = await repository.externalMedia.findByExternalId(
      projectId,
      params.externalId
    );

    if (existingExternal) {
      // Check if the existing file's provider matches
      const existingFile = await repository.file.findById(
        projectId,
        existingExternal.fileId
      );

      if (existingFile && existingFile.provider === params.provider) {
        logger.info(
          { fileId: existingFile.id, externalId: params.externalId },
          "fileCreateExternal: returning existing file by external ID"
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
    const file = await repository.file.create(projectId, {
      provider: params.provider as FileProvider,
      url: params.url,
      mimeType,
      sizeBytes: 0, // External media doesn't have size
      originalName: params.originalName ?? null,
      width: params.width ?? null,
      height: params.height ?? null,
      durationMs: params.durationMs ?? null,
      altText: params.altText ?? null,
      sourceUrl: params.url,
      idempotencyKey: params.idempotencyKey ?? null,
      isProcessed: true, // External media is always "processed"
    });

    // 6. Create record in `externalMedia` table
    await repository.externalMedia.create(projectId, {
      fileId: file.id,
      externalId: params.externalId,
      providerMeta: {
        ...params.providerMeta,
        thumbnailUrl: params.thumbnailUrl,
      },
    });

    logger.info({ fileId: file.id }, "fileCreateExternal: completed successfully");

    return {
      file: { id: file.id },
      userErrors: [],
    };
  } catch (error) {
    logger.error({ error, params }, "fileCreateExternal failed");
    return {
      file: undefined,
      userErrors: [{ message: "Failed to create external file record", code: "INTERNAL_ERROR" }],
    };
  }
};

/**
 * Returns the MIME type for external media providers
 */
function getMimeTypeForProvider(provider: string): string {
  switch (provider) {
    case "YOUTUBE":
    case "VIMEO":
      return "video/mp4"; // Assume video for YouTube/Vimeo
    case "URL":
    default:
      return "application/octet-stream"; // Unknown for generic URLs
  }
}
