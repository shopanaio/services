import type { TransactionScript } from "../../kernel/types.js";

export interface FileUpdateParams {
  readonly id: string;
  readonly altText?: string;
  readonly originalName?: string;
  readonly meta?: Record<string, unknown>;
}

export interface FileUpdateResult {
  file?: {
    id: string;
  };
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const fileUpdate: TransactionScript<
  FileUpdateParams,
  FileUpdateResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "fileUpdate: not implemented");

    return {
      file: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "fileUpdate failed");
    return {
      file: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
