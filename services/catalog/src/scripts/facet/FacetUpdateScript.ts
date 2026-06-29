import { BaseScript } from "../../kernel/BaseScript.js";
import { isValidSlug } from "../shared/slug.js";
import type { FacetResult, FacetUpdateParams } from "./dto/index.js";

const UI_BY_TYPE: Record<string, string[]> = {
  price: ["range", "checkbox", "radio", "dropdown"],
  tag: ["checkbox", "radio", "dropdown"],
  feature: ["checkbox", "radio", "dropdown"],
  option: ["checkbox", "radio", "dropdown"],
  in_stock: ["boolean", "checkbox", "radio", "dropdown"],
};

export class FacetUpdateScript extends BaseScript<FacetUpdateParams, FacetResult> {
  protected async execute(params: FacetUpdateParams): Promise<FacetResult> {
    const existing = await this.repository.facet.findById(params.id);
    if (!existing) {
      return {
        facet: undefined,
        userErrors: [{ message: "Facet not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    if (params.slug !== undefined) {
      if (!isValidSlug(params.slug)) {
        return {
          facet: undefined,
          userErrors: [{ message: "Invalid facet slug", field: ["slug"], code: "INVALID_SLUG" }],
        };
      }
      if (params.slug !== existing.slug) {
        const duplicate = await this.repository.facet.findBySlug(params.slug);
        if (duplicate) {
          return {
            facet: undefined,
            userErrors: [{ message: "Facet slug already exists", field: ["slug"], code: "DUPLICATE" }],
          };
        }
      }
    }

    const effectiveUiType = params.uiType ?? existing.uiType;
    if (effectiveUiType && !UI_BY_TYPE[existing.facetType]?.includes(effectiveUiType)) {
      return {
        facet: undefined,
        userErrors: [{ message: "Invalid uiType for facetType", field: ["uiType"], code: "INVALID" }],
      };
    }

    const facet = await this.repository.facet.update(params.id, {
      slug: params.slug,
      label: params.label,
      uiType: params.uiType,
      selectionMode: params.selectionMode,
      groupId: params.groupId,
      sortIndex: params.sortIndex,
    });

    return { facet: facet ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetResult {
    return {
      facet: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
