import type { TransactionScript } from "../../kernel/types.js";

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

export const fileCreateExternal: TransactionScript<
  FileCreateExternalParams,
  FileCreateExternalResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "fileCreateExternal: not implemented");

    return {
      file: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "fileCreateExternal failed");
    return {
      file: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
