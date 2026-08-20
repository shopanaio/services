import type { UserError } from "../../kernel/BaseScript.js";
import { isFacetScopeType, type FacetScopeType } from "../../repositories/facet/facetScopes.js";

export function validateFacetScopes(
  scopes: readonly FacetScopeType[] | undefined,
): UserError | null {
  if (scopes === undefined) return null;

  if (scopes.length === 0) {
    return {
      message: "At least one facet scope is required",
      field: ["input", "scopes"],
      code: "REQUIRED",
    };
  }

  const invalidScopeIndex = scopes.findIndex((scope) => !isFacetScopeType(scope));
  if (invalidScopeIndex !== -1) {
    return {
      message: "Invalid facet scope",
      field: ["input", "scopes", String(invalidScopeIndex)],
      code: "INVALID",
    };
  }

  return null;
}
