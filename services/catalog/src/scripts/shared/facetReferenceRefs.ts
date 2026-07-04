import type { FacetReferenceChange, FacetSourceRef } from "@shopana/events";
import type {
  ProductFeature,
  ProductFeatureValue,
  ProductOption,
  ProductOptionValue,
  Tag,
} from "../../repositories/models/index.js";

export function tagFacetRef(handle: string): FacetSourceRef {
  return {
    facetType: "TAG",
    sourceHandle: "tags",
    valueHandle: handle,
    facetValueHandle: handle,
  };
}

export function optionSourceFacetRef(sourceHandle: string): FacetSourceRef {
  return { facetType: "OPTION", sourceHandle };
}

export function optionValueFacetRef(
  sourceHandle: string,
  valueHandle: string
): FacetSourceRef {
  return {
    facetType: "OPTION",
    sourceHandle,
    valueHandle,
    facetValueHandle: `${sourceHandle}:${valueHandle}`,
  };
}

export function featureSourceFacetRef(sourceHandle: string): FacetSourceRef {
  return { facetType: "FEATURE", sourceHandle };
}

export function featureValueFacetRef(
  sourceHandle: string,
  valueHandle: string
): FacetSourceRef {
  return {
    facetType: "FEATURE",
    sourceHandle,
    valueHandle,
    facetValueHandle: `${sourceHandle}:${valueHandle}`,
  };
}

export function buildTagReferenceChange(input: {
  before?: Pick<Tag, "handle">;
  after?: Pick<Tag, "handle">;
  reason: FacetReferenceChange["reason"];
}): FacetReferenceChange {
  return {
    before: input.before ? tagFacetRef(input.before.handle) : undefined,
    after: input.after ? tagFacetRef(input.after.handle) : undefined,
    reason: input.reason,
  };
}

export function buildOptionSourceChange(input: {
  before?: Pick<ProductOption, "slug">;
  after?: Pick<ProductOption, "slug">;
  reason: FacetReferenceChange["reason"];
}): FacetReferenceChange {
  return {
    before: input.before ? optionSourceFacetRef(input.before.slug) : undefined,
    after: input.after ? optionSourceFacetRef(input.after.slug) : undefined,
    reason: input.reason,
  };
}

export function buildOptionValueChange(input: {
  before?: { option: Pick<ProductOption, "slug">; value: Pick<ProductOptionValue, "slug"> };
  after?: { option: Pick<ProductOption, "slug">; value: Pick<ProductOptionValue, "slug"> };
  reason: FacetReferenceChange["reason"];
}): FacetReferenceChange {
  return {
    before: input.before
      ? optionValueFacetRef(input.before.option.slug, input.before.value.slug)
      : undefined,
    after: input.after
      ? optionValueFacetRef(input.after.option.slug, input.after.value.slug)
      : undefined,
    reason: input.reason,
  };
}

export function buildFeatureSourceChange(input: {
  before?: Pick<ProductFeature, "slug">;
  after?: Pick<ProductFeature, "slug">;
  reason: FacetReferenceChange["reason"];
}): FacetReferenceChange {
  return {
    before: input.before ? featureSourceFacetRef(input.before.slug) : undefined,
    after: input.after ? featureSourceFacetRef(input.after.slug) : undefined,
    reason: input.reason,
  };
}

export function buildFeatureValueChange(input: {
  before?: { feature: Pick<ProductFeature, "slug">; value: Pick<ProductFeatureValue, "slug"> };
  after?: { feature: Pick<ProductFeature, "slug">; value: Pick<ProductFeatureValue, "slug"> };
  reason: FacetReferenceChange["reason"];
}): FacetReferenceChange {
  return {
    before: input.before
      ? featureValueFacetRef(input.before.feature.slug, input.before.value.slug)
      : undefined,
    after: input.after
      ? featureValueFacetRef(input.after.feature.slug, input.after.value.slug)
      : undefined,
    reason: input.reason,
  };
}

export function uniqueFacetReferenceChanges(
  refs: readonly FacetReferenceChange[]
): FacetReferenceChange[] {
  const seen = new Set<string>();
  const result: FacetReferenceChange[] = [];

  for (const ref of refs) {
    const key = JSON.stringify(ref);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(ref);
  }

  return result;
}
