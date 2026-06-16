import type { UserError } from "../../kernel/BaseScript.js";

/**
 * Base script result type with changes tracking for event sourcing.
 *
 * @template T - Result type (entity)
 * @template C - Changes type (partial snapshot for events)
 */
export interface ScriptResult<T, C = never> {
  /** Operation result (entity or null on error) */
  result: T | null;

  /** Changes for event payload (null if nothing changed) */
  changes: C | null;

  /** Validation errors */
  userErrors: UserError[];
}

/**
 * Helper to create a successful result with changes.
 */
export function successResult<T, C>(
  result: T,
  changes: C | null
): ScriptResult<T, C> {
  return { result, changes, userErrors: [] };
}

/**
 * Helper to create a successful result without changes.
 */
export function unchangedResult<T, C>(result: T): ScriptResult<T, C> {
  return { result, changes: null, userErrors: [] };
}

/**
 * Helper to create an error result.
 */
export function errorResult<T, C>(
  userErrors: UserError[]
): ScriptResult<T, C> {
  return { result: null, changes: null, userErrors };
}

/**
 * Helper to create a single error result.
 */
export function singleError<T, C>(
  message: string,
  code?: string,
  field?: string[]
): ScriptResult<T, C> {
  return { result: null, changes: null, userErrors: [{ message, code, field }] };
}

// Re-export UserError for convenience
export type { UserError };
