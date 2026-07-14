import type { ApiGenericUserError } from "@/graphql/types";

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

export function hasVersionConflict(errors: ApiGenericUserError[]): boolean {
  return errors.some(
    (error) =>
      error.code === "VERSION_CONFLICT" ||
      (error.field?.join(".") ?? "").endsWith("expectedVersion"),
  );
}
