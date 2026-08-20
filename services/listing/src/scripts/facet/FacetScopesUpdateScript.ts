import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { FacetScopesUpdateParams, FacetScopesUpdateResult } from "./dto/index.js";
import { validateFacetScopes } from "./facetScopeValidation.js";

export class FacetScopesUpdateScript extends BaseScript<
  FacetScopesUpdateParams,
  FacetScopesUpdateResult
> {
  @Transactional()
  protected async execute(params: FacetScopesUpdateParams): Promise<FacetScopesUpdateResult> {
    const userErrors: FacetScopesUpdateResult["userErrors"] = [];
    const seenIds = new Set<string>();

    for (const [index, update] of params.updates.entries()) {
      if (seenIds.has(update.id)) {
        userErrors.push({
          message: "Facet can only be updated once",
          field: ["input", "updates", String(index), "id"],
          code: "DUPLICATE",
        });
      } else {
        seenIds.add(update.id);
      }

      const scopesError = validateFacetScopes(update.scopes);
      if (scopesError) {
        userErrors.push({
          ...scopesError,
          field: ["input", "updates", String(index), "scopes"],
        });
      }
    }

    if (userErrors.length > 0) {
      return { facets: [], userErrors };
    }

    const ids = params.updates.map((update) => update.id);
    const existingFacets = await this.repository.facet.getByIds(ids);
    const existingIds = new Set(existingFacets.map((facet) => facet.id));

    for (const [index, update] of params.updates.entries()) {
      if (!existingIds.has(update.id)) {
        userErrors.push({
          message: "Facet not found",
          field: ["input", "updates", String(index), "id"],
          code: "NOT_FOUND",
        });
      }
    }

    if (userErrors.length > 0) {
      return { facets: [], userErrors };
    }

    const updatedFacets = [];
    for (const update of params.updates) {
      const facet = await this.repository.facet.update(update.id, {
        scopes: update.scopes,
      });
      if (!facet) {
        throw new Error(`Facet ${update.id} disappeared during scopes update`);
      }
      updatedFacets.push(facet);
    }

    return { facets: updatedFacets, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetScopesUpdateResult {
    return {
      facets: [],
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
