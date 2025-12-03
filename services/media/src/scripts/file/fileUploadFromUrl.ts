import type { TransactionScript } from "../../kernel/types.js";

export interface FileUploadFromUrlParams {
  readonly sourceUrl: string;
  readonly altText?: string;
  readonly idempotencyKey?: string;
}

export interface FileUploadFromUrlResult {
  file?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const fileUploadFromUrl: TransactionScript<
  FileUploadFromUrlParams,
  FileUploadFromUrlResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "fileUploadFromUrl: not implemented");

    return {
      file: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "fileUploadFromUrl failed");
    return {
      file: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
