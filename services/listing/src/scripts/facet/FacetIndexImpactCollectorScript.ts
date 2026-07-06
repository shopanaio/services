import { BaseScript } from "../../kernel/BaseScript.js";
import type { Facet, FacetValue } from "../../repositories/models/index.js";

export type FacetIndexImpactSourceRef = {
  facetType: "TAG" | "FEATURE" | "OPTION";
  sourceHandle: string;
  sourceValueHandle?: string;
};

export interface FacetIndexImpactCollectorParams {
  facetIds?: string[];
  valueIds?: string[];
  activeOnly?: boolean;
}

export interface FacetIndexImpactCollectorResult {
  refs: FacetIndexImpactSourceRef[];
  facetIds: string[];
}

const FACET_TYPES_WITH_VALUES = new Set(["TAG", "FEATURE", "OPTION"]);

export class FacetIndexImpactCollectorScript extends BaseScript<
  FacetIndexImpactCollectorParams,
  FacetIndexImpactCollectorResult
> {
  protected async execute(
    params: FacetIndexImpactCollectorParams
  ): Promise<FacetIndexImpactCollectorResult> {
    const activeOnly = params.activeOnly ?? false;
    const sourceValues = await this.collectSourceValues(params);
    const facetIds = [
      ...new Set([
        ...(params.facetIds ?? []),
        ...sourceValues.map((value) => value.facetId),
      ]),
    ];
    const facets = await this.repository.facet.getByIds(facetIds);
    const facetById = new Map(facets.map((facet) => [facet.id, facet]));

    const refs = sourceValues
      .filter((value) => isValueEligible(value, activeOnly))
      .map((value) => sourceRefFromValue(facetById.get(value.facetId), value))
      .filter((ref): ref is FacetIndexImpactSourceRef => ref !== null);

    return {
      refs: uniqueSourceRefs(refs),
      facetIds: facets
        .filter((facet) => FACET_TYPES_WITH_VALUES.has(facet.facetType))
        .map((facet) => facet.id)
        .sort(),
    };
  }

  protected handleError(error: unknown): never {
    throw error;
  }

  private async collectSourceValues(
    params: FacetIndexImpactCollectorParams
  ): Promise<FacetValue[]> {
    const sourceValuesById = new Map<string, FacetValue>();

    const facetIds = [...new Set(params.facetIds ?? [])];
    if (facetIds.length > 0) {
      const values = await this.repository.facetValue.getSourceValuesByFacetIds(
        facetIds
      );
      for (const value of values) {
        sourceValuesById.set(value.id, value);
      }
    }

    const valueIds = [...new Set(params.valueIds ?? [])];
    if (valueIds.length > 0) {
      const values = await this.repository.facetValue.getByIds(valueIds);
      const displayIds = values
        .filter((value) => value.kind === "display")
        .map((value) => value.id);
      const displayChildren =
        await this.repository.facetValue.getSourceChildrenByParentIds(
          displayIds
        );

      for (const value of [...values, ...displayChildren]) {
        if (value.kind === "source") {
          sourceValuesById.set(value.id, value);
        }
      }
    }

    return [...sourceValuesById.values()].sort(
      (left, right) =>
        left.facetId.localeCompare(right.facetId) ||
        left.handle.localeCompare(right.handle) ||
        left.id.localeCompare(right.id)
    );
  }
}

function isValueEligible(value: FacetValue, activeOnly: boolean): boolean {
  if (!activeOnly) return true;
  return value.enabled && value.referenceStatus === "VALID";
}

function sourceRefFromValue(
  facet: Facet | undefined,
  value: FacetValue
): FacetIndexImpactSourceRef | null {
  if (!facet || !FACET_TYPES_WITH_VALUES.has(facet.facetType)) {
    return null;
  }

  if (facet.facetType === "TAG") {
    return {
      facetType: "TAG",
      sourceHandle: "tags",
      sourceValueHandle: value.handle,
    };
  }

  const sourceHandle = sourceHandleFromComposite(value.handle);
  if (!sourceHandle) return null;

  return {
    facetType: facet.facetType as "FEATURE" | "OPTION",
    sourceHandle,
    sourceValueHandle: value.handle,
  };
}

function sourceHandleFromComposite(handle: string): string | null {
  const separator = handle.indexOf(":");
  if (separator <= 0) return null;
  return handle.slice(0, separator);
}

function uniqueSourceRefs(
  refs: readonly FacetIndexImpactSourceRef[]
): FacetIndexImpactSourceRef[] {
  return [
    ...new Map(
      refs.map((ref) => [
        `${ref.facetType}\0${ref.sourceHandle}\0${ref.sourceValueHandle ?? ""}`,
        ref,
      ])
    ).values(),
  ].sort(
    (left, right) =>
      left.facetType.localeCompare(right.facetType) ||
      left.sourceHandle.localeCompare(right.sourceHandle) ||
      (left.sourceValueHandle ?? "").localeCompare(right.sourceValueHandle ?? "")
  );
}
