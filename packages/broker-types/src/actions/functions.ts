/**
 * Infrastructure-only contracts used by commerce function broker actions.
 * Target-specific inputs and outputs intentionally remain opaque.
 */

export const COMMERCE_FUNCTION_CAPABILITY = "commerce.function";
export const COMMERCE_FUNCTION_MAX_INVOCATION_BYTES = 1_048_576;
export const COMMERCE_FUNCTION_MAX_OUTPUT_BYTES = 1_048_576;
export const COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH = 64;

export type CommerceFunctionJsonPrimitive =
  | null
  | boolean
  | number
  | string;
export type CommerceFunctionJsonValue =
  | CommerceFunctionJsonPrimitive
  | readonly CommerceFunctionJsonValue[]
  | { readonly [key: string]: CommerceFunctionJsonValue };

export interface CommerceFunctionInvocation<
  TInput extends CommerceFunctionJsonValue = CommerceFunctionJsonValue,
> {
  target: string;
  executionId: string;
  functionBindingId: string;
  deadlineAt: string;
  correlationId?: string;
  configurationSnapshot: CommerceFunctionJsonValue;
  input: TInput;
}

export class CommerceFunctionJsonError extends Error {
  readonly code = "COMMERCE_FUNCTION_JSON_VALUE_REQUIRED";

  constructor(readonly path: string) {
    super(`Commerce Function envelope contains a non-JSON value at ${path}`);
    this.name = "CommerceFunctionJsonError";
  }
}

export function canonicalizeCommerceFunctionJson(
  value: unknown,
  maxDepth = COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH,
): CommerceFunctionJsonValue {
  if (!Number.isSafeInteger(maxDepth) || maxDepth <= 0) {
    throw new Error("Commerce Function JSON maxDepth must be positive");
  }
  return canonicalizeJsonValue(value, maxDepth, "$", new Set());
}

function canonicalizeJsonValue(
  value: unknown,
  remainingDepth: number,
  path: string,
  ancestors: Set<object>,
): CommerceFunctionJsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CommerceFunctionJsonError(path);
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object" || remainingDepth <= 0) {
    throw new CommerceFunctionJsonError(path);
  }
  if (ancestors.has(value)) {
    throw new CommerceFunctionJsonError(path);
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      assertJsonArrayShape(value, path);
      return Object.freeze(
        value.map((entry, index) =>
          canonicalizeJsonValue(
            entry,
            remainingDepth - 1,
            `${path}[${index}]`,
            ancestors,
          ),
        ),
      );
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new CommerceFunctionJsonError(path);
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (
      keys.some(
        (key) =>
          typeof key !== "string" ||
          !descriptors[key]?.enumerable ||
          !("value" in descriptors[key]!),
      )
    ) {
      throw new CommerceFunctionJsonError(path);
    }
    const result: Record<string, CommerceFunctionJsonValue> = {};
    for (const key of (keys as string[]).sort(compareJsonKeys)) {
      Object.defineProperty(result, key, {
        value: canonicalizeJsonValue(
          descriptors[key]!.value,
          remainingDepth - 1,
          `${path}.${key}`,
          ancestors,
        ),
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    return Object.freeze(result);
  } finally {
    ancestors.delete(value);
  }
}

function compareJsonKeys(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertJsonArrayShape(value: unknown[], path: string): void {
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some(
      (key) =>
        key !== "length" &&
        (typeof key !== "string" ||
          !/^(0|[1-9]\d*)$/.test(key) ||
          Number(key) >= value.length ||
          !descriptors[key]?.enumerable ||
          !("value" in descriptors[key]!)),
    ) ||
    keys.length !== value.length + 1
  ) {
    throw new CommerceFunctionJsonError(path);
  }
}
