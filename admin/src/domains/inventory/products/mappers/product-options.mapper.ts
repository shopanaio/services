import { slugify } from "transliteration/dist/node/src/node/index.js";
import {
  OptionDisplayType,
  SwatchType,
  type ApiGenericUserError,
  type ApiProductOption,
  type ApiProductOptionSwatch,
  type ApiProductOptionSwatchInput,
  type ApiProductOptionSyncItemInput,
  type ApiProductOptionValueSyncInput,
  type ApiProductOptionsSyncInput,
} from "@/graphql/types";
import type {
  OptionEditorGroup,
  OptionEditorSwatch,
  OptionEditorValue,
} from "../modals/edit-options-modal/types";

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const DATA_URL_PATTERN = /^data:/i;
const VALID_DISPLAY_TYPES = new Set<string>(Object.values(OptionDisplayType));
const VALID_SWATCH_TYPES = new Set<string>(Object.values(SwatchType));

type UserErrorField = Array<string | number>;

export interface ProductOptionsSyncDraft {
  input: ApiProductOptionsSyncInput;
  optionGroupsByInputIndex: OptionEditorGroup[];
  valuesByInputPath: Record<string, OptionEditorValue>;
}

function createTemporaryId(prefix: string): string {
  const uuid =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

  return `${prefix}-${uuid}`;
}

export function createTemporaryOptionId(): string {
  return createTemporaryId("tmp-option");
}

