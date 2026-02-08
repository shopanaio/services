import { BaseScript } from "../../kernel/BaseScript.js";
import { isValidSlug } from "../shared/slug.js";
import type { FacetCreateParams, FacetResult } from "./dto/index.js";

const ALLOWED_TYPES = new Set(["price", "tag", "feature", "option", "in_stock"]);
const UI_BY_TYPE: Record<string, string[]> = {
  price: ["range", "checkbox", "radio", "dropdown"],
  tag: ["checkbox", "radio", "dropdown"],
  feature: ["checkbox", "radio", "dropdown"],
  option: ["checkbox", "radio", "dropdown"],
  in_stock: ["boolean", "checkbox", "radio", "dropdown"],
};

export class FacetCreateScript extends BaseScript<FacetCreateParams, FacetResult> {
  protected async execute(params: FacetCreateParams): Promise<FacetResult> {
    if (!ALLOWED_TYPES.has(params.facetType)) {
      return {
        facet: undefined,
        userErrors: [{ message: "Invalid facet type", field: ["facetType"], code: "INVALID" }],
      };
    }

    if (!isValidSlug(params.slug)) {
      return {
        facet: undefined,
        userErrors: [{ message: "Invalid facet slug", field: ["slug"], code: "INVALID_SLUG" }],
      };
    }

    const existing = await this.repository.facet.findBySlug(params.slug);
    if (existing) {
      return {
        facet: undefined,
        userErrors: [{ message: "Facet slug already exists", field: ["slug"], code: "DUPLICATE" }],
      };
    }

    if (params.uiType && !UI_BY_TYPE[params.facetType]?.includes(params.uiType)) {
      return {
        facet: undefined,
        userErrors: [{ message: "Invalid uiType for facetType", field: ["uiType"], code: "INVALID" }],
      };
    }

    const facet = await this.repository.facet.create({
      facetType: params.facetType,
      slug: params.slug,
      label: params.label,
      uiType: params.uiType,
      selectionMode: params.selectionMode,
      groupId: params.groupId ?? undefined,
      sortIndex: params.sortIndex,
    });

    return { facet, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetResult {
    return {
      facet: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
