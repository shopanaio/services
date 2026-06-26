import type {
  ApiGenericUserError,
  ApiOperationResult,
  ApiProductUpdateInput,
  ApiVariantOperationInput,
} from "@/graphql/types";
import { OperationType, VariantOperationAction } from "@/graphql/types";
import type { VariantEditorSaveRow } from "./product-variant-editor.mapper";

export type ProductFormErrorField =
  | "title"
  | "handle"
  | "description"
  | "media"
  | "options"
  | "variants";

export interface ProductFormError {
  field: ProductFormErrorField;
  message: string;
}

const FIELD_ALIASES: Record<string, ProductFormErrorField> = {
  title: "title",
  handle: "handle",
  description: "description",
  media: "media",
  mediaFileIds: "media",
  options: "options",
  variants: "variants",
};

export function mapProductUserErrorToFormError(
  error: ApiGenericUserError,
): ProductFormError | null {
  const fieldPath = error.field ?? [];
  const field = [...fieldPath].reverse().find((part) => FIELD_ALIASES[part]);

  if (!field) {
    return null;
  }

  return {
    field: FIELD_ALIASES[field],
    message: error.message,
  };
}

export function mapProductUserErrorsToFormErrors(
  errors: ApiGenericUserError[],
): ProductFormError[] {
  return errors
    .map((error) => mapProductUserErrorToFormError(error))
    .filter((error): error is ProductFormError => error !== null);
}

export interface ProductUpdateErrorSource {
  userErrors: ApiGenericUserError[];
  operationResults: ApiOperationResult[];
}

function formatOperationType(type: ApiOperationResult["type"]): string {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeProductUpdateErrors(
  result: ProductUpdateErrorSource,
): ApiGenericUserError[] {
  const errors = [...result.userErrors];

  for (const operationResult of result.operationResults) {
    errors.push(...operationResult.errors);

    if (!operationResult.applied && operationResult.errors.length === 0) {
      errors.push({
        code: "OPERATION_NOT_APPLIED",
        message: `${formatOperationType(operationResult.type)} was not applied.`,
      });
    }
  }

  return errors;
}

export interface VariantOperationRowStateInput {
  existingRows: VariantEditorSaveRow[];
  draftRows: VariantEditorSaveRow[];
  additionalOperations?: ApiProductUpdateInput;
  submittedVariantOperations?: ApiVariantOperationInput[];
  operationResults: ApiOperationResult[];
  userErrors: ApiGenericUserError[];
}

export interface VariantOperationRowState {
  rowErrors: Record<string, string | null>;
  materializedDraftRows: Array<{
    clientMutationId: string;
    entityId: string;
    applied: boolean;
    errors: ApiGenericUserError[];
  }>;
  firstMessage: string | null;
}

function getVariantIndexFromFieldPath(
  fieldPath: readonly string[] | null | undefined,
): number | null {
  if (!fieldPath) {
    return null;
  }

  const variantsIndex = fieldPath.findIndex((part) => part === "variants");
  if (variantsIndex < 0) {
    return null;
  }

  const maybeIndex = Number(fieldPath[variantsIndex + 1]);

  return Number.isInteger(maybeIndex) ? maybeIndex : null;
}

function collectErrorMessage(errors: ApiGenericUserError[]): string | null {
  if (errors.length === 0) {
    return null;
  }

  return errors.map((error) => error.message).join(" ");
}

function getFallbackRowForVariantIndex(
  input: VariantOperationRowStateInput,
  index: number,
): VariantEditorSaveRow | null {
  const submittedOperation = input.submittedVariantOperations?.[index];
  const additionalOperation = input.additionalOperations?.variants?.[index];
  const operation = submittedOperation ?? additionalOperation;

  if (operation?.action === VariantOperationAction.Create) {
    return input.draftRows.find(
      (row) => row.clientMutationId === operation.clientMutationId,
    ) ?? null;
  }

  if (operation?.variantId) {
    return input.existingRows.find(
      (row) => row.id === operation.variantId,
    ) ?? null;
  }

  return [...input.existingRows, ...input.draftRows][index] ?? null;
}

export function mapVariantOperationResultsToRowState(
  input: VariantOperationRowStateInput,
): VariantOperationRowState {
  const rowErrors: Record<string, string | null> = {};
  const materializedDraftRows: VariantOperationRowState["materializedDraftRows"] =
    [];
  const draftRowsByClientMutationId = new Map(
    input.draftRows
      .filter((row) => row.clientMutationId)
      .map((row) => [row.clientMutationId as string, row]),
  );
  const existingRowsById = new Map(
    input.existingRows.map((row) => [row.id, row]),
  );
  let firstMessage: string | null = null;

  for (const [index, operationResult] of input.operationResults.entries()) {
    const message =
      collectErrorMessage(operationResult.errors) ??
      (!operationResult.applied
        ? `${formatOperationType(operationResult.type)} was not applied.`
        : null);

    if (!firstMessage && message) {
      firstMessage = message;
    }

    if (operationResult.type === OperationType.VariantCreate) {
      const fallbackRow = getFallbackRowForVariantIndex(input, index);
      const clientMutationId =
        operationResult.clientMutationId ??
        fallbackRow?.clientMutationId ??
        undefined;
      const draftRow = clientMutationId
        ? draftRowsByClientMutationId.get(clientMutationId)
        : undefined;

      if (clientMutationId && operationResult.entityId) {
        materializedDraftRows.push({
          clientMutationId,
          entityId: operationResult.entityId,
          applied: operationResult.applied,
          errors: operationResult.errors,
        });
      }

      const rowId = operationResult.entityId ?? draftRow?.id;
      if (rowId && message) {
        rowErrors[rowId] = message;
      }
      continue;
    }

    if (operationResult.type === OperationType.VariantUpdate) {
      const rowId =
        operationResult.entityId ??
        getFallbackRowForVariantIndex(input, index)?.id;

      if (rowId && message && existingRowsById.has(rowId)) {
        rowErrors[rowId] = message;
      } else if (rowId && message) {
        rowErrors[rowId] = message;
      }
    }
  }

  for (const userError of input.userErrors) {
    const index = getVariantIndexFromFieldPath(userError.field);

    if (index === null) {
      if (!firstMessage) {
        firstMessage = userError.message;
      }
      continue;
    }

    const row = getFallbackRowForVariantIndex(input, index);
    if (!row) {
      if (!firstMessage) {
        firstMessage = userError.message;
      }
      continue;
    }

    rowErrors[row.id] = rowErrors[row.id]
      ? `${rowErrors[row.id]} ${userError.message}`
      : userError.message;

    if (!firstMessage) {
      firstMessage = userError.message;
    }
  }

  return {
    rowErrors,
    materializedDraftRows,
    firstMessage,
  };
}
