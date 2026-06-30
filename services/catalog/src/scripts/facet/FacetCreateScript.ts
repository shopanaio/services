import { BaseScript, Transactional } from "../../kernel/BaseScript.js";
import { isUniqueViolation } from "../../kernel/types.js";
import type { FacetValueCandidateType } from "../../repositories/facet/FacetRepository.js";
import { isValidSlug } from "../shared/slug.js";
import type {
  FacetCreateParams,
  FacetCreateValueCandidateInput,
  FacetResult,
} from "./dto/index.js";

const ALLOWED_TYPES = new Set(["PRICE", "TAG", "FEATURE", "OPTION", "IN_STOCK"]);
const UI_BY_TYPE: Record<string, string[]> = {
  PRICE: ["range", "checkbox", "radio", "dropdown"],
  TAG: ["checkbox", "radio", "dropdown"],
  FEATURE: ["checkbox", "radio", "dropdown"],
  OPTION: ["checkbox", "radio", "dropdown"],
  IN_STOCK: ["boolean", "checkbox", "radio", "dropdown"],
};
const VALUE_CANDIDATE_TYPES = new Set(["TAG", "OPTION", "FEATURE"]);

function normalizeValueCandidates(
  candidates?: FacetCreateValueCandidateInput[]
): FacetCreateValueCandidateInput[] {
  const values = candidates ?? [];
  const byHandle = new Map<string, FacetCreateValueCandidateInput>();

  for (const candidate of values) {
    const normalized = {
      handle: candidate.handle.trim(),
      label: candidate.label.trim(),
      sourceHandle: candidate.sourceHandle.trim(),
    };

    if (!normalized.handle || !normalized.label || !normalized.sourceHandle) {
      continue;
    }

    if (!byHandle.has(normalized.handle)) {
      byHandle.set(normalized.handle, normalized);
    }
  }

  return [...byHandle.values()];
}

export class FacetCreateScript extends BaseScript<FacetCreateParams, FacetResult> {
  @Transactional()
  protected async execute(params: FacetCreateParams): Promise<FacetResult> {
    if (!ALLOWED_TYPES.has(params.facetType)) {
      return {
        facet: undefined,
        userErrors: [{ message: "Invalid facet type", field: ["facetType"], code: "INVALID" }],
      };
    }

    if (!params.label || params.label.trim() === "") {
      return {
        facet: undefined,
        userErrors: [{ message: "Label is required", field: ["input", "label"], code: "REQUIRED" }],
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

    const sources = params.sources ?? [];
    if (sources.length !== 1) {
      return {
        facet: undefined,
        userErrors: [
          {
            message: "Exactly one facet source is required",
            field: ["sources"],
            code: "REQUIRED",
          },
        ],
      };
    }

    const selectedSource = {
      handle: sources[0].handle.trim(),
      name: sources[0].name.trim(),
    };

    if (!selectedSource.handle) {
      return {
        facet: undefined,
        userErrors: [
          {
            message: "Facet source handle is required",
            field: ["sources", "0", "handle"],
            code: "REQUIRED",
          },
        ],
      };
    }

    if (!selectedSource.name) {
      return {
        facet: undefined,
        userErrors: [
          {
            message: "Facet source name is required",
            field: ["sources", "0", "name"],
            code: "REQUIRED",
          },
        ],
      };
    }

    const candidate =
      await this.repository.facet.findAvailableFacetSourceCandidate({
        facetType: params.facetType,
        handle: selectedSource.handle,
      });

    if (!candidate) {
      return {
        facet: undefined,
        userErrors: [
          {
            message: "Selected facet source is not available",
            field: ["sources"],
            code: "SOURCE_NOT_AVAILABLE",
          },
        ],
      };
    }

    if (candidate.facetType !== params.facetType) {
      return {
        facet: undefined,
        userErrors: [
          {
            message: "Selected facet source type does not match facet type",
            field: ["facetType"],
            code: "INVALID",
          },
        ],
      };
    }

    if (candidate.handle !== selectedSource.handle) {
      return {
        facet: undefined,
        userErrors: [
          {
            message: "Selected facet source handle does not match candidate",
            field: ["sources", "0", "handle"],
            code: "INVALID",
          },
        ],
      };
    }

    if (params.uiType && !UI_BY_TYPE[params.facetType]?.includes(params.uiType)) {
      return {
        facet: undefined,
        userErrors: [{ message: "Invalid uiType for facetType", field: ["uiType"], code: "INVALID" }],
      };
    }

    const valueCandidates = normalizeValueCandidates(params.valueCandidates);
    if (valueCandidates.length > 0) {
      if (!VALUE_CANDIDATE_TYPES.has(params.facetType)) {
        return {
          facet: undefined,
          userErrors: [
            {
              message: "Facet value candidates are not supported for this facet type",
              field: ["valueCandidates"],
              code: "INVALID",
            },
          ],
        };
      }

      const selectedSourceHandles = new Set([selectedSource.handle]);
      const invalidSourceCandidate = valueCandidates.find(
        (candidate) => !selectedSourceHandles.has(candidate.sourceHandle)
      );
      if (invalidSourceCandidate) {
        return {
          facet: undefined,
          userErrors: [
            {
              message: "Facet value candidate source does not match selected facet source",
              field: ["valueCandidates"],
              code: "INVALID",
            },
          ],
        };
      }

      const availableCandidates =
        await this.repository.facet.findFacetValueCandidatesByHandles({
          candidateType: params.facetType as FacetValueCandidateType,
          sourceHandles: [selectedSource.handle],
          handles: valueCandidates.map((value) => value.handle),
        });
      const availableHandles = new Set(
        availableCandidates.map((candidate) => candidate.handle)
      );
      const missingCandidate = valueCandidates.find(
        (candidate) => !availableHandles.has(candidate.handle)
      );
      if (missingCandidate) {
        return {
          facet: undefined,
          userErrors: [
            {
              message: "Selected facet value candidate is no longer available",
              field: ["valueCandidates"],
              code: "SOURCE_VALUE_NOT_AVAILABLE",
            },
          ],
        };
      }
    }

    const facet = await this.repository.facet.create({
      facetType: params.facetType,
      slug: params.slug,
      label: params.label,
      uiType: params.uiType,
      selectionMode: params.selectionMode,
      lexoRank: params.lexoRank,
      sources: [selectedSource],
    });

    if (valueCandidates.length > 0) {
      await this.repository.facet.createSourceFacetValues({
        facetId: facet.id,
        values: valueCandidates.map((candidate, index) => ({
          handle: candidate.handle,
          label: candidate.label,
          sortIndex: index,
          enabled: true,
        })),
      });
    }

    return { facet, userErrors: [] };
  }

  protected handleError(error: unknown): FacetResult {
    if (isUniqueViolation(error, "facet_source_project_type_handle_uniq")) {
      return {
        facet: undefined,
        userErrors: [
          {
            message: "Selected facet source is not available",
            field: ["sources"],
            code: "SOURCE_NOT_AVAILABLE",
          },
        ],
      };
    }

    if (isUniqueViolation(error, "facet_project_id_slug_uniq")) {
      return {
        facet: undefined,
        userErrors: [
          {
            message: "Facet slug already exists",
            field: ["slug"],
            code: "DUPLICATE",
          },
        ],
      };
    }

    return {
      facet: undefined,
      userErrors: [{ message: "Internal error", code: "INTERNAL_ERROR" }],
    };
  }
}
