import { z } from "zod";

export type OrderUserError = Readonly<{
  field: readonly string[] | null;
  message: string;
  code: string;
  retryable: boolean;
  currentVersion: number | null;
}>;

const stableCodes = new Set([
  "ORDER_NOT_FOUND",
  "ORDER_VERSION_CONFLICT",
  "ORDER_IDEMPOTENCY_CONFLICT",
  "ORDER_ACTION_NOT_AVAILABLE",
  "ORDER_STATUS_TRANSITION_INVALID",
  "ORDER_DRAFT_REQUIRED",
  "ORDER_LINE_NOT_FOUND",
  "ORDER_LINE_QUANTITY_INVALID",
  "ORDER_LINE_ALREADY_FULFILLED",
  "ORDER_TOTAL_INVALID",
  "ORDER_CURRENCY_MISMATCH",
  "ORDER_PLACEMENT_NOT_FOUND",
  "ORDER_PLACEMENT_CONTRACT_UNSUPPORTED",
  "ORDER_PLACEMENT_SNAPSHOT_HASH_MISMATCH",
  "ORDER_PLACEMENT_ALREADY_CONFIRMED",
  "ORDER_PLACEMENT_ALREADY_FAILED",
  "ORDER_PLACEMENT_EVIDENCE_INVALID",
  "ORDER_PLACEMENT_IDEMPOTENCY_CONFLICT",
  "ORDER_EDIT_ALREADY_ACTIVE",
  "ORDER_EDIT_EXPIRED",
  "ORDER_EDIT_STALE",
  "ORDER_PAYMENT_ACTION_NOT_AVAILABLE",
  "ORDER_PAYMENT_PROVIDER_UNAVAILABLE",
  "ORDER_REFUND_AMOUNT_EXCEEDED",
  "FULFILLMENT_ORDER_NOT_FOUND",
  "FULFILLMENT_ORDER_VERSION_CONFLICT",
  "FULFILLMENT_QUANTITY_EXCEEDED",
  "FULFILLMENT_SERVICE_NOT_READY",
  "FULFILLMENT_CANCELLATION_PENDING",
  "SHIPMENT_ACTION_NOT_AVAILABLE",
  "SHIPMENT_PROVIDER_UNAVAILABLE",
  "RETURN_QUANTITY_EXCEEDED",
  "RETURN_ACTION_NOT_AVAILABLE",
  "INTEGRATION_LINK_NOT_FOUND",
  "INTEGRATION_SYNC_ALREADY_CURRENT",
  "INTEGRATION_PROVIDER_UNAVAILABLE",
  "PERMISSION_DENIED",
]);

export function toOrderUserErrors(error: unknown, fallbackCode: string): OrderUserError[] {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => ({
      field: ["input", ...issue.path.map(String)],
      message: issue.message,
      code: "ORDER_INPUT_INVALID",
      retryable: false,
      currentVersion: null,
    }));
  }
  const structured = structuredErrors(error);
  if (structured.length > 0) return structured;
  const message = error instanceof Error ? error.message : fallbackCode;
  const code = normalizeCode(message, fallbackCode);
  const currentVersion = /current(?:Version)?[=: ]+(\d+)/i.exec(message)?.[1];
  return [
    {
      field: null,
      message: safeMessage(code, message),
      code,
      retryable: /PROVIDER_UNAVAILABLE|TIMEOUT|TEMPORAR/.test(code),
      currentVersion: currentVersion ? Number(currentVersion) : null,
    },
  ];
}

function normalizeCode(message: string, fallback: string): string {
  const token = message.match(/[A-Z][A-Z0-9_]{3,}/)?.[0];
  if (!token) return fallback;
  if (token.includes("AUTHORIZ") || token === "UNAUTHENTICATED") return "PERMISSION_DENIED";
  if (stableCodes.has(token)) return token;
  if (token.includes("VERSION") && token.includes("CONFLICT")) return "ORDER_VERSION_CONFLICT";
  if (token.includes("IDEMPOTENCY")) return "ORDER_IDEMPOTENCY_CONFLICT";
  return fallback;
}

function safeMessage(code: string, original: string): string {
  if (code === "PERMISSION_DENIED") return "You do not have permission to perform this action.";
  if (code === "ORDER_NOT_FOUND") return "The order was not found.";
  if (code === "ORDER_VERSION_CONFLICT") return "The order changed after it was loaded.";
  if (code === "ORDER_IDEMPOTENCY_CONFLICT")
    return "The idempotency key was already used with different input.";
  if (code.endsWith("_FAILED") && original === code) return "The order command could not be completed.";
  return stableCodes.has(code) ? humanizeCode(code) : "The order command could not be completed.";
}

function structuredErrors(error: unknown): OrderUserError[] {
  if (!error || typeof error !== "object") return [];
  const record = error as Record<string, unknown>;
  const candidates = Array.isArray(record.userErrors)
    ? record.userErrors
    : Array.isArray(record.errors)
      ? record.errors
      : [];
  return candidates.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as Record<string, unknown>;
    const code = normalizeCode(String(item.code ?? item.message ?? ""), "ORDER_COMMAND_FAILED");
    const path = Array.isArray(item.field) ? item.field.map(String) : null;
    return [
      {
        field: path ? (path[0] === "input" ? path : ["input", ...path]) : null,
        message: safeMessage(code, String(item.message ?? code)),
        code,
        retryable: item.retryable === true,
        currentVersion:
          typeof item.currentVersion === "number" ? item.currentVersion : null,
      },
    ];
  });
}

function humanizeCode(code: string): string {
  const value = code
    .toLowerCase()
    .split("_")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  return value ? `${value[0]!.toUpperCase()}${value.slice(1)}.` : "The order command failed.";
}