export function createTemporaryOptionValueId(): string {
  return createTemporaryId("tmp-option-value");
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

function isValidDisplayType(displayType: OptionDisplayType): boolean {
  return VALID_DISPLAY_TYPES.has(displayType);
}

function isValidSwatchType(swatchType: SwatchType): boolean {
  return VALID_SWATCH_TYPES.has(swatchType);
}

function isExistingApiFileId(fileId: string | null | undefined): fileId is string {
  return Boolean(fileId && !DATA_URL_PATTERN.test(fileId));
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

export function toOptionSlug(name: string, fallback: string): string {
  return normalizeSlug(name, fallback);
}

export function toOptionValueSlug(name: string, fallback: string): string {
  return normalizeSlug(name, fallback);
}

function toUniqueSlug(slug: string, used: Set<string>): string {
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

function sortedGroups(groups: OptionEditorGroup[]): OptionEditorGroup[] {
  return [...groups].sort((left, right) => {
    if (left.sortIndex !== right.sortIndex) {
      return left.sortIndex - right.sortIndex;
    }

    return left.id.localeCompare(right.id);
  });
}

function sortedValues(values: OptionEditorValue[]): OptionEditorValue[] {
  return [...values].sort((left, right) => {
    if (left.sortIndex !== right.sortIndex) {
      return left.sortIndex - right.sortIndex;
    }

    return left.id.localeCompare(right.id);
  });
}

function apiSwatchToEditorSwatch(
  swatch: ApiProductOptionSwatch | null | undefined,
): OptionEditorSwatch | null {
  if (!swatch) {
    return null;
  }

  return {
    swatchType: swatch.swatchType,
    colorOne: swatch.colorOne,
    colorTwo: swatch.colorTwo,
    fileId: swatch.swatchType === SwatchType.Image ? swatch.file?.id ?? null : null,
    fileUrl: swatch.swatchType === SwatchType.Image ? swatch.file?.url ?? null : null,
    metadata: swatch.metadata,
  };
}

export function apiProductOptionsToOptionEditorGroups(
  options: ApiProductOption[],
): OptionEditorGroup[] {
  return options.map((option, optionIndex) => ({
    id: option.id,
    apiId: option.id,
    name: option.name,
    slug: option.slug,
    displayType: option.displayType,
    sortIndex: optionIndex,
    values: option.values.map((value, valueIndex) => ({
      id: value.id,
      apiId: value.id,
      apiSwatchId: value.swatch?.id,
      name: value.name,
      slug: value.slug,
      sortIndex: valueIndex,
      swatch: apiSwatchToEditorSwatch(value.swatch),
    })),
  }));
}

function swatchMetadataInput(
  metadata: unknown,
): Record<string, unknown> | null | undefined {
  if (metadata === null || metadata === undefined) {
    return metadata;
  }

  return typeof metadata === "object"
    ? (metadata as Record<string, unknown>)
    : undefined;
}

export function optionEditorSwatchToProductOptionSwatchInput(
  swatch: OptionEditorSwatch | null,
): ApiProductOptionSwatchInput | null {
  if (!swatch) {
    return null;
  }

  const input: ApiProductOptionSwatchInput = {
    swatchType: swatch.swatchType,
  };
  const metadata = swatchMetadataInput(swatch.metadata);

  if (metadata !== undefined) {
    input.metadata = metadata;
  }

  if (swatch.swatchType === SwatchType.Color) {
    input.colorOne = swatch.colorOne ?? null;
    return input;
  }

  if (swatch.swatchType === SwatchType.Gradient) {
    input.colorOne = swatch.colorOne ?? null;
    input.colorTwo = swatch.colorTwo ?? null;
    return input;
  }

  if (swatch.swatchType === SwatchType.Image) {
    input.fileId = isExistingApiFileId(swatch.fileId) ? swatch.fileId : null;
  }

  return input;
}

function getOptionSlug(input: {
  group: OptionEditorGroup;
  optionIndex: number;
  usedSlugs: Set<string>;
}): string {
  const preservedSlug = input.group.apiId ? input.group.slug.trim() : "";

  if (preservedSlug) {
    input.usedSlugs.add(preservedSlug);
    return preservedSlug;
  }

  return toUniqueSlug(
    toOptionSlug(input.group.name, `option-${input.optionIndex + 1}`),
    input.usedSlugs,
  );
}

function getValueSlug(input: {
  value: OptionEditorValue;
  valueIndex: number;
  usedSlugs: Set<string>;
}): string {
  const preservedSlug = input.value.apiId ? input.value.slug.trim() : "";

  if (preservedSlug) {
    input.usedSlugs.add(preservedSlug);
    return preservedSlug;
  }

  return toUniqueSlug(
    toOptionValueSlug(input.value.name, `value-${input.valueIndex + 1}`),
    input.usedSlugs,
  );
}

function createValueSyncInput(input: {
  value: OptionEditorValue;
  groupDisplayType: OptionDisplayType;
  sortIndex: number;
  slug: string;
}): ApiProductOptionValueSyncInput {
  const valueInput: ApiProductOptionValueSyncInput = {
    name: input.value.name.trim(),
    slug: input.slug,
    sortIndex: input.sortIndex,
    swatch:
      input.groupDisplayType === OptionDisplayType.Swatch
        ? optionEditorSwatchToProductOptionSwatchInput(input.value.swatch)
        : null,
  };

  if (input.value.apiId) {
    valueInput.id = input.value.apiId;
  }

  return valueInput;
}

export function buildProductOptionsSyncDraft(input: {
  productId: string;
  groups: OptionEditorGroup[];
}): ProductOptionsSyncDraft {
  const options: ApiProductOptionSyncItemInput[] = [];
  const optionGroupsByInputIndex: OptionEditorGroup[] = [];
  const valuesByInputPath: Record<string, OptionEditorValue> = {};
  const usedOptionSlugs = new Set<string>();

  sortedGroups(input.groups).forEach((group, optionIndex) => {
    const usedValueSlugs = new Set<string>();
    const values = sortedValues(group.values).map((value, valueIndex) => {
      valuesByInputPath[`options.${optionIndex}.values.${valueIndex}`] = value;

      return createValueSyncInput({
        value,
        groupDisplayType: group.displayType,
        sortIndex: valueIndex,
        slug: getValueSlug({
          value,
          valueIndex,
          usedSlugs: usedValueSlugs,
        }),
      });
    });

    const optionInput: ApiProductOptionSyncItemInput = {
      displayType: group.displayType,
      name: group.name.trim(),
      slug: getOptionSlug({
        group,
        optionIndex,
        usedSlugs: usedOptionSlugs,
      }),
      sortIndex: optionIndex,
      values,
    };

    if (group.apiId) {
      optionInput.id = group.apiId;
    }

    options.push(optionInput);
    optionGroupsByInputIndex.push(group);
  });

  return {
    input: {
      productId: input.productId,
      options,
    },
    optionGroupsByInputIndex,
    valuesByInputPath,
  };
}

export function optionEditorGroupsToProductOptionsSyncInput(input: {
  productId: string;
  groups: OptionEditorGroup[];
}): ApiProductOptionsSyncInput {
  return buildProductOptionsSyncDraft(input).input;
}

function getOptionIndexById(
  groups: OptionEditorGroup[],
): Map<string, number> {
  return new Map(sortedGroups(groups).map((group, index) => [group.id, index]));
}

function getValueIndexById(
  values: OptionEditorValue[],
): Map<string, number> {
  return new Map(sortedValues(values).map((value, index) => [value.id, index]));
}

function validateSwatch(input: {
  errors: ApiGenericUserError[];
  optionIndex: number;
  valueIndex: number;
  swatch: OptionEditorSwatch | null;
}): void {
  if (!input.swatch) {
    input.errors.push(
      makeUserError("Swatch is required for swatch display options.", [
        "options",
        input.optionIndex,
        "values",
        input.valueIndex,
        "swatch",
      ]),
    );
    return;
  }

  if (!isValidSwatchType(input.swatch.swatchType)) {
    input.errors.push(
      makeUserError("Swatch type is invalid.", [
        "options",
        input.optionIndex,
        "values",
        input.valueIndex,
        "swatch",
      ]),
    );
    return;
  }

  if (
    input.swatch.swatchType === SwatchType.Color &&
    !input.swatch.colorOne
  ) {
    input.errors.push(
      makeUserError("Color swatches require a primary color.", [
        "options",
        input.optionIndex,
        "values",
        input.valueIndex,
        "swatch",
      ]),
    );
  }

  if (
    input.swatch.swatchType === SwatchType.Gradient &&
    (!input.swatch.colorOne || !input.swatch.colorTwo)
  ) {
    input.errors.push(
      makeUserError("Gradient swatches require two colors.", [
        "options",
        input.optionIndex,
        "values",
        input.valueIndex,
        "swatch",
      ]),
    );
  }

  if (
    input.swatch.swatchType === SwatchType.Image &&
    !isExistingApiFileId(input.swatch.fileId)
  ) {
    input.errors.push(
      makeUserError("Image swatches require an existing uploaded file.", [
        "options",
        input.optionIndex,
        "values",
        input.valueIndex,
        "swatch",
      ]),
    );
  }
}

export function validateOptionEditorGroups(input: {
  productId: string;
  groups: OptionEditorGroup[];
}): ApiGenericUserError[] {
  const errors: ApiGenericUserError[] = [];
  const optionIndexById = getOptionIndexById(input.groups);
  const optionRowIds = new Set<string>();
  const optionApiIds = new Set<string>();
  const valueRowIds = new Set<string>();
  const valueApiIds = new Set<string>();
  const optionPositions = new Map<number, OptionEditorGroup>();

  if (!input.productId) {
    errors.push(makeUserError("Product ID is required.", ["productId"]));
  }

  input.groups.forEach((group) => {
    const optionIndex = optionIndexById.get(group.id) ?? 0;
    const optionName = group.name.trim();

    if (optionRowIds.has(group.id)) {
      errors.push(
        makeUserError("Option row IDs must be unique.", [
          "options",
          optionIndex,
          "sortIndex",
        ]),
      );
    }
    optionRowIds.add(group.id);

    if (group.apiId) {
      if (optionApiIds.has(group.apiId)) {
        errors.push(
          makeUserError("Option API IDs must be unique.", [
            "options",
            optionIndex,
            "sortIndex",
          ]),
        );
      }
      optionApiIds.add(group.apiId);
    }

    if (!optionName) {
      errors.push(
        makeUserError("Option name is required.", [
          "options",
          optionIndex,
          "name",
        ]),
      );
    }

    if (!isNonNegativeInteger(group.sortIndex)) {
      errors.push(
        makeUserError("Option sort index must be a non-negative integer.", [
          "options",
          optionIndex,
          "sortIndex",
        ]),
      );
    }

    const existingOptionPosition = optionPositions.get(group.sortIndex);
    if (existingOptionPosition && existingOptionPosition.id !== group.id) {
      errors.push(
        makeUserError("Option sort indexes must be unique.", [
          "options",
          optionIndex,
          "sortIndex",
        ]),
      );
    } else {
      optionPositions.set(group.sortIndex, group);
    }

    if (!isValidDisplayType(group.displayType)) {
      errors.push(
        makeUserError("Option display type is invalid.", [
          "options",
          optionIndex,
          "displayType",
        ]),
      );
    }

    if (group.values.length === 0) {
      errors.push(
        makeUserError("Every option must contain at least one value.", [
          "options",
          optionIndex,
          "values",
        ]),
      );
    }

    const valueIndexById = getValueIndexById(group.values);
    const valuePositions = new Map<number, OptionEditorValue>();

    sortedValues(group.values).forEach((value) => {
      const valueIndex = valueIndexById.get(value.id) ?? 0;
      const valueName = value.name.trim();

      if (valueRowIds.has(value.id)) {
        errors.push(
          makeUserError("Value row IDs must be unique.", [
            "options",
            optionIndex,
            "values",
            valueIndex,
            "name",
          ]),
        );
      }
      valueRowIds.add(value.id);

      if (value.apiId) {
        if (valueApiIds.has(value.apiId)) {
          errors.push(
            makeUserError("Value API IDs must be unique.", [
              "options",
              optionIndex,
              "values",
              valueIndex,
              "name",
            ]),
          );
        }
        valueApiIds.add(value.apiId);
      }

      if (!group.apiId && value.apiId) {
        errors.push(
          makeUserError("New options cannot contain existing value IDs.", [
            "options",
            optionIndex,
            "values",
            valueIndex,
            "name",
          ]),
        );
      }

      if (!valueName) {
        errors.push(
          makeUserError("Value name is required.", [
            "options",
            optionIndex,
            "values",
            valueIndex,
            "name",
          ]),
        );
      }

      if (!isNonNegativeInteger(value.sortIndex)) {
        errors.push(
          makeUserError("Value sort index must be a non-negative integer.", [
            "options",
            optionIndex,
            "values",
            valueIndex,
            "sortIndex",
          ]),
        );
      }

      const existingValuePosition = valuePositions.get(value.sortIndex);
      if (existingValuePosition && existingValuePosition.id !== value.id) {
        errors.push(
          makeUserError("Value sort indexes must be unique within an option.", [
            "options",
            optionIndex,
            "values",
            valueIndex,
            "sortIndex",
          ]),
        );
      } else {
        valuePositions.set(value.sortIndex, value);
      }

      if (group.displayType === OptionDisplayType.Swatch) {
        validateSwatch({
          errors,
          optionIndex,
          valueIndex,
          swatch: value.swatch,
        });
      }
    });
  });

  const draft = buildProductOptionsSyncDraft(input);
  const optionSlugs = new Map<string, number>();

  draft.input.options.forEach((option, optionIndex) => {
    if (!isValidSlug(option.slug)) {
      errors.push(
        makeUserError("Option slug is invalid.", [
          "options",
          optionIndex,
          "slug",
        ]),
      );
    }

    const existingOptionIndex = optionSlugs.get(option.slug);
    if (existingOptionIndex !== undefined && existingOptionIndex !== optionIndex) {
      errors.push(
        makeUserError("Option slugs must be unique within the product.", [
          "options",
          optionIndex,
          "slug",
        ]),
      );
    } else {
      optionSlugs.set(option.slug, optionIndex);
    }

    const valueSlugs = new Map<string, number>();

    option.values.forEach((value, valueIndex) => {
      if (!isValidSlug(value.slug)) {
        errors.push(
          makeUserError("Value slug is invalid.", [
            "options",
            optionIndex,
            "values",
            valueIndex,
            "slug",
          ]),
        );
      }

      const existingValueIndex = valueSlugs.get(value.slug);
      if (existingValueIndex !== undefined && existingValueIndex !== valueIndex) {
        errors.push(
          makeUserError("Value slugs must be unique within an option.", [
            "options",
            optionIndex,
            "values",
            valueIndex,
            "slug",
          ]),
        );
      } else {
        valueSlugs.set(value.slug, valueIndex);
      }

      if (option.displayType !== OptionDisplayType.Swatch && value.swatch !== null) {
        errors.push(
          makeUserError("Non-swatch options must not send value swatches.", [
            "options",
            optionIndex,
            "values",
            valueIndex,
            "swatch",
          ]),
        );
      }
    });
  });

  return errors;
}
