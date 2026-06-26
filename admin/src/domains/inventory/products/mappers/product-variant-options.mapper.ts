import type {
  ApiProductOption,
  ApiProductUpdateInput,
  ApiVariant,
} from "@/graphql/types";
import type {
  IVariantEditorRow,
  VariantOptionRowsValidationResult,
} from "../components/variants/config/types";

const sortProductOptions = (productOptions: ApiProductOption[]) =>
  [...productOptions].sort((a, b) => a.sortIndex - b.sortIndex);

const getVariantTitle = (variant: ApiVariant) =>
  variant.title?.trim() || variant.handle || variant.id;

export function buildCombinationKey(
  row: Pick<IVariantEditorRow, "selectedOptionValueIds">,
  productOptions: ApiProductOption[],
): string | null {
  const parts: string[] = [];

  for (const option of sortProductOptions(productOptions)) {
    const valueId = row.selectedOptionValueIds[option.id];
    if (!valueId) {
      return null;
    }
    parts.push(`${option.id}:${valueId}`);
  }

  return parts.join("|");
}

export function apiVariantsToVariantOptionRows(
  variants: ApiVariant[],
  productOptions: ApiProductOption[],
): IVariantEditorRow[] {
  return variants.map((variant) => {
    const selectedOptionValueIds = Object.fromEntries(
      productOptions.map((option) => {
        const selectedOption = variant.selectedOptions.find(
          (optionValue) => optionValue.optionId === option.id,
        );

        return [option.id, selectedOption?.optionValueId ?? null];
      }),
    );

    return {
      id: variant.id,
      title: getVariantTitle(variant),
      imageUrl: null,
      media: [],
      options: [],
      selectedOptionValueIds,
      price: null,
      compareAtPrice: null,
      weight: null,
      weightUnit: "g",
      length: null,
      width: null,
      height: null,
      dimensionUnit: "mm",
    };
  });
}

export function validateVariantOptionRows(
  rows: IVariantEditorRow[],
  productOptions: ApiProductOption[],
): VariantOptionRowsValidationResult {
  const valueIdsByOptionId = new Map(
    productOptions.map((option) => [
      option.id,
      new Set(option.values.map((value) => value.id)),
    ]),
  );
  const incompleteRowIds = new Set<string>();
  const invalidRowIds = new Set<string>();
  const keyToRowIds = new Map<string, string[]>();

  for (const row of rows) {
    let invalid = false;
    let incomplete = false;

    for (const option of sortProductOptions(productOptions)) {
      const valueId = row.selectedOptionValueIds[option.id];
      if (!valueId) {
        incomplete = true;
        continue;
      }

      if (!valueIdsByOptionId.get(option.id)?.has(valueId)) {
        invalid = true;
      }
    }

    if (incomplete) {
      incompleteRowIds.add(row.id);
    }

    if (invalid) {
      invalidRowIds.add(row.id);
    }

    const combinationKey =
      incomplete || invalid ? null : buildCombinationKey(row, productOptions);
    if (combinationKey) {
      keyToRowIds.set(combinationKey, [
        ...(keyToRowIds.get(combinationKey) ?? []),
        row.id,
      ]);
    }
  }

  const duplicateRowIds = new Set<string>();
  for (const rowIds of keyToRowIds.values()) {
    if (rowIds.length > 1) {
      rowIds.forEach((rowId) => duplicateRowIds.add(rowId));
    }
  }

  const validatedRows = rows.map((row) => {
    const duplicateKey = buildCombinationKey(row, productOptions);
    const messages: string[] = [];

    if (incompleteRowIds.has(row.id)) {
      messages.push("Select every option value.");
    }
    if (invalidRowIds.has(row.id)) {
      messages.push("One or more selected values no longer belong to their option.");
    }
    if (duplicateRowIds.has(row.id)) {
      messages.push("This option combination is duplicated.");
    }

    return {
      ...row,
      duplicateKey: duplicateRowIds.has(row.id) ? duplicateKey : null,
      validationMessage: messages.length > 0 ? messages.join(" ") : null,
    };
  });

  const messages: string[] = [];
  if (incompleteRowIds.size > 0) {
    messages.push(`${incompleteRowIds.size} variant row(s) have incomplete options.`);
  }
  if (invalidRowIds.size > 0) {
    messages.push(`${invalidRowIds.size} variant row(s) have invalid option values.`);
  }
  if (duplicateRowIds.size > 0) {
    messages.push(`${duplicateRowIds.size} variant row(s) duplicate another combination.`);
  }

  return {
    rows: validatedRows,
    hasErrors: messages.length > 0,
    duplicateRowIds: [...duplicateRowIds],
    incompleteRowIds: [...incompleteRowIds],
    invalidRowIds: [...invalidRowIds],
    messages,
  };
}

export function variantOptionRowsToProductUpdateInput(
  rows: IVariantEditorRow[],
  originalRows: IVariantEditorRow[],
  productOptions: ApiProductOption[],
): ApiProductUpdateInput {
  const originalKeysByRowId = new Map(
    originalRows.map((row) => [row.id, buildCombinationKey(row, productOptions)]),
  );
  const changedRows = rows.filter(
    (row) =>
      buildCombinationKey(row, productOptions) !== originalKeysByRowId.get(row.id),
  );

  return {
    variants: changedRows.map((row) => ({
      variantId: row.id,
      options: {
        set: sortProductOptions(productOptions).map((option) => ({
          optionId: option.id,
          optionValueId: row.selectedOptionValueIds[option.id] as string,
        })),
      },
    })),
  };
}
