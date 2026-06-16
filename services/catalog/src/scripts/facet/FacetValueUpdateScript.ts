import { BaseScript } from "../../kernel/BaseScript.js";
import { isValidSlug } from "../shared/slug.js";
import type { FacetValueResult, FacetValueUpdateParams } from "./dto/index.js";

export class FacetValueUpdateScript extends BaseScript<
  FacetValueUpdateParams,
  FacetValueResult
> {
  protected async execute(
    params: FacetValueUpdateParams
  ): Promise<FacetValueResult> {
    const existing = await this.repository.facetValue.findById(params.id);
    if (!existing) {
      return {
        facetValue: undefined,
        userErrors: [{ message: "Facet value not found", field: ["id"], code: "NOT_FOUND" }],
      };
    }

    const facet = await this.repository.facet.findById(existing.facetId);
    if (!facet) {
      return {
        facetValue: undefined,
        userErrors: [{ message: "Facet not found", code: "NOT_FOUND" }],
      };
    }

    if (facet.facetType === "price" || facet.facetType === "in_stock") {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "Facet values are not allowed for PRICE or IN_STOCK",
            code: "INVALID",
          },
        ],
      };
    }

    // Only validate sourceHandles if explicitly provided and empty
    if (params.sourceHandles !== undefined && params.sourceHandles.length === 0) {
      return {
        facetValue: undefined,
        userErrors: [
          {
            message: "sourceHandles cannot be empty for TAG/FEATURE/OPTION facet values",
            field: ["sourceHandles"],
            code: "INVALID",
          },
        ],
      };
    }

    if (params.slug !== undefined) {
      if (!isValidSlug(params.slug)) {
        return {
          facetValue: undefined,
          userErrors: [{ message: "Invalid value slug", field: ["slug"], code: "INVALID_SLUG" }],
        };
      }

      const siblings = await this.repository.facetValue.findByFacetId(existing.facetId);
      if (
        siblings.some((value) => value.id !== params.id && value.slug === params.slug)
      ) {
        return {
          facetValue: undefined,
          userErrors: [{ message: "Facet value slug already exists", field: ["slug"], code: "DUPLICATE" }],
        };
      }
    }

    const facetValue = await this.repository.facetValue.update(params.id, {
      slug: params.slug,
      label: params.label,
      sourceHandles: params.sourceHandles,
      swatchId: params.swatchId,
      sortIndex: params.sortIndex,
      enabled: params.enabled,
    });

    return { facetValue: facetValue ?? undefined, userErrors: [] };
  }

  protected handleError(_error: unknown): FacetValueResult {
    return {
      facetValue: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
