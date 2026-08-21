import { createHash, timingSafeEqual } from "node:crypto";
import { CURRENCY_CODES } from "@shopana/shared-references";

export const COLLECTION_RULE_HASH_VERSION = "v1" as const;
export const COLLECTION_LISTING_CONTRACT_VERSION = "2026-08-19" as const;

export const COLLECTION_RULE_FIELDS = [
  "category",
  "tag",
  "vendor",
  "feature",
  "option",
  "price",
  "in_stock",
  "created_at",
] as const;

export const COLLECTION_RULE_OPERATORS = [
  "in",
  "all",
  "eq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
] as const;

export type CollectionRuleField = (typeof COLLECTION_RULE_FIELDS)[number];
export type CollectionRuleOperator = (typeof COLLECTION_RULE_OPERATORS)[number];
export type CollectionType = "manual" | "rule";
export type CollectionDefaultSort = "manual" | "price" | "newest" | "name";
export type CollectionDefaultSortDirection = "asc" | "desc";

export type CollectionRuleTerm =
  | { entityType: "product"; kind: "tag"; tagId: string }
  | {
      entityType: "product";
      kind: "feature";
      sourceHandle: string;
      valueHandle: string;
    }
  | {
      entityType: "variant";
      kind: "option";
      sourceHandle: string;
      valueHandle: string;
    };

export type CanonicalCollectionRule =
  | {
      field: "category";
      operator: "in" | "all";
      value: { ids: readonly string[] };
    }
  | {
      field: "tag";
      operator: "in" | "all";
      value: { ids: readonly string[] };
    }
  | {
      field: "vendor";
      operator: "in";
      value: { ids: readonly string[] };
    }
  | {
      field: "feature" | "option";
      operator: "in" | "all";
      value: {
        values: readonly {
          sourceHandle: string;
          valueHandle: string;
        }[];
      };
    }
  | {
      field: "price";
      operator: "eq" | "gt" | "gte" | "lt" | "lte";
      value: { currencyCode: string; amountMinor: string };
    }
  | {
      field: "price";
      operator: "between";
      value: {
        currencyCode: string;
        minAmountMinor: string;
        maxAmountMinor: string;
      };
    }
  | {
      field: "in_stock";
      operator: "eq";
      value: { value: boolean };
    }
  | {
      field: "created_at";
      operator: "eq" | "gt" | "gte" | "lt" | "lte";
      value: { instant: string };
    }
  | {
      field: "created_at";
      operator: "between";
      value: { from: string; to: string };
    };

export interface CatalogCollectionListingSnapshot {
  snapshotVersion: typeof COLLECTION_LISTING_CONTRACT_VERSION;
  state: "live";
  id: string;
  storeId: string;
  type: CollectionType;
  defaultSort: CollectionDefaultSort;
  defaultSortDirection: CollectionDefaultSortDirection;
  publishedAt: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  rulesHash: string;
  rules: readonly CanonicalCollectionRule[];
  listingUpdatedAt: string;
  payloadHash: string;
}

export interface CatalogCollectionListingTombstone {
  snapshotVersion: typeof COLLECTION_LISTING_CONTRACT_VERSION;
  state: "deleted";
  id: string;
  storeId: string;
  deletedAt: string;
  payloadHash: string;
}

export type CatalogCollectionSnapshot =
  CatalogCollectionListingSnapshot | CatalogCollectionListingTombstone;

export type CatalogCollectionPayload =
  | Omit<CatalogCollectionListingSnapshot, "payloadHash">
  | Omit<CatalogCollectionListingTombstone, "payloadHash">;

export const CatalogCollectionActionNames = {
  getListingSnapshot: "getCollectionListingSnapshot",
} as const;

export const CatalogCollectionActions = {
  getListingSnapshot: `catalog.${CatalogCollectionActionNames.getListingSnapshot}`,
} as const;

export const ListingCollectionActionNames = {
  previewRules: "previewCollectionRules",
} as const;

export const ListingCollectionActions = {
  previewRules: `listing.${ListingCollectionActionNames.previewRules}`,
} as const;

export interface GetCollectionListingSnapshotParams {
  contractVersion: typeof COLLECTION_LISTING_CONTRACT_VERSION;
  storeId: string;
  collectionId: string;
}

