import { createHash } from "node:crypto";
import {
  COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH,
  CommerceFunctionJsonError,
  canonicalizeCommerceFunctionJson,
  type CommerceFunctionJsonValue,
} from "@shopana/broker-types";
import { FunctionEnvelopeError } from "./errors.js";

export interface EnvelopeMeasurement {
  readonly bytes: number;
  readonly digest: string;
}

export function measureEnvelope(
  value: unknown,
  maxBytes: number,
  maxDepth: number,
  kind: "input" | "output",
): EnvelopeMeasurement {
  const canonical = canonicalizeEnvelope(value, maxDepth, kind);
  const serialized = JSON.stringify(canonical);
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > maxBytes) {
    throw new FunctionEnvelopeError(
      `FUNCTION_${kind.toUpperCase()}_SIZE_LIMIT`,
      `Commerce Function ${kind} exceeds ${maxBytes} bytes`,
    );
  }
  return {
    bytes,
    digest: createHash("sha256").update(serialized).digest("hex"),
  };
}

export function planRevision(value: unknown): string {
  const canonical = canonicalizeEnvelope(value, COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH, "input");
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

export function envelopeDigest(
  value: unknown,
  maxBytes: number,
  maxDepth: number,
  kind: "input" | "output",
): EnvelopeMeasurement {
  const canonical = canonicalizeEnvelope(value, maxDepth, kind);
  const serialized = JSON.stringify(canonical);
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > maxBytes) {
    throw new FunctionEnvelopeError(
      `FUNCTION_${kind.toUpperCase()}_SIZE_LIMIT`,
      `Commerce Function ${kind} exceeds ${maxBytes} bytes`,
    );
  }
  return {
    bytes,
    digest: createHash("sha256").update(serialized).digest("hex"),
  };
}

export function canonicalizeEnvelope(
  value: unknown,
  maxDepth: number,
  kind: "input" | "output",
): CommerceFunctionJsonValue {
  try {
    return canonicalizeCommerceFunctionJson(value, maxDepth);
  } catch (error) {
    if (error instanceof CommerceFunctionJsonError) {
      throw new FunctionEnvelopeError(
        `FUNCTION_${kind.toUpperCase()}_JSON_VALUE_REQUIRED`,
        `Commerce Function ${kind} must contain only JSON values`,
      );
    }
    throw error;
  }
}

export function cloneAndFreeze<T>(value: T): Readonly<T> {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value as Record<string, unknown>)) {
      deepFreeze(entry);
    }
  }
  return value;
}
