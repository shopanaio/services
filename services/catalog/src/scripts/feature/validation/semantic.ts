import type { UserError } from "../../../kernel/BaseScript.js";
import type { ValidatedFeatureInput, ValidatedValueInput } from "./schema.js";

/** Converts index to string for use as Map key */
export function indexToKey(index: number[]): string {
  return index.join(",");
}

/** Returns parent index or null for root */
export function getParentIndex(index: number[]): number[] | null {
  return index.length > 1 ? index.slice(0, -1) : null;
}

/** Returns position within parent */
export function getPosition(index: number[]): number {
  return index[index.length - 1];
}

interface SemanticContext {
  readonly indexKeyToArrayIdx: Map<string, number>;
  readonly indexKeyToItem: Map<string, ValidatedFeatureInput>;
  readonly seenFeatureIds: Set<string>;
  readonly seenFeatureSlugs: Set<string>;
  readonly seenValueIds: Set<string>;
  readonly positionsByParentKey: Map<string, Set<number>>;
}

/**
 * Validates business rules at input level (no DB).
 * Returns all found errors.
 */
export function validateSemantic(features: ValidatedFeatureInput[]): UserError[] {
  const errors: UserError[] = [];
  const ctx: SemanticContext = {
    indexKeyToArrayIdx: new Map(),
    indexKeyToItem: new Map(),
    seenFeatureIds: new Set(),
    seenFeatureSlugs: new Set(),
    seenValueIds: new Set(),
    positionsByParentKey: new Map(),
  };

  // First pass: build maps and check uniqueness
  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const key = indexToKey(f.index);
    const path = (field: string) => ["features", String(i), field];

    // Index uniqueness
    if (ctx.indexKeyToItem.has(key)) {
      errors.push({
        message: `Duplicate index [${f.index.join(", ")}]`,
        field: path("index"),
        code: "DUPLICATE_INDEX",
      });
    } else {
      ctx.indexKeyToArrayIdx.set(key, i);
      ctx.indexKeyToItem.set(key, f);
    }

    // ID uniqueness
    if (f.id) {
      if (ctx.seenFeatureIds.has(f.id)) {
        errors.push({
          message: `Duplicate feature id "${f.id}"`,
          field: path("id"),
          code: "DUPLICATE_ID",
        });
      } else {
        ctx.seenFeatureIds.add(f.id);
      }
    }

    // Feature slug uniqueness per product
    if (ctx.seenFeatureSlugs.has(f.slug)) {
      errors.push({
        message: `Duplicate feature slug "${f.slug}"`,
        field: path("slug"),
        code: "DUPLICATE_SLUG",
      });
    } else {
      ctx.seenFeatureSlugs.add(f.slug);
    }

    // Position uniqueness within parent
    const parentIndex = getParentIndex(f.index);
    const parentKey = parentIndex ? indexToKey(parentIndex) : "__root__";
    const position = getPosition(f.index);
    const positions = ctx.positionsByParentKey.get(parentKey) ?? new Set();
    if (positions.has(position)) {
      errors.push({
        message: `Duplicate position ${position} under parent [${parentIndex?.join(", ") ?? "root"}]`,
        field: path("index"),
        code: "DUPLICATE_POSITION",
      });
    } else {
      positions.add(position);
      ctx.positionsByParentKey.set(parentKey, positions);
    }

    // Groups only at root level (length === 1)
    if (f.isGroup && f.index.length !== 1) {
      errors.push({
        message: "Groups must be root items (index.length === 1)",
        field: path("index"),
        code: "GROUP_NOT_ROOT",
      });
    }

    // Groups cannot have values
    if (f.isGroup && f.values && f.values.length > 0) {
      errors.push({
        message: "Groups cannot have values",
        field: path("values"),
        code: "GROUP_HAS_VALUES",
      });
    }

    // Validate values
    if (f.values) {
      validateValues(f.values, i, ctx.seenValueIds, errors);
    }
  }

  // Second pass: check parent references
  for (const [key, item] of ctx.indexKeyToItem) {
    const parentIndex = getParentIndex(item.index);
    if (parentIndex === null) continue;

    const arrayIdx = ctx.indexKeyToArrayIdx.get(key)!;
    const path = (field: string) => ["features", String(arrayIdx), field];
    const parentKey = indexToKey(parentIndex);

    const parentItem = ctx.indexKeyToItem.get(parentKey);
    if (!parentItem) {
      errors.push({
        message: `Parent [${parentIndex.join(", ")}] not found in features list`,
        field: path("index"),
        code: "PARENT_NOT_FOUND",
      });
      continue;
    }

    if (!parentItem.isGroup) {
      errors.push({
        message: `Parent [${parentIndex.join(", ")}] must be a group`,
        field: path("index"),
        code: "PARENT_NOT_GROUP",
      });
    }
  }

  return errors;
}

function validateValues(
  values: ValidatedValueInput[],
  featureArrayIdx: number,
  globalValueIds: Set<string>,
  errors: UserError[]
): void {
  const localIndexes = new Set<number>();
  const localSlugs = new Set<string>();

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const path = (field: string) => [
      "features",
      String(featureArrayIdx),
      "values",
      String(i),
      field,
    ];

    // Value ID uniqueness globally
    if (v.id) {
      if (globalValueIds.has(v.id)) {
        errors.push({
          message: `Duplicate value id "${v.id}"`,
          field: path("id"),
          code: "DUPLICATE_ID",
        });
      } else {
        globalValueIds.add(v.id);
      }
    }

    // Index uniqueness within feature
    if (localIndexes.has(v.index)) {
      errors.push({
        message: `Duplicate value index ${v.index}`,
        field: path("index"),
        code: "DUPLICATE_INDEX",
      });
    } else {
      localIndexes.add(v.index);
    }

    // Slug uniqueness within feature
    if (localSlugs.has(v.slug)) {
      errors.push({
        message: `Duplicate value slug "${v.slug}"`,
        field: path("slug"),
        code: "DUPLICATE_SLUG",
      });
    } else {
      localSlugs.add(v.slug);
    }
  }
}