export type GetCollectionListingSnapshotResult =
  | { ok: true; snapshot: CatalogCollectionSnapshot }
  | {
      ok: false;
      code:
        | "NOT_FOUND"
        | "UNSUPPORTED_COLLECTION_SNAPSHOT_VERSION"
        | "COLLECTION_SNAPSHOT_INVALID"
        | "COLLECTION_SNAPSHOT_UNAVAILABLE";
      message: string;
      retryable: boolean;
    };

export interface PreviewCollectionRulesParams {
  contractVersion: typeof COLLECTION_LISTING_CONTRACT_VERSION;
  storeId: string;
  rules: readonly CanonicalCollectionRule[];
  rulesHash: string;
}

export type PreviewCollectionRulesResult =
  | {
      ok: true;
      count: number;
      rulesHash: string;
      indexObservedAt: string;
    }
  | {
      ok: false;
      code:
        | "INVALID_COLLECTION_RULES"
        | "COLLECTION_RULE_HASH_MISMATCH"
        | "UNSUPPORTED_COLLECTION_PREVIEW_VERSION"
        | "COLLECTION_PREVIEW_TIMEOUT"
        | "COLLECTION_PREVIEW_UNAVAILABLE";
      message: string;
      retryable: boolean;
      field?: string[];
    };

export class CollectionContractValidationError extends Error {
  readonly code = "INVALID_COLLECTION_CONTRACT";

  constructor(
    message: string,
    readonly path: readonly (string | number)[] = [],
  ) {
    super(message);
    this.name = "CollectionContractValidationError";
  }
}

export function encodeCollectionRuleTerm(term: CollectionRuleTerm): string {
  if (term.kind === "tag") {
    if (term.entityType !== "product") {
      invalid("Tag rule terms are valid only for products");
    }
    return JSON.stringify(["v1", "tag", canonicalUuid(term.tagId, ["tagId"])]);
  }
  return JSON.stringify([
    "v1",
    term.kind,
    normalizeCollectionRuleHandleV1(term.sourceHandle),
    normalizeCollectionRuleHandleV1(term.valueHandle),
  ]);
}

export function decodeCollectionRuleTerm(
  entityType: "product" | "variant",
  valueKey: string,
): CollectionRuleTerm {
  let tuple: unknown;
  try {
    tuple = JSON.parse(valueKey);
  } catch {
    invalid("Rule-term key is not valid JSON");
  }
  if (!Array.isArray(tuple) || tuple[0] !== "v1") {
    invalid("Rule-term key has an unsupported version");
  }
  if (tuple[1] === "tag" && tuple.length === 3 && entityType === "product") {
    return {
      entityType,
      kind: "tag",
      tagId: canonicalUuid(tuple[2], [2]),
    };
  }
  if (tuple[1] === "feature" && tuple.length === 4 && entityType === "product") {
    return {
      entityType,
      kind: "feature",
      sourceHandle: normalizeCollectionRuleHandleV1(requiredString(tuple[2], [2])),
      valueHandle: normalizeCollectionRuleHandleV1(requiredString(tuple[3], [3])),
    };
  }
  if (tuple[1] === "option" && tuple.length === 4 && entityType === "variant") {
    return {
      entityType,
      kind: "option",
      sourceHandle: normalizeCollectionRuleHandleV1(requiredString(tuple[2], [2])),
      valueHandle: normalizeCollectionRuleHandleV1(requiredString(tuple[3], [3])),
    };
  }
  invalid("Rule-term key kind is invalid for the entity type");
}

export function canonicalCollectionRuleTermKeys(terms: readonly CollectionRuleTerm[]): string[] {
  return [...new Set(terms.map(encodeCollectionRuleTerm))].sort();
}

const HANDLE_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_PATTERN = /^sha256:v1:[0-9a-f]{64}$/;
const MAX_SAFE_MINOR_AMOUNT = BigInt(Number.MAX_SAFE_INTEGER);
const CURRENCIES = new Set<string>(CURRENCY_CODES);

export function normalizeCollectionRuleHandleV1(raw: string): string {
  if (typeof raw !== "string") {
    throw new CollectionContractValidationError("Handle must be a string");
  }
  const normalized = raw.normalize("NFKC").trim().toLowerCase();
  const length = [...normalized].length;
  if (length < 1 || length > 255 || !HANDLE_PATTERN.test(normalized)) {
    throw new CollectionContractValidationError(
      "Handle must be a 1..255 code point lowercase ASCII slug",
    );
  }
  return normalized;
}

export function normalizeCollectionInstantV1(raw: string): string {
  return canonicalInstant(raw, ["instant"]);
}

