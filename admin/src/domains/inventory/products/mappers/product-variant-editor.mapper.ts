import type { ApiProductOption, ApiVariant } from "@/graphql/types";
import type {
  IVariantEditorInput,
  IVariantEditorRow,
} from "../components/variants/config/types";
import {
  mapApiDimensionsToVariantFields,
  mapApiWeightToVariantFields,
} from "../utils/product-measurements";

export interface VariantEditorSaveRow {
  id: string;
  sku: string | null;
  barcode: string | null;
  onHand: number;
  unavailable: number;
  reserved: number;
  available: number;
  price: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  weight: number | null;
  weightUnit: string;
  length: number | null;
  width: number | null;
  height: number | null;
  dimensionUnit: string;
}

export function mapApiVariantToEditorInput(
  variant: ApiVariant,
  productOptions: ApiProductOption[],
): IVariantEditorInput {
  const optionsById = new Map(
    productOptions.map((option) => [option.id, option]),
  );

  return {
    ...mapApiWeightToVariantFields(variant.inventoryItem?.weight),
    ...mapApiDimensionsToVariantFields(variant.inventoryItem?.dimensions),
    id: variant.id,
    title: variant.title ?? variant.handle,
    imageUrl: variant.media[0]?.file.url ?? null,
    media: variant.media.map((media) => media.file.url),
    options: variant.selectedOptions.map((selectedOption) => {
      const option = optionsById.get(selectedOption.optionId);
      const value = option?.values.find(
        (candidate) => candidate.id === selectedOption.optionValueId,
      );

      return {
        name: option?.name ?? "Option",
        value: value?.name ?? "Unknown option",
      };
    }),
    sku: variant.inventoryItem?.sku ?? null,
    barcode: null,
    onHand: variant.inventoryItem?.totalAvailable ?? 0,
    unavailable: 0,
    reserved: 0,
    price: variant.price?.amountMinor ?? null,
    compareAtPrice: variant.price?.compareAtMinor ?? null,
    costPrice: variant.inventoryItem?.unitCost?.amountMinor ?? null,
  };
}

export function mapApiVariantsToEditorInputs(
  variants: ApiVariant[],
  productOptions: ApiProductOption[],
): IVariantEditorInput[] {
  return variants.map((variant) =>
    mapApiVariantToEditorInput(variant, productOptions),
  );
}

export function getVariantEditorRowsForSave(
  rows: IVariantEditorRow[],
): VariantEditorSaveRow[] {
  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    onHand: row.onHand,
    unavailable: row.unavailable,
    reserved: row.reserved,
    available: row.available,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    costPrice: row.costPrice,
    weight: row.weight,
    weightUnit: row.weightUnit,
    length: row.length,
    width: row.width,
    height: row.height,
    dimensionUnit: row.dimensionUnit,
  }));
}
