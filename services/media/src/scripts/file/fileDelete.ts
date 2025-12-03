import type { TransactionScript } from "../../kernel/types.js";

export interface FileDeleteParams {
  readonly id: string;
  readonly permanent?: boolean;
}

export interface FileDeleteResult {
  deletedFileId?: string;
  userErrors: Array<{ message: string; field?: string[]; code?: string }>;
}

export const fileDelete: TransactionScript<
  FileDeleteParams,
  FileDeleteResult
> = async (params, services) => {
  const { logger } = services;

  try {
    logger.info({ params }, "fileDelete: not implemented");

    return {
      deletedFileId: undefined,
      userErrors: [{ message: "Not implemented", code: "NOT_IMPLEMENTED" }],
    };
  } catch (error) {
    logger.error({ error }, "fileDelete failed");
    return {
      deletedFileId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
};
