import { BaseScript } from "../../kernel/BaseScript.js";
import { isValidSlug } from "../shared/slug.js";
import type { FacetValueCreateParams, FacetValueResult } from "./dto/index.js";

export class FacetValueCreateScript extends BaseScript<
  FacetValueCreateParams,
  FacetValueResult
> {
  protected async execute(
    params: FacetValueCreateParams
  ): Promise<FacetValueResult> {
    const facet = await this.repository.facet.findById(params.facetId);
    if (!facet) {
      return {
        facetValue: undefined,
        userErrors: [{ message: "Facet not found", field: ["facetId"], code: "NOT_FOUND" }],
      };
    }

    if (facet.facetType === "price" || facet.facetType === "in_stock") {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "Facet values are not allowed for PRICE or IN_STOCK",
            field: ["facetId"],
            code: "INVALID",
          },
        ],
      };
    }

    if (!params.sourceHandles || params.sourceHandles.length === 0) {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "sourceHandles are required for TAG/FEATURE/OPTION facet values",
            field: ["sourceHandles"],
            code: "INVALID",
          },
        ],
      };
    }

    if (!isValidSlug(params.slug)) {
      return {
        facetValue: undefined,
        userErrors: [{ message: "Invalid value slug", field: ["slug"], code: "INVALID_SLUG" }],
      };
    }

    const existing = await this.repository.facetValue.findByFacetId(params.facetId);
    if (existing.some((value) => value.slug === params.slug)) {
      return {
        facetValue: undefined,
        userErrors: [{ message: "Facet value slug already exists", field: ["slug"], code: "DUPLICATE" }],
      };
    }

    const facetValue = await this.repository.facetValue.create({
      facetId: params.facetId,
      slug: params.slug,
      label: params.label,
      sourceHandles: params.sourceHandles,
      swatchId: params.swatchId,
      sortIndex: params.sortIndex,
      enabled: params.enabled,
    });

    return { facetValue, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetValueResult {
    return {
      facetValue: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
