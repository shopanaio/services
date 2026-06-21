import type { ApiGenericUserError } from "@/graphql/types";
import type {
  OptionEditorGroup,
  OptionEditorValue,
} from "../modals/edit-options-modal/types";
import type { ProductOptionsSyncDraft } from "./product-options.mapper";

export interface ProductOptionEditorErrorMap {
  groups: Record<string, string[]>;
  values: Record<string, string[]>;
  modal: string[];
}

function formatFieldPath(field: string[] | null | undefined): string | null {
  if (!field || field.length === 0) {
    return null;
  }

  return field.join(".");
}

export function formatProductOptionUserError(
  error: ApiGenericUserError,
): string {
  const fieldPath = formatFieldPath(error.field);

  return fieldPath ? `${fieldPath}: ${error.message}` : error.message;
}

export function formatProductOptionUserErrors(
  errors: ApiGenericUserError[],
): string[] {
  return errors.map(formatProductOptionUserError);
}

function pushError(
  target: Record<string, string[]>,
  key: string,
  message: string,
): void {
  target[key] = [...(target[key] ?? []), message];
}

export function mapProductOptionUserErrorsToEditorErrors(input: {
  errors: ApiGenericUserError[];
  draft: ProductOptionsSyncDraft;
}): ProductOptionEditorErrorMap {
  const errorMap: ProductOptionEditorErrorMap = {
    groups: {},
    values: {},
    modal: [],
  };

  input.errors.forEach((error) => {
    const field = error.field ?? [];
    const optionIndex = Number(field[1]);
    const valueIndex = Number(field[3]);
    const group: OptionEditorGroup | undefined = Number.isInteger(optionIndex)
      ? input.draft.optionGroupsByInputIndex[optionIndex]
      : undefined;

    if (!group) {
      errorMap.modal.push(formatProductOptionUserError(error));
      return;
    }

    if (field[2] === "values" && Number.isInteger(valueIndex)) {
      const value: OptionEditorValue | undefined =
        input.draft.valuesByInputPath[
          `options.${optionIndex}.values.${valueIndex}`
        ];

      if (value) {
        pushError(errorMap.values, value.id, error.message);
        return;
      }
    }

    pushError(errorMap.groups, group.id, error.message);
  });

  return errorMap;
}
