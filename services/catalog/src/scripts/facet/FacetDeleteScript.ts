import { BaseScript } from "../../kernel/BaseScript.js";
import type { FacetDeleteParams, FacetDeleteResult } from "./dto/index.js";

export class FacetDeleteScript extends BaseScript<
  FacetDeleteParams,
  FacetDeleteResult
> {
  protected async execute(params: FacetDeleteParams): Promise<FacetDeleteResult> {
    const deleted = await this.repository.facet.delete(params.id);
    if (!deleted) {
      return {
        deletedFacetId: undefined,
        userErrors: [{ message: "Facet not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    return { deletedFacetId: params.id, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetDeleteResult {
    return {
      deletedFacetId: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
