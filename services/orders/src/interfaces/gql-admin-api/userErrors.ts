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
      field: issue.path.map(String),
      message: issue.message,
      code: "ORDER_INPUT_INVALID",
      retryable: false,
      currentVersion: null,
    }));
  }
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
  if (code.endsWith("_FAILED") && original !== code)
    return "The order command could not be completed.";
  return original;
}
