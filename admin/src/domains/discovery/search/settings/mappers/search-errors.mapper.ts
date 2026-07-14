import type { ApiGenericUserError, SearchField } from "@/graphql/types";

export type SearchEditorErrorTarget =
  | "name"
  | "locale"
  | "enabled"
  | "phrases"
  | "products"
  | "values"
  | `phrases.${number}`
  | `products.${number}`
  | `values.${number}`
  | "global";

export interface MappedSearchEditorError {
  target: SearchEditorErrorTarget;
  message: string;
  code: string;
}

const INDEXED_FIELD = /(phrases|productIds|values)\.(\d+)$/;

export function mapSearchEditorErrors(
  errors: ApiGenericUserError[],
): MappedSearchEditorError[] {
  return errors.map((error) => {
    const field = error.field?.join(".") ?? "";
    const indexed = field.match(INDEXED_FIELD);
    let target: SearchEditorErrorTarget = "global";

    if (indexed) {
      const section = indexed[1] === "productIds" ? "products" : indexed[1];
      target = `${section}.${Number(indexed[2])}` as SearchEditorErrorTarget;
    } else if (/name$/.test(field)) target = "name";
    else if (/locale$/.test(field)) target = "locale";
    else if (/enabled$/.test(field)) target = "enabled";
    else if (/phrases$/.test(field)) target = "phrases";
    else if (/productIds$/.test(field)) target = "products";
    else if (/values$/.test(field)) target = "values";

    return { target, message: error.message, code: error.code ?? "UNKNOWN" };
  });
}

export type SearchSettingsErrorTarget =
  | "fields"
  | `field.${SearchField}.enabled`
  | `field.${SearchField}.weight`
  | "typoToleranceEnabled"
  | "outOfStockPolicy"
  | "versionConflict"
  | "global";

export interface MappedSearchSettingsError {
  target: SearchSettingsErrorTarget;
  message: string;
  code: string;
}

export function mapSearchSettingsErrors(
  errors: ApiGenericUserError[],
  submittedIndexToField: SearchField[],
): MappedSearchSettingsError[] {
  return errors.map((error) => {
    const fieldPath = error.field?.join(".") ?? "";
    const fieldMatch = fieldPath.match(
      /(?:^|\.)input\.fields(?:\.(\d+))?(?:\.(field|weight))?$/,
    );
    let target: SearchSettingsErrorTarget = "global";

    if (error.code === "VERSION_CONFLICT" || /(?:^|\.)expectedVersion$/.test(fieldPath)) {
      target = "versionConflict";
    } else if (fieldMatch) {
      const submittedIndex = fieldMatch[1] ? Number(fieldMatch[1]) : null;
      const submittedField =
        submittedIndex === null ? null : submittedIndexToField[submittedIndex];
      if (!submittedField) target = "fields";
      else if (fieldMatch[2] === "weight") {
        target = `field.${submittedField}.weight`;
      } else {
        target = `field.${submittedField}.enabled`;
      }
    } else if (/(?:^|\.)input\.typoToleranceEnabled$/.test(fieldPath)) {
      target = "typoToleranceEnabled";
    } else if (/(?:^|\.)input\.outOfStockPolicy$/.test(fieldPath)) {
      target = "outOfStockPolicy";
    }

    return { target, message: error.message, code: error.code ?? "UNKNOWN" };
  });
}

export function hasVersionConflict(errors: ApiGenericUserError[]): boolean {
  return errors.some(
    (error) =>
      error.code === "VERSION_CONFLICT" ||
      (error.field?.join(".") ?? "").endsWith("expectedVersion"),
  );
}
