import type {
  ApiProductOption,
  ApiVariant,
  ApiVariantOperationInput,
  CurrencyCode,
} from "@/graphql/types";
import { VariantOperationAction } from "@/graphql/types";
import type { VariantEditorSaveRow } from "./product-variant-editor.mapper";

export interface PrepareChangedVariantUpdateOperationsParams {
  rows: VariantEditorSaveRow[];
  variants: ApiVariant[];
  defaultCurrency: CurrencyCode | null | undefined;
  includePricing?: boolean;
  includeShipping?: boolean;
  includeMedia?: boolean;
}

export interface PrepareDraftVariantCreateOperationsParams {
  rows: VariantEditorSaveRow[];
  productOptions: ApiProductOption[];
  defaultCurrency: CurrencyCode | null | undefined;
  includePricing?: boolean;
  includeShipping?: boolean;
  includeMedia?: boolean;
}

function parseRequiredMinorUnit(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error("Prices must be valid whole minor-unit numbers.");
  }

  return parsed;
}

function parseOptionalMinorUnit(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return parseRequiredMinorUnit(value);
}

function parseOptionalInteger(
  value: unknown,
  label: string,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }

  return parsed;
}

function parsePositiveInteger(value: unknown, label: string): number {
  const parsed = parseOptionalInteger(value, label);

  if (parsed === null) {
    throw new Error(`${label} is required.`);
  }

  if (parsed <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }

  return parsed;
}

function getOrCreateUpdate(
  updatesByVariantId: Map<string, ApiVariantOperationInput>,
  variantId: string,
): ApiVariantOperationInput {
  const existing = updatesByVariantId.get(variantId);

  if (existing) {
    return existing;
  }

  const update: ApiVariantOperationInput = {
    action: VariantOperationAction.Update,
    variantId,
  };

  updatesByVariantId.set(variantId, update);

  return update;
}

function applyPricingUpdate(
  update: ApiVariantOperationInput,
  row: VariantEditorSaveRow,
  variant: ApiVariant,
  defaultCurrency: CurrencyCode | null | undefined,
) {
  const amountMinor = parseOptionalMinorUnit(row.price);
  const compareAtMinor = parseOptionalMinorUnit(row.compareAtPrice);
  const originalAmountMinor = variant.price?.amountMinor ?? null;
  const originalCompareAtMinor = variant.price?.compareAtMinor ?? null;

  if (
    amountMinor === originalAmountMinor &&
    compareAtMinor === originalCompareAtMinor
  ) {
    return;
  }

  applyPricingOperation(update, amountMinor, compareAtMinor, defaultCurrency);
}

function applyPricingOperation(
  operation: ApiVariantOperationInput,
  amountMinor: number | null,
  compareAtMinor: number | null,
  defaultCurrency: CurrencyCode | null | undefined,
) {
  if (amountMinor === null && compareAtMinor === null) {
    return;
  }

  if (amountMinor === null) {
    throw new Error("Price is required to save variant pricing.");
  }

  if (!defaultCurrency) {
    throw new Error("Store default currency is required to save new prices.");
  }

  operation.pricing = {
    currency: defaultCurrency,
    amountMinor,
    compareAtMinor,
  };
}

function applyShippingUpdate(
  update: ApiVariantOperationInput,
  row: VariantEditorSaveRow,
  variant: ApiVariant,
) {
  const weight = parseOptionalInteger(row.weight, "Weight");
  const originalWeight = variant.weight?.value ?? null;
  const weightChanged = weight !== originalWeight;
  const originalLength = variant.dimensions?.length ?? null;
  const originalWidth = variant.dimensions?.width ?? null;
  const originalHeight = variant.dimensions?.height ?? null;
  const length = parseOptionalInteger(row.length, "Length");
  const width = parseOptionalInteger(row.width, "Width");
  const height = parseOptionalInteger(row.height, "Height");
  const dimensionsChanged =
    length !== originalLength ||
    width !== originalWidth ||
    height !== originalHeight;

  if (weightChanged && weight === null && originalWeight !== null) {
    throw new Error("Clearing existing weight is not supported.");
  }

  if (dimensionsChanged) {
    applyDimensionsOperation(update, length, width, height);
  }

  if (weightChanged && weight !== null) {
    update.weight = parsePositiveInteger(weight, "Weight");
  }
}

function applyDimensionsOperation(
  operation: ApiVariantOperationInput,
  length: number | null,
  width: number | null,
  height: number | null,
) {
  const hasDimension = length !== null || width !== null || height !== null;

  if (!hasDimension) {
    return;
  }

  if (length === null || width === null || height === null) {
    throw new Error(
      "Length, width, and height are required to save dimensions.",
    );
  }

  operation.dimensions = {
    length: parsePositiveInteger(length, "Length"),
    width: parsePositiveInteger(width, "Width"),
    height: parsePositiveInteger(height, "Height"),
  };
}

function areSameFileIdSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);

  return left.every((fileId) => rightSet.has(fileId));
}

function applyMediaUpdate(
  update: ApiVariantOperationInput,
  row: VariantEditorSaveRow,
  variant: ApiVariant,
) {
  const originalFileIds = [...variant.media]
    .sort((left, right) => left.sortIndex - right.sortIndex)
    .map((media) => media.file.id);

  if (areSameFileIdSet(row.mediaFileIds, originalFileIds)) {
    return;
  }

  update.media = {
    fileIds: row.mediaFileIds,
  };
}

function applyMaterializedRowFields(
  operation: ApiVariantOperationInput,
  row: VariantEditorSaveRow,
  defaultCurrency: CurrencyCode | null | undefined,
  options: {
    includePricing: boolean;
    includeShipping: boolean;
    includeMedia: boolean;
  },
) {
  if (options.includePricing) {
    applyPricingOperation(
      operation,
      parseOptionalMinorUnit(row.price),
      parseOptionalMinorUnit(row.compareAtPrice),
      defaultCurrency,
    );
  }

  if (options.includeShipping) {
    const weight = parseOptionalInteger(row.weight, "Weight");
    const length = parseOptionalInteger(row.length, "Length");
    const width = parseOptionalInteger(row.width, "Width");
    const height = parseOptionalInteger(row.height, "Height");

    if (weight !== null) {
      operation.weight = parsePositiveInteger(weight, "Weight");
    }

    applyDimensionsOperation(operation, length, width, height);
  }

  if (options.includeMedia && row.mediaFileIds.length > 0) {
    operation.media = {
      fileIds: row.mediaFileIds,
    };
  }
}

function hasVariantOperationFields(operation: ApiVariantOperationInput): boolean {
  return Boolean(
    operation.pricing ||
      operation.dimensions ||
      operation.weight !== undefined ||
      operation.media ||
      operation.options ||
      operation.inventory,
  );
}

export function prepareChangedVariantUpdateOperations({
  rows,
  variants,
  defaultCurrency,
  includePricing = true,
  includeShipping = true,
  includeMedia = true,
}: PrepareChangedVariantUpdateOperationsParams): ApiVariantOperationInput[] {
  const variantsById = new Map(
    variants.map((variant) => [variant.id, variant]),
  );
  const updatesByVariantId = new Map<string, ApiVariantOperationInput>();

  for (const row of rows) {
    if (row.kind === "draft" || row.kind === "blank") {
      continue;
    }

    const update = getOrCreateUpdate(updatesByVariantId, row.id);
    const variant = variantsById.get(row.id);

    if (variant) {
      if (includePricing) {
        applyPricingUpdate(update, row, variant, defaultCurrency);
      }

      if (includeShipping) {
        applyShippingUpdate(update, row, variant);
      }

      if (includeMedia) {
        applyMediaUpdate(update, row, variant);
      }
    } else {
      applyMaterializedRowFields(update, row, defaultCurrency, {
        includePricing,
        includeShipping,
        includeMedia,
      });
    }

    if (!hasVariantOperationFields(update)) {
      updatesByVariantId.delete(row.id);
    }
  }

  return Array.from(updatesByVariantId.values());
}

export function prepareDraftVariantCreateOperations({
  rows,
  productOptions,
  defaultCurrency,
  includePricing = true,
  includeShipping = true,
  includeMedia = true,
}: PrepareDraftVariantCreateOperationsParams): ApiVariantOperationInput[] {
  const sortedProductOptions = [...productOptions].sort(
    (left, right) => left.sortIndex - right.sortIndex,
  );

  return rows
    .filter((row) => row.kind === "draft")
    .map((row) => {
      if (!row.clientMutationId) {
        throw new Error("Draft variant is missing clientMutationId.");
      }

      const operation: ApiVariantOperationInput = {
        action: VariantOperationAction.Create,
        clientMutationId: row.clientMutationId,
        options: {
          set: sortedProductOptions.map((option) => {
            const optionValueId = row.selectedOptionValueIds[option.id];

            if (!optionValueId) {
              throw new Error("Draft variants must select every option value.");
            }

            if (!option.values.some((value) => value.id === optionValueId)) {
              throw new Error(
                "Draft variant selected option values are invalid.",
              );
            }

            return {
              optionId: option.id,
              optionValueId,
            };
          }),
        },
      };

      applyMaterializedRowFields(operation, row, defaultCurrency, {
        includePricing,
        includeShipping,
        includeMedia,
      });

      return operation;
    });
}
