import type { ApiFile, ApiProductOption, ApiVariant } from "@/graphql/types";
import type {
  IVariantEditorInput,
  IVariantEditorRow,
} from "../components/variants/config/types";
import {
  mapApiDimensionsToVariantFields,
  mapApiWeightToVariantFields,
} from "../utils/product-measurements";

export interface MapApiVariantsToEditorInputsOptions {
  inventoryWarehouseId?: string;
  productMediaFiles?: ApiFile[];
}

export interface VariantEditorSaveRow {
  id: string;
  sku: string | null;
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
  mediaFileIds: string[];
}

function sortVariantMediaFiles(
  variant: ApiVariant,
  productMediaFiles?: ApiFile[],
): ApiFile[] {
  const productMediaOrder = new Map(
    (productMediaFiles ?? []).map((file, index) => [file.id, index]),
  );

  return [...variant.media]
    .sort((left, right) => {
      const leftOrder = productMediaOrder.get(left.file.id);
      const rightOrder = productMediaOrder.get(right.file.id);

      if (leftOrder !== undefined || rightOrder !== undefined) {
        return (leftOrder ?? Number.MAX_SAFE_INTEGER) -
          (rightOrder ?? Number.MAX_SAFE_INTEGER);
      }

      return left.sortIndex - right.sortIndex;
    })
    .map((media) => media.file);
}

export function mapApiVariantToEditorInput(
  variant: ApiVariant,
  productOptions: ApiProductOption[],
  options?: MapApiVariantsToEditorInputsOptions,
): IVariantEditorInput {
  const optionsById = new Map(
    productOptions.map((option) => [option.id, option]),
  );
  const stockRows = variant.inventoryItem?.stock ?? [];
  const warehouseStock = options?.inventoryWarehouseId
    ? variant.inventoryItem?.stock.find(
        (stock) => stock.warehouseId === options.inventoryWarehouseId,
      )
    : null;
  const aggregateStock = stockRows.reduce(
    (total, stock) => ({
      onHand: total.onHand + stock.quantityOnHand,
      unavailable: total.unavailable + stock.unavailableQuantity,
      reserved: total.reserved + stock.reservedQuantity,
    }),
    { onHand: 0, unavailable: 0, reserved: 0 },
  );
  const onHand = options?.inventoryWarehouseId
    ? warehouseStock?.quantityOnHand ?? 0
    : stockRows.length > 0
      ? aggregateStock.onHand
      : variant.inventoryItem?.totalAvailable ?? 0;
  const unavailable = options?.inventoryWarehouseId
    ? warehouseStock?.unavailableQuantity ?? 0
    : aggregateStock.unavailable;
  const reserved = options?.inventoryWarehouseId
    ? warehouseStock?.reservedQuantity ?? 0
    : aggregateStock.reserved;
  const sortedMediaFiles = sortVariantMediaFiles(
    variant,
    options?.productMediaFiles,
  );

  return {
    ...mapApiWeightToVariantFields(variant.inventoryItem?.weight),
    ...mapApiDimensionsToVariantFields(variant.inventoryItem?.dimensions),
    id: variant.id,
    title: variant.title ?? variant.handle,
    imageUrl: sortedMediaFiles[0]?.url ?? null,
    media: sortedMediaFiles,
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
    onHand,
    unavailable,
    reserved,
    price: variant.price?.amountMinor ?? null,
    compareAtPrice: variant.price?.compareAtMinor ?? null,
    costPrice: variant.inventoryItem?.unitCost?.amountMinor ?? null,
  };
}

export function mapApiVariantsToEditorInputs(
  variants: ApiVariant[],
  productOptions: ApiProductOption[],
  options?: MapApiVariantsToEditorInputsOptions,
): IVariantEditorInput[] {
  return variants.map((variant) =>
    mapApiVariantToEditorInput(variant, productOptions, options),
  );
}

export function getVariantEditorRowsForSave(
  rows: IVariantEditorRow[],
): VariantEditorSaveRow[] {
  return rows.map((row) => ({
    id: row.id,
    sku: row.sku,
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
    mediaFileIds: row.media.map((file) => file.id),
  }));
}
