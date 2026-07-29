import {
  COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH,
  COMMERCE_FUNCTION_MAX_INVOCATION_BYTES,
  COMMERCE_FUNCTION_MAX_OUTPUT_BYTES,
} from "@shopana/broker-types";
import type { FunctionTargetDefinition } from "./contracts.js";
import { FunctionTargetNotFoundError } from "./errors.js";

export class FunctionTargetRegistry {
  private readonly definitions = new Map<string, FunctionTargetDefinition>();

  constructor(definitions: readonly FunctionTargetDefinition[] = []) {
    for (const definition of definitions) {
      this.register(definition);
    }
  }

  register(definition: FunctionTargetDefinition): void {
    assertDefinition(definition);
    if (this.definitions.has(definition.target)) {
      throw new Error(
        `Commerce Function target "${definition.target}" is already registered`,
      );
    }
    this.definitions.set(
      definition.target,
      deepFreeze(structuredClone(definition)),
    );
  }

  get(target: string): FunctionTargetDefinition {
    const definition = this.definitions.get(target);
    if (!definition) {
      throw new FunctionTargetNotFoundError(target);
    }
    return definition;
  }

  has(target: string): boolean {
    return this.definitions.has(target);
  }

  list(): readonly FunctionTargetDefinition[] {
    return Object.freeze([...this.definitions.values()]);
  }
}

function assertDefinition(definition: FunctionTargetDefinition): void {
  if (!definition.target.trim() || !definition.owningService.trim()) {
    throw new Error("Function target and owning service are required");
  }
  if (
    !Number.isSafeInteger(definition.defaultTimeoutMs) ||
    definition.defaultTimeoutMs <= 0 ||
    !Number.isSafeInteger(definition.concurrencyLimit) ||
    definition.concurrencyLimit <= 0 ||
    !Number.isSafeInteger(definition.maxInputBytes) ||
    definition.maxInputBytes <= 0 ||
    definition.maxInputBytes >
      COMMERCE_FUNCTION_MAX_INVOCATION_BYTES ||
    !Number.isSafeInteger(definition.maxOutputBytes) ||
    definition.maxOutputBytes <= 0 ||
    definition.maxOutputBytes >
      COMMERCE_FUNCTION_MAX_OUTPUT_BYTES ||
    (definition.maxEnvelopeDepth !== undefined &&
      (!Number.isSafeInteger(definition.maxEnvelopeDepth) ||
        definition.maxEnvelopeDepth <= 0 ||
        definition.maxEnvelopeDepth >
          COMMERCE_FUNCTION_MAX_ENVELOPE_DEPTH))
  ) {
    throw new Error(`Invalid execution policy for "${definition.target}"`);
  }
  const ids = new Set<string>();
  for (const implementation of definition.nativeImplementations ?? []) {
    if (
      !implementation.implementationId.trim() ||
      !implementation.action.includes(".")
    ) {
      throw new Error(`Invalid native route for "${definition.target}"`);
    }
    if (ids.has(implementation.implementationId)) {
      throw new Error(
        `Duplicate native implementation "${implementation.implementationId}"`,
      );
    }
    ids.add(implementation.implementationId);
  }
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(
      value as Record<string, unknown>,
    )) {
      deepFreeze(entry);
    }
  }
  return value;
}
