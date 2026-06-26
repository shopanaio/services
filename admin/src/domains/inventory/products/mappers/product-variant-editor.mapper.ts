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
  productMediaFiles?: ApiFile[];
}

export interface VariantEditorSaveRow {
  id: string;
  price: number | null;
  compareAtPrice: number | null;
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
  const sortedMediaFiles = sortVariantMediaFiles(
    variant,
    options?.productMediaFiles,
  );

  return {
    ...mapApiWeightToVariantFields(variant.weight),
    ...mapApiDimensionsToVariantFields(variant.dimensions),
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
        optionId: selectedOption.optionId,
        optionValueId: selectedOption.optionValueId,
        name: option?.name ?? "Option",
        value: value?.name ?? "Unknown option",
      };
    }),
    selectedOptionValueIds: Object.fromEntries(
      productOptions.map((option) => {
        const selectedOption = variant.selectedOptions.find(
          (candidate) => candidate.optionId === option.id,
        );

        return [option.id, selectedOption?.optionValueId ?? null];
      }),
    ),
    price: variant.price?.amountMinor ?? null,
    compareAtPrice: variant.price?.compareAtMinor ?? null,
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
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    weight: row.weight,
    weightUnit: row.weightUnit,
    length: row.length,
    width: row.width,
    height: row.height,
    dimensionUnit: row.dimensionUnit,
    mediaFileIds: row.media.map((file) => file.id),
  }));
}
