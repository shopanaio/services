import { COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH } from "@shopana/broker-types";
import type { FunctionExecutionPlanItem, FunctionFailureMode } from "./contracts.js";

export const DEFAULT_MAX_ENVELOPE_DEPTH = COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH;

export function compareExecutionPlanItems(
  left: FunctionExecutionPlanItem,
  right: FunctionExecutionPlanItem,
): number {
  return (
    left.precedence - right.precedence ||
    left.activationSequence - right.activationSequence ||
    (left.implementationId < right.implementationId
      ? -1
      : left.implementationId > right.implementationId
        ? 1
        : 0)
  );
}

export function resolveFailureMode(
  override: FunctionFailureMode | undefined,
  fallback: FunctionFailureMode,
): FunctionFailureMode {
  return override ?? fallback;
}

export function effectiveDeadline(
  requestedDeadlineAt: string | undefined,
  defaultTimeoutMs: number,
  nowMs: number,
): string {
  const defaultDeadline = nowMs + defaultTimeoutMs;
  if (!requestedDeadlineAt) {
    return new Date(defaultDeadline).toISOString();
  }
  const requested = Date.parse(requestedDeadlineAt);
  if (!Number.isFinite(requested)) {
    throw new Error("deadlineAt must be an ISO date");
  }
  return new Date(Math.min(requested, defaultDeadline)).toISOString();
}
