import { createHash } from "node:crypto";
import { Money } from "@shopana/shared-money";
import type { AdminOrderCommandName } from "../../domain/admin/AdminOrderCommandContracts.js";
import { parseDecimalInput } from "../../utils/decimal.js";

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("ORDER_COMMAND_OBJECT_REQUIRED");
  }
  return value as Record<string, unknown>;
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function jsonObject(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) return {};
  return asRecord(value);
}

export function requiredString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim())
    throw new Error(`ORDER_${field.toUpperCase()}_REQUIRED`);
  return value.trim();
}

export function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("ORDER_STRING_INVALID");
  return value.trim() || null;
}

export function requiredUuid(record: Record<string, unknown>, field: string): string {
  const value = requiredString(record, field);
  if (!isUuid(value)) throw new Error(`ORDER_${field.toUpperCase()}_INVALID`);
  return value;
}

export function optionalUuid(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !isUuid(value))
    throw new Error(`ORDER_${field.toUpperCase()}_INVALID`);
  return value;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function requiredPositiveInt(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (!Number.isSafeInteger(value) || Number(value) <= 0)
    throw new Error(`ORDER_${field.toUpperCase()}_INVALID`);
  return Number(value);
}

export function optionalPositiveInt(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || Number(value) <= 0)
    throw new Error(`ORDER_${field.toUpperCase()}_INVALID`);
  return Number(value);
}

export function optionalPositiveNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error("ORDER_POSITIVE_NUMBER_INVALID");
  }
  return value;
}

export function requiredArray(record: Record<string, unknown>, field: string): unknown[] {
  const value = record[field];
  if (!Array.isArray(value)) throw new Error(`ORDER_${field.toUpperCase()}_REQUIRED`);
  return value;
}

export function requiredCurrency(record: Record<string, unknown>, field: string): string {
  const value = requiredString(record, field).toUpperCase();
  if (!/^[A-Z]{3}$/.test(value)) throw new Error("ORDER_CURRENCY_INVALID");
  return value;
}

export function optionalBoolean(value: unknown): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") throw new Error("ORDER_BOOLEAN_INVALID");
  return value;
}

export function requiredDateTime(record: Record<string, unknown>, field: string): string {
  const value = requiredString(record, field);
  if (!Number.isFinite(Date.parse(value))) throw new Error(`ORDER_${field.toUpperCase()}_INVALID`);
  return value;
}

export function moneyMinor(value: Record<string, unknown>, expectedCurrency: string): bigint {
  const currency = requiredCurrency(value, "currencyCode");
  if (currency !== expectedCurrency) throw new Error("ORDER_CURRENCY_MISMATCH");
  const parsed = parseDecimalInput(value.amount);
  if (!parsed) throw new Error("ORDER_MONEY_INVALID");
  const normalized = Money.fromMinor(
    BigInt(parsed.amount),
    currency,
    BigInt(parsed.scale),
  ).normalizeScale();
  const minor = normalized.amountMinor();
  if (minor < 0n) throw new Error("ORDER_MONEY_NEGATIVE");
  return minor;
}

export function paymentMoney(value: unknown, currencyCode: string, fallbackMinor?: string) {
  if (value === undefined || value === null) {
    if (!fallbackMinor) throw new Error("ORDER_MONEY_REQUIRED");
    return { amountMinor: fallbackMinor, currencyCode };
  }
  const money = asRecord(value);
  return { amountMinor: moneyMinor(money, currencyCode).toString(), currencyCode };
}

export function lineTotals(lines: Record<string, unknown>[], currencyCode: string) {
  const subtotal = lines.reduce((sum, line) => {
    const quantity = requiredPositiveInt(line, "quantity");
    return sum + moneyMinor(asRecord(line.unitPrice), currencyCode) * BigInt(quantity);
  }, 0n);
  return { subtotal, total: subtotal };
}

export function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
    .join(",")}}`;
}

export function operationResourceId(input: Record<string, unknown>): string | null {
  for (const field of [
    "shipmentId",
    "fulfillmentId",
    "fulfillmentOrderId",
    "returnId",
    "editId",
    "integrationLinkId",
  ]) {
    if (input[field]) return requiredUuid(input, field);
  }
  return null;
}

export function commandResourceType(command: AdminOrderCommandName): string {
  if (command.startsWith("shipment")) return "OrderShipment";
  if (command.startsWith("fulfillmentOrder")) return "OrderFulfillmentOrder";
  if (command.startsWith("fulfillment")) return "OrderFulfillment";
  if (command.startsWith("orderReturn")) return "OrderReturn";
  if (command.startsWith("orderEdit")) return "OrderEditSession";
  return "OrderIntegrationLink";
}

export function commandStatus(status: string): string {
  return status.replace(/[^A-Z0-9]+/gi, "_").toUpperCase();
}

export function errorCode(error: unknown): string {
  const message = errorMessage(error);
  return /^[A-Z][A-Z0-9_]+$/.test(message) ? message : "ORDER_OPERATION_FAILED";
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function escapeSql(value: string): string {
  return value.replaceAll("'", "''");
}
