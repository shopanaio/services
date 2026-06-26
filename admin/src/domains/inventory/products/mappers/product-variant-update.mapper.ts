import type {
  ApiVariant,
  ApiVariantUpdateInput,
  CurrencyCode,
} from "@/graphql/types";
import type { VariantEditorSaveRow } from "./product-variant-editor.mapper";

export interface PrepareChangedVariantUpdateInputsParams {
  rows: VariantEditorSaveRow[];
  variants: ApiVariant[];
  defaultCurrency: CurrencyCode | null | undefined;
  includePricing?: boolean;
  includeShipping?: boolean;
  includeMedia?: boolean;
}

function parseRequiredMinorUnit(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error("Prices must be valid minor-unit numbers.");
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
  updatesByVariantId: Map<string, ApiVariantUpdateInput>,
  variantId: string,
): ApiVariantUpdateInput {
  const existing = updatesByVariantId.get(variantId);

  if (existing) {
    return existing;
  }

  const update: ApiVariantUpdateInput = { variantId };

  updatesByVariantId.set(variantId, update);

  return update;
}

function applyPricingUpdate(
  update: ApiVariantUpdateInput,
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

  if (amountMinor === null) {
    throw new Error("Price is required to save variant pricing.");
  }

  if (!defaultCurrency) {
    throw new Error("Store default currency is required to save new prices.");
  }

  update.pricing = {
    currency: defaultCurrency,
    amountMinor,
    compareAtMinor,
  };
}

function applyShippingUpdate(
  update: ApiVariantUpdateInput,
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
    if (
      (length === null && originalLength !== null) ||
      (width === null && originalWidth !== null) ||
      (height === null && originalHeight !== null)
    ) {
      throw new Error("Clearing existing dimensions is not supported.");
    }

    if (length === null || width === null || height === null) {
      throw new Error(
        "Length, width, and height are required to save dimensions.",
      );
    }

    update.dimensions = {
      length: parsePositiveInteger(length, "Length"),
      width: parsePositiveInteger(width, "Width"),
      height: parsePositiveInteger(height, "Height"),
    };
  }

  if (weightChanged && weight !== null) {
    update.weight = parsePositiveInteger(weight, "Weight");
  }
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
  update: ApiVariantUpdateInput,
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

export function prepareChangedVariantUpdateInputs({
  rows,
  variants,
  defaultCurrency,
  includePricing = true,
  includeShipping = true,
  includeMedia = true,
}: PrepareChangedVariantUpdateInputsParams): ApiVariantUpdateInput[] {
  const variantsById = new Map(
    variants.map((variant) => [variant.id, variant]),
  );
  const updatesByVariantId = new Map<string, ApiVariantUpdateInput>();

  for (const row of rows) {
    const variant = variantsById.get(row.id);

    if (!variant) {
      continue;
    }

    const update = getOrCreateUpdate(updatesByVariantId, row.id);

    if (includePricing) {
      applyPricingUpdate(update, row, variant, defaultCurrency);
    }

    if (includeShipping) {
      applyShippingUpdate(update, row, variant);
    }

    if (includeMedia) {
      applyMediaUpdate(update, row, variant);
    }

    if (
      !update.pricing &&
      !update.dimensions &&
      update.weight === undefined &&
      !update.media
    ) {
      updatesByVariantId.delete(row.id);
    }
  }

  return Array.from(updatesByVariantId.values());
}