export function normalizeCanonicalCollectionRuleV1(input: unknown): CanonicalCollectionRule {
  const rule = strictRecord(input, [], ["field", "operator", "value"]);
  const field = enumValue(rule.field, COLLECTION_RULE_FIELDS, ["field"]);
  const operator = enumValue(rule.operator, COLLECTION_RULE_OPERATORS, ["operator"]);
  const value = rule.value;

  if (field === "category" || field === "tag" || field === "vendor") {
    if (!(operator === "in" || (operator === "all" && field !== "vendor"))) {
      invalid(`Operator ${operator} is not valid for ${field}`, ["operator"]);
    }
    const object = strictRecord(value, ["value"], ["ids"]);
    const ids = canonicalUuidArray(object.ids, ["value", "ids"]);
    return { field, operator: operator as "in" | "all", value: { ids } } as CanonicalCollectionRule;
  }

  if (field === "feature" || field === "option") {
    if (operator !== "in" && operator !== "all") {
      invalid(`Operator ${operator} is not valid for ${field}`, ["operator"]);
    }
    const object = strictRecord(value, ["value"], ["values"]);
    if (!Array.isArray(object.values) || object.values.length === 0) {
      invalid("Rule values must be a non-empty array", ["value", "values"]);
    }
    if (object.values.length > 100) {
      invalid("Rule values exceed the limit of 100", ["value", "values"]);
    }
    const values = object.values.map((item, index) => {
      const pair = strictRecord(item, ["value", "values", index], ["sourceHandle", "valueHandle"]);
      return {
        sourceHandle: normalizeCollectionRuleHandleV1(
          requiredString(pair.sourceHandle, ["value", "values", index, "sourceHandle"]),
        ),
        valueHandle: normalizeCollectionRuleHandleV1(
          requiredString(pair.valueHandle, ["value", "values", index, "valueHandle"]),
        ),
      };
    });
    const canonical = [
      ...new Map(
        values.map((item) => [JSON.stringify([item.sourceHandle, item.valueHandle]), item]),
      ).values(),
    ].sort((left, right) =>
      JSON.stringify([left.sourceHandle, left.valueHandle]).localeCompare(
        JSON.stringify([right.sourceHandle, right.valueHandle]),
      ),
    );
    if (field === "option" && operator === "all") {
      const sourceHandles = canonical.map((item) => item.sourceHandle);
      if (new Set(sourceHandles).size !== sourceHandles.length) {
        invalid("OPTION ALL cannot require multiple values of one sourceHandle", [
          "value",
          "values",
        ]);
      }
    }
    return { field, operator, value: { values: canonical } };
  }

  if (field === "price") {
    if (operator === "between") {
      const object = strictRecord(
        value,
        ["value"],
        ["currencyCode", "minAmountMinor", "maxAmountMinor"],
      );
      const currencyCode = canonicalCurrency(object.currencyCode);
      const minAmountMinor = canonicalMinorAmount(object.minAmountMinor, [
        "value",
        "minAmountMinor",
      ]);
      const maxAmountMinor = canonicalMinorAmount(object.maxAmountMinor, [
        "value",
        "maxAmountMinor",
      ]);
      if (BigInt(minAmountMinor) > BigInt(maxAmountMinor)) {
        invalid("Price range minimum exceeds maximum", ["value"]);
      }
      return {
        field,
        operator,
        value: { currencyCode, minAmountMinor, maxAmountMinor },
      };
    }
    if (!["eq", "gt", "gte", "lt", "lte"].includes(operator)) {
      invalid(`Operator ${operator} is not valid for price`, ["operator"]);
    }
    const object = strictRecord(value, ["value"], ["currencyCode", "amountMinor"]);
    return {
      field,
      operator: operator as "eq" | "gt" | "gte" | "lt" | "lte",
      value: {
        currencyCode: canonicalCurrency(object.currencyCode),
        amountMinor: canonicalMinorAmount(object.amountMinor, ["value", "amountMinor"]),
      },
    };
  }

  if (field === "in_stock") {
    if (operator !== "eq") {
      invalid(`Operator ${operator} is not valid for in_stock`, ["operator"]);
    }
    const object = strictRecord(value, ["value"], ["value"]);
    if (typeof object.value !== "boolean") {
      invalid("Stock rule value must be boolean", ["value", "value"]);
    }
    return { field, operator, value: { value: object.value } };
  }

  if (operator === "between") {
    const object = strictRecord(value, ["value"], ["from", "to"]);
    const from = canonicalInstant(object.from, ["value", "from"]);
    const to = canonicalInstant(object.to, ["value", "to"]);
    if (from > to) invalid("Created-at range start exceeds end", ["value"]);
    return { field: "created_at", operator, value: { from, to } };
  }
  if (!["eq", "gt", "gte", "lt", "lte"].includes(operator)) {
    invalid(`Operator ${operator} is not valid for created_at`, ["operator"]);
  }
  const object = strictRecord(value, ["value"], ["instant"]);
  return {
    field: "created_at",
    operator: operator as "eq" | "gt" | "gte" | "lt" | "lte",
    value: { instant: canonicalInstant(object.instant, ["value", "instant"]) },
  };
}

