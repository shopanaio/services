import type { ApiGenericUserError } from "@/graphql/types";
import type {
  AttributeEditorRow,
  AttributeEditorValue,
} from "../modals/edit-attributes-modal/types";
import type { ProductFeaturesSyncDraft } from "./product-features.mapper";

export interface ProductFeatureEditorErrorMap {
  rows: Record<string, string[]>;
  values: Record<string, string[]>;
  modal: string[];
}

function formatFieldPath(field: string[] | null | undefined): string | null {
  if (!field || field.length === 0) {
    return null;
  }

  return field.join(".");
}

export function formatProductFeatureUserError(
  error: ApiGenericUserError,
): string {
  const fieldPath = formatFieldPath(error.field);

  return fieldPath ? `${fieldPath}: ${error.message}` : error.message;
}

export function formatProductFeatureUserErrors(
  errors: ApiGenericUserError[],
): string[] {
  return errors.map(formatProductFeatureUserError);
}

function pushError(
  target: Record<string, string[]>,
  key: string,
  message: string,
): void {
  target[key] = [...(target[key] ?? []), message];
}

export function mapProductFeatureUserErrorsToEditorErrors(input: {
  errors: ApiGenericUserError[];
  draft: ProductFeaturesSyncDraft;
}): ProductFeatureEditorErrorMap {
  const errorMap: ProductFeatureEditorErrorMap = {
    rows: {},
    values: {},
    modal: [],
  };

  input.errors.forEach((error) => {
    const field = error.field ?? [];
    const featureIndex = Number(field[1]);
    const valueIndex = Number(field[3]);
    const featureRow: AttributeEditorRow | undefined = Number.isInteger(featureIndex)
      ? input.draft.featureRowsByInputIndex[featureIndex]
      : undefined;

    if (!featureRow) {
      errorMap.modal.push(formatProductFeatureUserError(error));
      return;
    }

    if (field[2] === "values" && Number.isInteger(valueIndex)) {
      const value: AttributeEditorValue | undefined =
        input.draft.valuesByInputPath[
          `features.${featureIndex}.values.${valueIndex}`
        ];

      if (value) {
        pushError(errorMap.values, value.id, error.message);
        return;
      }
    }

    pushError(errorMap.rows, featureRow.id, error.message);
  });

  return errorMap;
}
