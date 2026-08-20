import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import type { FacetDeleteParams, FacetDeleteResult } from "./dto/index.js";

export class FacetDeleteScript extends BaseScript<FacetDeleteParams, FacetDeleteResult> {
  @Transactional()
  protected async execute(params: FacetDeleteParams): Promise<FacetDeleteResult> {
    const existing = await this.repository.facet.findById(params.id);
    if (!existing) {
      return {
        deletedFacetId: undefined,
        deletedFacet: undefined,
        userErrors: [{ message: "Facet not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    const deleted = await this.repository.facet.delete(params.id);
    if (!deleted) {
      return {
        deletedFacetId: undefined,
        deletedFacet: undefined,
        userErrors: [{ message: "Facet not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    return { deletedFacetId: params.id, deletedFacet: existing, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetDeleteResult {
    return {
      deletedFacetId: undefined,
      deletedFacet: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
