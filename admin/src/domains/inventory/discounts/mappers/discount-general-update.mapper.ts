import type {
  ApiDiscount,
  ApiDiscountUpdateInput,
} from "@/graphql/types";
import { DiscountCodeStatus } from "@/graphql/types";

export interface DiscountCodeEditorRow {
  key: string;
  id?: string;
  clientMutationId?: string;
  code: string;
  status: DiscountCodeStatus;
  usageLimit: number | null;
  updatedAt?: string;
}

export interface DiscountGeneralFormValues {
  title: string;
  priority: number;
  codes: DiscountCodeEditorRow[];
}

const normalizeUsageLimit = (value: number | null | undefined) =>
  value == null ? null : Number(value);

export function createDiscountGeneralFormValues(
  discount: ApiDiscount,
): DiscountGeneralFormValues {
  return {
    title: discount.title ?? "",
    priority: discount.priority,
    codes: discount.codes.edges.map(({ node }) => ({
      key: node.id,
      id: node.id,
      code: node.code,
      status: node.status,
      usageLimit: normalizeUsageLimit(node.usageLimit),
      updatedAt: node.updatedAt,
    })),
  };
}

export function validateDiscountGeneralForm(
  values: DiscountGeneralFormValues,
): string[] {
  const errors: string[] = [];
  const normalizedCodes = new Set<string>();

  if (!Number.isInteger(values.priority) || values.priority < 0) {
    errors.push("Priority must be a non-negative whole number.");
  }

  values.codes.forEach((row, index) => {
    const code = row.code.trim();
    const normalizedCode = code.toLocaleUpperCase();

    if (!code) {
      errors.push(`Code ${index + 1} cannot be empty.`);
    } else if (normalizedCodes.has(normalizedCode)) {
      errors.push(`Code "${code}" is duplicated.`);
    } else {
      normalizedCodes.add(normalizedCode);
    }

    if (
      row.usageLimit != null &&
      (!Number.isInteger(row.usageLimit) || row.usageLimit < 1)
    ) {
      errors.push(
        `Usage limit for "${code || `code ${index + 1}`}" must be a positive whole number.`,
      );
    }
  });

  return errors;
}

export function buildDiscountGeneralUpdateInput(
  discount: ApiDiscount,
  values: DiscountGeneralFormValues,
): ApiDiscountUpdateInput {
  const operations: ApiDiscountUpdateInput = {};
  const title = values.title.trim();
  const originalTitle = discount.title ?? "";
  const definition: NonNullable<ApiDiscountUpdateInput["definition"]> = {};

  if (title !== originalTitle) {
    definition.title = title || null;
  }
  if (values.priority !== discount.priority) {
    definition.priority = values.priority;
  }
  if (Object.keys(definition).length > 0) {
    operations.definition = definition;
  }

  const originalRows = discount.codes.edges.map(({ node }) => node);
  const originalById = new Map(originalRows.map((row) => [row.id, row]));
  const currentIds = new Set(
    values.codes.flatMap((row) => (row.id ? [row.id] : [])),
  );

  const create = values.codes
    .filter((row) => !row.id)
    .map((row) => ({
      clientMutationId: row.clientMutationId,
      code: row.code.trim(),
      ...(row.usageLimit == null ? {} : { usageLimit: row.usageLimit }),
    }));

  const update = values.codes.flatMap((row) => {
    if (!row.id || !row.updatedAt) return [];
    const original = originalById.get(row.id);
    if (!original) return [];

    const code = row.code.trim();
    const usageLimit = normalizeUsageLimit(row.usageLimit);
    const originalUsageLimit = normalizeUsageLimit(original.usageLimit);
    const operation = {
      codeId: row.id,
      expectedUpdatedAt: row.updatedAt,
      ...(code === original.code ? {} : { code }),
      ...(row.status === original.status ? {} : { status: row.status }),
      ...(usageLimit === originalUsageLimit ? {} : { usageLimit }),
    };

    return Object.keys(operation).length > 2 ? [operation] : [];
  });

  const deleted = originalRows
    .filter((row) => !currentIds.has(row.id))
    .map((row) => ({
      codeId: row.id,
      expectedUpdatedAt: row.updatedAt,
    }));

  if (create.length > 0 || update.length > 0 || deleted.length > 0) {
    operations.codes = {
      ...(create.length > 0 ? { create } : {}),
      ...(update.length > 0 ? { update } : {}),
      ...(deleted.length > 0 ? { delete: deleted } : {}),
    };
  }

  return operations;
}
