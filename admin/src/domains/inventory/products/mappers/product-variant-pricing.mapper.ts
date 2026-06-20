import type {
  ApiVariant,
  ApiVariantUpdateInput,
  CurrencyCode,
} from "@/graphql/types";
import type { VariantEditorSaveRow } from "./product-variant-editor.mapper";

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

export function prepareChangedVariantPricingInputs(
  rows: VariantEditorSaveRow[],
  variants: ApiVariant[],
  defaultCurrency: CurrencyCode | null | undefined,
): ApiVariantUpdateInput[] {
  const variantsById = new Map(
    variants.map((variant) => [variant.id, variant]),
  );
  const updates: ApiVariantUpdateInput[] = [];

  for (const row of rows) {
    const originalVariant = variantsById.get(row.id);

    if (!originalVariant) {
      continue;
    }

    const amountMinor = parseOptionalMinorUnit(row.price);
    const compareAtMinor = parseOptionalMinorUnit(row.compareAtPrice);
    const originalAmountMinor = originalVariant.price?.amountMinor ?? null;
    const originalCompareAtMinor =
      originalVariant.price?.compareAtMinor ?? null;

    if (
      amountMinor === originalAmountMinor &&
      compareAtMinor === originalCompareAtMinor
    ) {
      continue;
    }

    if (amountMinor === null) {
      throw new Error("Price is required to save variant pricing.");
    }

    const currency = defaultCurrency;

    if (!currency) {
      throw new Error("Store default currency is required to save new prices.");
    }

    updates.push({
      variantId: row.id,
      pricing: {
        currency,
        amountMinor,
        compareAtMinor,
      },
    });
  }

  return updates;
}
