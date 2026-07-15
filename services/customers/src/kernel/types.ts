import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
  WorkflowRegistry,
} from "@shopana/shared-kernel";
import type { Cache } from "cache-manager";
import type { Repository } from "../repositories/Repository.js";

export interface CustomersKernelServices extends BaseKernelServices {
  readonly repository: Repository;
  readonly cache: Cache;
  readonly workflow: WorkflowRegistry;
}

export type ScriptContext = BaseScriptContext;

export interface RunScriptContext {
  storeId: string;
  organizationId: string;
  locale?: string;
  defaultLocale?: string;
  defaultCurrency?: string;
  locales?: string[];
  currencies?: string[];
  userId?: string;
  requestId?: string;
}

export type TransactionScript<
  TParams = unknown,
  TResult = unknown
> = BaseTransactionScript<TParams, TResult, CustomersKernelServices>;

export class KernelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "KernelError";
  }
}

export const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  NOT_NULL_VIOLATION: "23502",
} as const;

export interface PgErrorInfo {
  code: string;
  constraintName?: string;
  detail?: string;
  tableName?: string;
}

export function getPgErrorInfo(error: unknown): PgErrorInfo | null {
  if (isPgError(error)) {
    return extractPgInfo(error);
  }

  if (error instanceof Error && error.cause && isPgError(error.cause)) {
    return extractPgInfo(error.cause);
  }

  return null;
}

export function isUniqueViolation(
  error: unknown,
  constraintName?: string
): boolean {
  const info = getPgErrorInfo(error);
  if (!info || info.code !== PG_ERROR_CODES.UNIQUE_VIOLATION) {
    return false;
  }
  return constraintName ? info.constraintName === constraintName : true;
}

function isPgError(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as Record<string, unknown>).code === "string"
  );
}

function extractPgInfo(error: Record<string, unknown>): PgErrorInfo {
  return {
    code: error.code as string,
    constraintName: error.constraint_name as string | undefined,
    detail: error.detail as string | undefined,
    tableName: error.table_name as string | undefined,
  };
}
