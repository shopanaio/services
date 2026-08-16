import type {
  SegmentAttributeCatalogDescriptor,
  SegmentAttributeDescriptor,
  SegmentFunctionDescriptor,
  SegmentRegistryDescriptor,
} from "./types.js";

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/u;

export class SegmentRegistry {
  private readonly entries: ReadonlyMap<string, SegmentRegistryDescriptor>;

  constructor(descriptors: readonly SegmentRegistryDescriptor[]) {
    const map = new Map<string, SegmentRegistryDescriptor>();
    for (const descriptor of descriptors) {
      if (!IDENTIFIER.test(descriptor.name)) {
        throw new Error(`Invalid segment registry identifier: ${descriptor.name}`);
      }
      if (map.has(descriptor.name)) throw new Error(`Duplicate segment registry entry: ${descriptor.name}`);
      if (descriptor.kind === "FUNCTION") {
        const names = new Set<string>();
        for (const parameter of descriptor.parameters) {
          if (!IDENTIFIER.test(parameter.name) || names.has(parameter.name)) {
            throw new Error(`Invalid or duplicate parameter ${descriptor.name}.${parameter.name}`);
          }
          names.add(parameter.name);
        }
      }
      map.set(descriptor.name, deepFreeze(descriptor));
    }
    this.entries = map;
  }

  get(name: string): SegmentRegistryDescriptor | undefined {
    return this.entries.get(asciiLower(name));
  }

  attribute(name: string): SegmentAttributeDescriptor | undefined {
    const descriptor = this.get(name);
    return descriptor && descriptor.kind !== "FUNCTION" ? descriptor : undefined;
  }

  function(name: string): SegmentFunctionDescriptor | undefined {
    const descriptor = this.get(name);
    return descriptor?.kind === "FUNCTION" ? descriptor : undefined;
  }

  values(): readonly SegmentRegistryDescriptor[] {
    return [...this.entries.values()];
  }

  catalog(): readonly SegmentAttributeCatalogDescriptor[] {
    return this.values().map((descriptor) => {
      const common = {
        name: descriptor.name,
        presentationKey: descriptor.presentationKey,
        kind: descriptor.kind,
        availability: descriptor.availability,
        unavailabilityReason: descriptor.unavailabilityReason ?? null,
      } as const;
      if (descriptor.kind === "FUNCTION") {
        return {
          ...common,
          valueType: "Boolean",
          operators: descriptor.operators,
          enumValues: [],
          parameters: descriptor.parameters.map((parameter) => ({
            name: parameter.name,
            presentationKey: parameter.presentationKey,
            valueType: parameter.type,
            operators: parameter.operators,
            enumValues: parameter.enumValues ?? [],
            aggregate: parameter.aggregate,
            nullable: parameter.nullable,
          })),
        };
      }
      return {
        ...common,
        valueType: descriptor.type,
        operators: descriptor.operators,
        enumValues: descriptor.enumValues ?? [],
        parameters: [],
      };
    });
  }
}

export function asciiLower(value: string): string {
  return value.replace(/[A-Z]/gu, (character) => character.toLowerCase());
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
