import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { NormalizedCategoryHierarchyScope } from "../../repositories/category/CategoryHierarchyScope.js";
import type { NormalizedCategoryProductsScope } from "../../repositories/category/CategoryProductsScope.js";

export type { NormalizedCategoryHierarchyScope, NormalizedCategoryProductsScope };

type CategoryHierarchyScopeInput = {
  referenceId?: string | null;
  direction?: "ANCESTORS" | "DESCENDANTS" | null;
  includeReference?: boolean | null;
  mode?: "INCLUDE" | "EXCLUDE" | null;
};

type CategoryProductsScopeInput = {
  referenceIds: string[];
  mode: "INCLUDE" | "EXCLUDE";
};

export function normalizeCategoryHierarchyScopeInput(
  input: CategoryHierarchyScopeInput | null | undefined
): NormalizedCategoryHierarchyScope | undefined {
  if (!input) {
    return undefined;
  }

  if (
    input.direction !== "ANCESTORS" &&
    input.direction !== "DESCENDANTS"
  ) {
    return { kind: "empty" };
  }

  if (!input.referenceId) {
    return { kind: "empty" };
  }

  let referenceId: string;
  try {
    referenceId = decodeGlobalIdByType(
      input.referenceId,
      GlobalIdEntity.Category
    );
  } catch {
    return { kind: "empty" };
  }

  const mode = input.mode;
  if (mode !== "INCLUDE" && mode !== "EXCLUDE") {
    return { kind: "empty" };
  }

  return {
    kind: "scope",
    referenceId,
    direction: input.direction,
    includeReference: input.includeReference ?? false,
    mode,
  };
}

export function normalizeCategoryProductsScopeInput(
  input: CategoryProductsScopeInput | null | undefined
): NormalizedCategoryProductsScope | undefined {
  if (!input) {
    return undefined;
  }

  if (!input.referenceIds?.length) {
    return { kind: "empty" };
  }

  const mode = input.mode;
  if (mode !== "INCLUDE" && mode !== "EXCLUDE") {
    return { kind: "empty" };
  }

  const referenceIds: string[] = [];
  for (const id of input.referenceIds) {
    try {
      referenceIds.push(decodeGlobalIdByType(id, GlobalIdEntity.Product));
    } catch {
      return { kind: "empty" };
    }
  }

  return {
    kind: "scope",
    referenceIds: [...new Set(referenceIds)],
    mode,
  };
}