export function normalizeCanonicalCollectionRulesV1(
  input: readonly unknown[],
): CanonicalCollectionRule[] {
  if (!Array.isArray(input)) invalid("Rules must be an array");
  if (input.length > 32) invalid("Collection rules exceed the limit of 32");
  const rules = input.map(normalizeCanonicalCollectionRuleV1);
  const encodings = rules.map(serializeCanonicalCollectionRuleV1);
  if (new Set(encodings).size !== encodings.length) {
    invalid("Collection contains a duplicate canonical rule");
  }
  const totalSetValues = rules.reduce((total, rule) => {
    if ("ids" in rule.value) return total + rule.value.ids.length;
    if ("values" in rule.value) return total + rule.value.values.length;
    return total;
  }, 0);
  if (totalSetValues > 256) {
    invalid("Collection rules exceed the total set-value limit of 256");
  }
  const canonicalSize = Buffer.byteLength(serializeCanonicalCollectionRulesV1(rules), "utf8");
  if (canonicalSize > 65_536) {
    invalid("Canonical collection rules exceed 64 KiB");
  }
  return rules;
}

export function serializeCanonicalCollectionRuleV1(input: CanonicalCollectionRule): string {
  const rule = normalizeCanonicalCollectionRuleV1(input);
  return JSON.stringify([rule.field, rule.operator, canonicalRuleValue(rule)]);
}

export function serializeCanonicalCollectionRulesV1(
  input: readonly CanonicalCollectionRule[],
): string {
  const rules = input.map(normalizeCanonicalCollectionRuleV1);
  const tuples = rules
    .map((rule) => JSON.parse(serializeCanonicalCollectionRuleV1(rule)))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return JSON.stringify(tuples);
}

export function hashCanonicalCollectionRulesV1(rules: readonly CanonicalCollectionRule[]): string {
  return versionedHash(serializeCanonicalCollectionRulesV1(rules));
}

export function serializeCanonicalJsonV1(value: unknown): string {
  return JSON.stringify(sortCanonicalJson(value));
}

export function hashCanonicalJsonV1(value: unknown): string {
  return versionedHash(serializeCanonicalJsonV1(value));
}

export function serializeCollectionListingPayloadV1(input: CatalogCollectionPayload): string {
  if (input.snapshotVersion !== COLLECTION_LISTING_CONTRACT_VERSION) {
    invalid("Unsupported collection listing contract version", ["snapshotVersion"]);
  }
  if (input.state === "deleted") {
    return JSON.stringify([
      input.snapshotVersion,
      "deleted",
      canonicalUuid(input.id, ["id"]),
      canonicalUuid(input.storeId, ["storeId"]),
      canonicalInstant(input.deletedAt, ["deletedAt"]),
    ]);
  }
  const rules = normalizeCanonicalCollectionRulesV1(input.rules);
  return JSON.stringify([
    input.snapshotVersion,
    "live",
    canonicalUuid(input.id, ["id"]),
    canonicalUuid(input.storeId, ["storeId"]),
    input.type,
    input.defaultSort,
    input.defaultSortDirection,
    nullableInstant(input.publishedAt, ["publishedAt"]),
    nullableInstant(input.effectiveFrom, ["effectiveFrom"]),
    nullableInstant(input.effectiveTo, ["effectiveTo"]),
    input.rulesHash,
    JSON.parse(serializeCanonicalCollectionRulesV1(rules)),
    canonicalInstant(input.listingUpdatedAt, ["listingUpdatedAt"]),
  ]);
}

export function hashCollectionListingPayloadV1(input: CatalogCollectionPayload): string {
  return versionedHash(serializeCollectionListingPayloadV1(input));
}

