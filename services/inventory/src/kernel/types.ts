import type {
  BaseKernelServices,
  ScriptContext as BaseScriptContext,
  TransactionScript as BaseTransactionScript,
} from "@shopana/shared-kernel";
import type { Cache } from "cache-manager";
import type { Repository } from "../repositories/Repository";
import type { WorkflowRegistry } from "@shopana/shared-kernel";

/**
 * Logger interface for the inventory service
 */
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * Extended services for inventory microservice
 */
export interface InventoryKernelServices extends BaseKernelServices {
  readonly repository: Repository;
  readonly cache: Cache;
  readonly workflow: WorkflowRegistry;
}

/**
 * Script context for inventory service
 */
export type ScriptContext = BaseScriptContext;

/**
 * Minimal context for running scripts from workflows.
 * Contains only the data scripts actually need.
 */
export interface RunScriptContext {
  /** Store/project ID */
  storeId: string;
  /** Organization ID */
  organizationId: string;
  /** Locale for translations */
  locale?: string;
  /** Store default locale for translation fallback */
  defaultLocale?: string;
  /** User ID if authenticated */
  userId?: string;
}

/**
 * Transaction script for inventory service
 */
export type TransactionScript<
  TParams = any,
  TResult = any
> = BaseTransactionScript<TParams, TResult, InventoryKernelServices>;

/**
 * Kernel error
 */
export class KernelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = "KernelError";
  }
}

/**
 * PostgreSQL error codes
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  NOT_NULL_VIOLATION: "23502",
} as const;

/**
 * PostgreSQL error info extracted from postgres.js errors
 */
export interface PgErrorInfo {
  code: string;
  constraintName?: string;
  detail?: string;
  tableName?: string;
}

/**
 * Extract PostgreSQL error info from an error (handles Drizzle error wrapping)
 * postgres.js errors have: code, constraint_name, detail, table_name
 */
export function getPgErrorInfo(error: unknown): PgErrorInfo | null {
  // Check direct error (postgres.js PostgresError)
  if (isPgError(error)) {
    return extractPgInfo(error);
  }

  // Check error.cause (Drizzle wraps postgres errors)
  if (error instanceof Error && error.cause && isPgError(error.cause)) {
    return extractPgInfo(error.cause);
  }

  return null;
}

/**
 * Check if an error is a unique constraint violation
 */
export function isUniqueViolation(error: unknown, constraintName?: string): boolean {
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
