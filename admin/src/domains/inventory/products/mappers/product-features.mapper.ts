import { slugify } from "transliteration/dist/node/src/node/index.js";
import type {
  ApiGenericUserError,
  ApiProductFeature,
  ApiProductFeatureSyncItemInput,
  ApiProductFeaturesSyncInput,
} from "@/graphql/types";
import type {
  AttributeEditorRow,
  AttributeEditorValue,
} from "../modals/edit-attributes-modal/types";

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

type UserErrorField = Array<string | number>;

export interface ProductFeaturesSyncDraft {
  input: ApiProductFeaturesSyncInput;
  featureRowsByInputIndex: AttributeEditorRow[];
  valuesByInputPath: Record<string, AttributeEditorValue>;
}

function createTemporaryId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${uuid}`;
}

export function createTemporaryFeatureId(): string {
  return createTemporaryId("tmp-feature");
}

export function createTemporaryValueId(): string {
  return createTemporaryId("tmp-value");
}

function compareIndex(left: number[], right: number[]): number {
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i += 1) {
    const leftValue = left[i] ?? -1;
    const rightValue = right[i] ?? -1;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return left.length - right.length;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isValidFeatureIndex(index: number[]): boolean {
  return (
    (index.length === 1 || index.length === 2) &&
    index.every(isNonNegativeInteger)
  );
}

function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

function makeUserError(
  message: string,
  field?: UserErrorField,
  code = "VALIDATION_ERROR",
): ApiGenericUserError {
  return {
    code,
    field: field?.map(String),
    message,
  };
}

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizeSlug(value: string, fallback: string): string {
  const fallbackSlug =
    fallback
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";

  const slug =
    slugify(value)
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || fallbackSlug;

  if (isValidSlug(slug)) {
    return slug;
  }

  return isValidSlug(fallbackSlug) ? fallbackSlug : "item";
}

export function toFeatureSlug(name: string, fallback: string): string {
  return normalizeSlug(name, fallback);
}

function toValueSlug(name: string, fallback: string): string {
  return normalizeSlug(name, fallback);
}

export function toUniqueSlug(slug: string, used: Set<string>): string {
  const base = isValidSlug(slug) ? slug : "item";
  let candidate = base;
  let suffix = 2;

  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  used.add(candidate);
  return candidate;
}

function sortedRows(rows: AttributeEditorRow[]): AttributeEditorRow[] {
  return [...rows].sort((left, right) => {
    if (left.sortIndex !== right.sortIndex) {
      return left.sortIndex - right.sortIndex;
    }

    return left.id.localeCompare(right.id);
  });
}

function sortedValues(values: AttributeEditorValue[]): AttributeEditorValue[] {
  return [...values].sort((left, right) => {
    if (left.sortIndex !== right.sortIndex) {
      return left.sortIndex - right.sortIndex;
    }

    return left.id.localeCompare(right.id);
  });
}

function getRowsInInputOrder(rows: AttributeEditorRow[]): AttributeEditorRow[] {
  const rootRows = sortedRows(rows.filter((row) => row.parentId === null));
  const result: AttributeEditorRow[] = [];

  for (const rootRow of rootRows) {
    result.push(rootRow);

    if (rootRow.type !== "group") {
      continue;
    }

    result.push(
      ...sortedRows(
        rows.filter(
          (row) => row.parentId === rootRow.id && row.type === "attribute",
        ),
      ),
    );
  }

  for (const row of rows) {
    if (!result.some((orderedRow) => orderedRow.id === row.id)) {
      result.push(row);
    }
  }

  return result;
}

function getRowInputIndexMap(rows: AttributeEditorRow[]): Map<string, number> {
  return new Map(
    getRowsInInputOrder(rows).map((row, index) => [row.id, index]),
  );
}

export function apiProductFeaturesToAttributeEditorRows(
  features: ApiProductFeature[],
): AttributeEditorRow[] {
  const sortedFeatures = [...features].sort((left, right) =>
    compareIndex(left.index, right.index),
  );
  const groupIdByIndex = new Map<string, string>();
  const rows: AttributeEditorRow[] = [];

  for (const feature of sortedFeatures) {
    if (feature.isGroup && feature.index.length === 1) {
      groupIdByIndex.set(feature.index.join("."), feature.id);
    }
  }

  for (const feature of sortedFeatures) {
    if (!isValidFeatureIndex(feature.index)) {
      continue;
    }

    if (feature.isGroup && feature.index.length !== 1) {
      continue;
    }

    if (!feature.isGroup && feature.index.length === 2) {
      const parentId = groupIdByIndex.get(feature.index.slice(0, -1).join("."));

      if (!parentId) {
        continue;
      }

      rows.push({
        id: feature.id,
        apiId: feature.id,
        apiType: "attribute",
        type: "attribute",
        name: feature.name,
        slug: feature.slug,
        parentId,
        sortIndex: feature.index[1],
        level: 1,
        values: sortedValues(
          feature.values.map((value) => ({
            id: value.id,
            apiId: value.id,
            name: value.name,
            slug: value.slug,
            sortIndex: value.index,
          })),
        ),
      });
      continue;
    }

    rows.push({
      id: feature.id,
      apiId: feature.id,
      apiType: feature.isGroup ? "group" : "attribute",
      type: feature.isGroup ? "group" : "attribute",
      name: feature.name,
      slug: feature.slug,
      parentId: null,
      sortIndex: feature.index[0],
      level: 0,
      values: feature.isGroup
        ? []
        : sortedValues(
            feature.values.map((value) => ({
              id: value.id,
              apiId: value.id,
              name: value.name,
              slug: value.slug,
              sortIndex: value.index,
            })),
          ),
    });
  }

  return rows;
}

export function getProductFeatureEditorLoadErrors(
  features: ApiProductFeature[],
): ApiGenericUserError[] {
  const errors: ApiGenericUserError[] = [];
  const rootGroupIndexKeys = new Set(
    features
      .filter((feature) => feature.isGroup && feature.index.length === 1)
      .map((feature) => feature.index.join(".")),
  );

  features.forEach((feature, featureIndex) => {
    if (!isValidFeatureIndex(feature.index)) {
      errors.push(
        makeUserError(
          `Feature "${feature.name}" has an unsupported tree index.`,
          ["features", featureIndex, "index"],
        ),
      );
      return;
    }

    if (feature.isGroup && feature.index.length !== 1) {
      errors.push(
        makeUserError(
          `Group "${feature.name}" is nested and cannot be edited safely.`,
          ["features", featureIndex, "index"],
        ),
      );
      return;
    }

    if (!feature.isGroup && feature.index.length === 2) {
      const parentIndexKey = feature.index.slice(0, -1).join(".");

      if (!rootGroupIndexKeys.has(parentIndexKey)) {
        errors.push(
          makeUserError(
            `Attribute "${feature.name}" has no matching parent group and cannot be edited safely.`,
            ["features", featureIndex, "index"],
          ),
        );
      }
    }
  });

  return errors;
}

export function parseAttributeValuesText(input: {
  text: string;
  existingValues: AttributeEditorValue[];
}): AttributeEditorValue[] {
  const parsedNames = input.text
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const existingValues = sortedValues(input.existingValues);
  const usedExistingIds = new Set<string>();
  const existingByName = new Map<string, AttributeEditorValue[]>();

  for (const value of existingValues) {
    const normalized = normalizeName(value.name);
    const matches = existingByName.get(normalized) ?? [];
    matches.push(value);
    existingByName.set(normalized, matches);
  }

  const usedSlugs = new Set<string>();

  return parsedNames.map((name, index) => {
    const normalizedName = normalizeName(name);
    const exactMatch = existingByName
      .get(normalizedName)
      ?.find((value) => !usedExistingIds.has(value.id));
    const sameIndexValue = existingValues[index];
    const matchedValue =
      exactMatch ??
      (sameIndexValue && !usedExistingIds.has(sameIndexValue.id)
        ? sameIndexValue
        : undefined);

    if (matchedValue) {
      usedExistingIds.add(matchedValue.id);
    }

    const slug = toUniqueSlug(toValueSlug(name, `value-${index + 1}`), usedSlugs);

    return {
      id: matchedValue?.id ?? createTemporaryValueId(),
      apiId: matchedValue?.apiId,
      name,
      slug,
      sortIndex: index,
    };
  });
}

function createFeatureSyncItem(input: {
  row: AttributeEditorRow;
  index: number[];
  inputIndex: number;
  usedFeatureSlugs: Set<string>;
}): ApiProductFeatureSyncItemInput {
  const slug = toUniqueSlug(
    toFeatureSlug(input.row.name, `feature-${input.inputIndex + 1}`),
    input.usedFeatureSlugs,
  );
  const item: ApiProductFeatureSyncItemInput = {
    index: input.index,
    isGroup: input.row.type === "group",
    name: input.row.name.trim(),
    slug,
  };

  if (input.row.apiId) {
    item.id = input.row.apiId;
  }

  if (input.row.type === "attribute") {
    const usedValueSlugs = new Set<string>();
    item.values = sortedValues(input.row.values).map((value, valueIndex) => {
      const valueInput = {
        index: valueIndex,
        name: value.name.trim(),
        slug: toUniqueSlug(
          toValueSlug(value.name, `value-${valueIndex + 1}`),
          usedValueSlugs,
        ),
      };

      if (value.apiId) {
        return {
          ...valueInput,
          id: value.apiId,
        };
      }

      return valueInput;
    });
  }

  return item;
}

export function buildProductFeaturesSyncDraft(input: {
  productId: string;
  rows: AttributeEditorRow[];
}): ProductFeaturesSyncDraft {
  const features: ApiProductFeatureSyncItemInput[] = [];
  const featureRowsByInputIndex: AttributeEditorRow[] = [];
  const valuesByInputPath: Record<string, AttributeEditorValue> = {};
  const usedFeatureSlugs = new Set<string>();
  const rootRows = sortedRows(
    input.rows.filter(
      (row) =>
        row.parentId === null &&
        (row.type === "group" || row.type === "attribute"),
    ),
  );

  rootRows.forEach((rootRow, rootIndex) => {
    const inputIndex = features.length;
    const item = createFeatureSyncItem({
      row: rootRow,
      index: [rootIndex],
      inputIndex,
      usedFeatureSlugs,
    });
    features.push(item);
    featureRowsByInputIndex.push(rootRow);

    if (rootRow.type !== "group") {
      sortedValues(rootRow.values).forEach((value, valueIndex) => {
        valuesByInputPath[`features.${inputIndex}.values.${valueIndex}`] = value;
      });
      return;
    }

    const childRows = sortedRows(
      input.rows.filter(
        (row) => row.parentId === rootRow.id && row.type === "attribute",
      ),
    );

    childRows.forEach((childRow, childIndex) => {
      const childInputIndex = features.length;
      const childItem = createFeatureSyncItem({
        row: childRow,
        index: [rootIndex, childIndex],
        inputIndex: childInputIndex,
        usedFeatureSlugs,
      });
      features.push(childItem);
      featureRowsByInputIndex.push(childRow);

      sortedValues(childRow.values).forEach((value, valueIndex) => {
        valuesByInputPath[
          `features.${childInputIndex}.values.${valueIndex}`
        ] = value;
      });
    });
  });

  return {
    input: {
      productId: input.productId,
      features,
    },
    featureRowsByInputIndex,
    valuesByInputPath,
  };
}

export function attributeEditorRowsToProductFeaturesSyncInput(input: {
  productId: string;
  rows: AttributeEditorRow[];
}): ApiProductFeaturesSyncInput {
  return buildProductFeaturesSyncDraft(input).input;
}

export function validateAttributeEditorRows(input: {
  productId: string;
  rows: AttributeEditorRow[];
}): ApiGenericUserError[] {
  const errors: ApiGenericUserError[] = [];
  const rowIndexById = getRowInputIndexMap(input.rows);
  const featureRowIds = new Set<string>();
  const featureApiIds = new Set<string>();
  const valueIds = new Set<string>();
  const valueApiIds = new Set<string>();
  const featureSlugs = new Map<string, AttributeEditorRow>();
  const rootPositions = new Map<number, AttributeEditorRow>();
  const childPositionsByParent = new Map<string, Map<number, AttributeEditorRow>>();
  const rowById = new Map(input.rows.map((row) => [row.id, row]));

  if (!input.productId) {
    errors.push(makeUserError("Product ID is required.", ["productId"]));
  }

  input.rows.forEach((row) => {
    const featureIndex = rowIndexById.get(row.id) ?? 0;
    const name = row.name.trim();
    const featureSlug = toFeatureSlug(name, `feature-${featureIndex + 1}`);

    if (featureRowIds.has(row.id)) {
      errors.push(
        makeUserError("Feature row IDs must be unique.", [
          "features",
          featureIndex,
          "index",
        ]),
      );
    }
    featureRowIds.add(row.id);

    if (row.apiId) {
      if (featureApiIds.has(row.apiId)) {
        errors.push(
          makeUserError("Feature API IDs must be unique.", [
            "features",
            featureIndex,
            "index",
          ]),
        );
      }
      featureApiIds.add(row.apiId);
    }

    if (!name) {
      errors.push(
        makeUserError("Feature name is required.", [
          "features",
          featureIndex,
          "name",
        ]),
      );
    }

    if (!isNonNegativeInteger(row.sortIndex)) {
      errors.push(
        makeUserError("Feature index must be a non-negative integer.", [
          "features",
          featureIndex,
          "index",
        ]),
      );
    }

    if (!isValidSlug(featureSlug)) {
      errors.push(
        makeUserError("Feature slug is invalid.", [
          "features",
          featureIndex,
          "name",
        ]),
      );
    }

    const existingFeatureWithSlug = featureSlugs.get(featureSlug);
    if (existingFeatureWithSlug && existingFeatureWithSlug.id !== row.id) {
      errors.push(
        makeUserError("Feature slugs must be unique within the product.", [
          "features",
          featureIndex,
          "name",
        ]),
      );
    } else {
      featureSlugs.set(featureSlug, row);
    }

    if (row.parentId === null) {
      const existingRootPosition = rootPositions.get(row.sortIndex);
      if (existingRootPosition && existingRootPosition.id !== row.id) {
        errors.push(
          makeUserError("Root feature positions must be unique.", [
            "features",
            featureIndex,
            "index",
          ]),
        );
      } else {
        rootPositions.set(row.sortIndex, row);
      }
    } else {
      const parentPositions =
        childPositionsByParent.get(row.parentId) ?? new Map<number, AttributeEditorRow>();
      const existingChildPosition = parentPositions.get(row.sortIndex);

      if (existingChildPosition && existingChildPosition.id !== row.id) {
        errors.push(
          makeUserError("Child feature positions must be unique.", [
            "features",
            featureIndex,
            "index",
          ]),
        );
      } else {
        parentPositions.set(row.sortIndex, row);
        childPositionsByParent.set(row.parentId, parentPositions);
      }
    }

    if (row.type === "group") {
      if (row.parentId !== null) {
        errors.push(
          makeUserError("Groups must be root rows.", [
            "features",
            featureIndex,
            "index",
          ]),
        );
      }

      if (row.values.length > 0) {
        errors.push(
          makeUserError("Groups cannot contain values.", [
            "features",
            featureIndex,
            "index",
          ]),
        );
      }
    }

    if (row.type === "attribute" && row.parentId !== null) {
      const parent = rowById.get(row.parentId);

      if (!parent) {
        errors.push(
          makeUserError("Attribute parent group was not found.", [
            "features",
            featureIndex,
            "index",
          ]),
        );
      } else if (parent.type !== "group") {
        errors.push(
          makeUserError("Attribute parent must be a group.", [
            "features",
            featureIndex,
            "index",
          ]),
        );
      } else if (parent.parentId !== null || Number(row.level) > 1) {
        errors.push(
          makeUserError("Attributes can only be nested one level deep.", [
            "features",
            featureIndex,
            "index",
          ]),
        );
      }
    }

    if (row.apiType && row.apiType !== row.type) {
      errors.push(
        makeUserError("Existing feature type cannot be changed.", [
          "features",
          featureIndex,
          "index",
        ]),
      );
    }

    const valueSlugs = new Map<string, AttributeEditorValue>();
    const valuePositions = new Map<number, AttributeEditorValue>();
    sortedValues(row.values).forEach((value, valueIndex) => {
      const valueName = value.name.trim();
      const valueSlug = toValueSlug(valueName, `value-${valueIndex + 1}`);

      if (valueIds.has(value.id)) {
        errors.push(
          makeUserError("Value IDs must be unique.", [
            "features",
            featureIndex,
            "values",
            valueIndex,
            "name",
          ]),
        );
      }
      valueIds.add(value.id);

      if (!isNonNegativeInteger(value.sortIndex)) {
        errors.push(
          makeUserError("Value index must be a non-negative integer.", [
            "features",
            featureIndex,
            "values",
            valueIndex,
            "name",
          ]),
        );
      }

      const existingValuePosition = valuePositions.get(value.sortIndex);
      if (existingValuePosition && existingValuePosition.id !== value.id) {
        errors.push(
          makeUserError("Value positions must be unique within an attribute.", [
            "features",
            featureIndex,
            "values",
            valueIndex,
            "name",
          ]),
        );
      } else {
        valuePositions.set(value.sortIndex, value);
      }

      if (value.apiId) {
        if (valueApiIds.has(value.apiId)) {
          errors.push(
            makeUserError("Value API IDs must be unique.", [
              "features",
              featureIndex,
              "values",
              valueIndex,
              "name",
            ]),
          );
        }
        valueApiIds.add(value.apiId);
      }

      if (!valueName) {
        errors.push(
          makeUserError("Value name is required.", [
            "features",
            featureIndex,
            "values",
            valueIndex,
            "name",
          ]),
        );
      }

      if (!isValidSlug(valueSlug)) {
        errors.push(
          makeUserError("Value slug is invalid.", [
            "features",
            featureIndex,
            "values",
            valueIndex,
            "name",
          ]),
        );
      }

      const existingValueWithSlug = valueSlugs.get(valueSlug);
      if (existingValueWithSlug && existingValueWithSlug.id !== value.id) {
        errors.push(
          makeUserError("Value slugs must be unique within an attribute.", [
            "features",
            featureIndex,
            "values",
            valueIndex,
            "name",
          ]),
        );
      } else {
        valueSlugs.set(valueSlug, value);
      }

      if (!row.apiId && value.apiId) {
        errors.push(
          makeUserError("New features cannot contain existing value IDs.", [
            "features",
            featureIndex,
            "values",
            valueIndex,
            "name",
          ]),
        );
      }
    });
  });

  return errors;
}