export function verifyCollectionListingSnapshotV1(input: CatalogCollectionSnapshot): void {
  assertHash(input.payloadHash, ["payloadHash"]);
  if (input.state === "live") {
    assertHash(input.rulesHash, ["rulesHash"]);
    constantTimeHashEqual(input.rulesHash, hashCanonicalCollectionRulesV1(input.rules), [
      "rulesHash",
    ]);
  }
  const { payloadHash, ...payload } = input;
  constantTimeHashEqual(payloadHash, hashCollectionListingPayloadV1(payload), ["payloadHash"]);
}

function canonicalRuleValue(rule: CanonicalCollectionRule): unknown {
  if ("ids" in rule.value) return [rule.value.ids];
  if ("values" in rule.value) {
    return [rule.value.values.map((item) => [item.sourceHandle, item.valueHandle])];
  }
  if (rule.field === "price") {
    return rule.operator === "between"
      ? [rule.value.currencyCode, rule.value.minAmountMinor, rule.value.maxAmountMinor]
      : [rule.value.currencyCode, rule.value.amountMinor];
  }
  if (rule.field === "in_stock") return [rule.value.value];
  return rule.operator === "between" ? [rule.value.from, rule.value.to] : [rule.value.instant];
}

function sortCanonicalJson(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) invalid("Canonical JSON number must be finite");
    return value;
  }
  if (Array.isArray(value)) return value.map(sortCanonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortCanonicalJson(item)]),
    );
  }
  invalid("Value is not canonical JSON");
}

function canonicalUuidArray(value: unknown, path: readonly (string | number)[]) {
  if (!Array.isArray(value) || value.length === 0) {
    invalid("Rule IDs must be a non-empty array", path);
  }
  if (value.length > 100) invalid("Rule IDs exceed the limit of 100", path);
  return [...new Set(value.map((item, index) => canonicalUuid(item, [...path, index])))].sort();
}

function canonicalUuid(value: unknown, path: readonly (string | number)[]): string {
  const text = requiredString(value, path).toLowerCase();
  if (!UUID_PATTERN.test(text)) invalid("Value must be a canonical UUID", path);
  return text;
}

function canonicalCurrency(value: unknown): string {
  const currency = requiredString(value, ["value", "currencyCode"]).trim().toUpperCase();
  if (!CURRENCIES.has(currency)) {
    invalid("Currency code is not supported", ["value", "currencyCode"]);
  }
  return currency;
}

function canonicalMinorAmount(value: unknown, path: readonly (string | number)[]): string {
  const text = requiredString(value, path);
  if (!/^(0|[1-9]\d*)$/.test(text)) {
    invalid("Minor amount must be a canonical non-negative integer string", path);
  }
  if (BigInt(text) > MAX_SAFE_MINOR_AMOUNT) {
    invalid("Minor amount exceeds the safe integer range", path);
  }
  return text;
}

function canonicalInstant(value: unknown, path: readonly (string | number)[]): string {
  const text = requiredString(value, path);
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(text)) {
    invalid("Timestamp must contain a timezone offset", path);
  }
  const timestamp = new Date(text);
  if (Number.isNaN(timestamp.valueOf())) invalid("Timestamp is invalid", path);
  return timestamp.toISOString();
}

function nullableInstant(value: string | null, path: readonly (string | number)[]): string | null {
  return value === null ? null : canonicalInstant(value, path);
}

function strictRecord(
  value: unknown,
  path: readonly (string | number)[],
  keys: readonly string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid("Value must be an object", path);
  }
  const record = value as Record<string, unknown>;
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    invalid(`Object must contain exactly: ${keys.join(", ")}`, path);
  }
  return record;
}

function requiredString(value: unknown, path: readonly (string | number)[]): string {
  if (typeof value !== "string") invalid("Value must be a string", path);
  return value;
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  values: T,
  path: readonly (string | number)[],
): T[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    invalid(`Value must be one of: ${values.join(", ")}`, path);
  }
  return value as T[number];
}

function versionedHash(serialized: string): string {
  return `sha256:${COLLECTION_RULE_HASH_VERSION}:${createHash("sha256")
    .update(serialized, "utf8")
    .digest("hex")}`;
}

function assertHash(value: string, path: readonly (string | number)[]): void {
  if (!HASH_PATTERN.test(value)) invalid("Hash has an invalid wire format", path);
}

function constantTimeHashEqual(
  actual: string,
  expected: string,
  path: readonly (string | number)[],
): void {
  const actualBytes = Buffer.from(actual, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    invalid("Hash verification failed", path);
  }
}

function invalid(message: string, path: readonly (string | number)[] = []): never {
  throw new CollectionContractValidationError(message, path);
}
