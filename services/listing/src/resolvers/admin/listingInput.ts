import { GraphQLError } from "graphql";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import {
  DEFAULT_LISTING_PAGE_SIZE,
  MAX_LISTING_PAGE_SIZE,
  type ListingFacetValueFilter,
  type ListingOrderByInput,
  type ListingProductFilter,
  type ListingQueryArgs,
  type ListingScopeInput,
} from "./ListingQueryTypes.js";
import {
  StorefrontRepositoryValidationError,
  type StorefrontListingFilterInput,
  type StorefrontListingInput,
  type StorefrontListingScope,
  type StorefrontSortInput,
} from "../../repositories/storefront/types.js";
import { SearchRuntimeError } from "../../search/errors.js";

interface ListingInputDefaults {
  locale: string;
  currency: string;
}

export class ListingResolverInputError extends Error {
  constructor(
    message: string,
    public readonly field?: readonly string[]
  ) {
    super(message);
    this.name = "ListingResolverInputError";
  }
}

export function toStorefrontListingInput(
  args: ListingQueryArgs,
  defaults: ListingInputDefaults
): StorefrontListingInput {
  const first = normalizePageSize(args);
  const filters = normalizeListingFilters(args.facets ?? []);
  const query = args.query?.trim() || undefined;

  return {
    scope: normalizeListingScope(args.scope ?? null, args.query),
    query,
    locale: args.locale?.trim() || defaults.locale,
    currency: args.currency?.trim() || defaults.currency,
    filters,
    sort: normalizeListingSort(args.orderBy ?? null),
    first,
    after: args.after ?? null,
  };
}

export function normalizeListingFilters(
  filters: readonly ListingProductFilter[]
): StorefrontListingFilterInput[] {
  return filters.map((filter) => {
    const keys = [
      filter.available !== undefined && filter.available !== null
        ? "available"
        : null,
      filter.price ? "price" : null,
      nonEmpty(filter.productVendor) ? "productVendor" : null,
      nonEmpty(filter.tag) ? "tag" : null,
      filter.variantOption ? "variantOption" : null,
      filter.productFacet ? "productFacet" : null,
      filter.variantFacet ? "variantFacet" : null,
    ].filter(Boolean);

    if (keys.length !== 1) {
      throw new ListingResolverInputError(
        "ListingProductFilter requires exactly one field",
        ["facets"]
      );
    }

    if (filter.available !== undefined && filter.available !== null) {
      return { kind: "in_stock", value: filter.available };
    }
    if (filter.price) {
      const priceFilter = {
        kind: "price" as const,
        minPriceMinor: optionalMinorUnit(filter.price.min, "price.min"),
        maxPriceMinor: optionalMinorUnit(filter.price.max, "price.max"),
      };
      assertPriceBounds(priceFilter);
      return priceFilter;
    }
    if (nonEmpty(filter.productVendor)) {
      return { kind: "vendor", vendorIds: [filter.productVendor.trim()] };
    }
    if (nonEmpty(filter.tag)) {
      return {
        kind: "facet",
        facetSlug: "tag",
        valueHandles: [filter.tag.trim()],
      };
    }
    if (filter.variantOption) {
      return {
        kind: "facet",
        facetSlug: requiredText(filter.variantOption.name, "variantOption.name"),
        valueHandles: [
          requiredText(filter.variantOption.value, "variantOption.value"),
        ],
      };
    }
    if (filter.productFacet) {
      return facetFilter(filter.productFacet);
    }
    if (filter.variantFacet) {
      return facetFilter(filter.variantFacet);
    }

    throw new ListingResolverInputError("Unsupported ListingProductFilter", [
      "facets",
    ]);
  });
}

export function filterSelectionKey(
  filter: StorefrontListingFilterInput | ListingProductFilter
): string {
  if ("kind" in filter) {
    switch (filter.kind) {
      case "in_stock":
        return `in_stock:${filter.value}`;
      case "price":
        return `price:${filter.minPriceMinor ?? ""}:${filter.maxPriceMinor ?? ""}`;
      case "vendor":
        return `vendor:${filter.vendorIds.join(",")}`;
      case "facet":
        return `facet:${filter.facetSlug}:${filter.valueHandles.join(",")}`;
    }
  }

  if (filter.available !== undefined && filter.available !== null) {
    return `in_stock:${filter.available}`;
  }
  if (filter.price) {
    return `price:${filter.price.min ?? ""}:${filter.price.max ?? ""}`;
  }
  if (filter.productVendor) return `vendor:${filter.productVendor}`;
  if (filter.tag) return `facet:tag:${filter.tag}`;
  if (filter.variantOption) {
    return `facet:${filter.variantOption.name}:${filter.variantOption.value}`;
  }
  if (filter.productFacet) {
    return `facet:${filter.productFacet.facet}:${filter.productFacet.value}`;
  }
  if (filter.variantFacet) {
    return `facet:${filter.variantFacet.facet}:${filter.variantFacet.value}`;
  }
  return "";
}

export function hasSelectedPrice(
  filters: readonly StorefrontListingFilterInput[]
): boolean {
  return filters.some((filter) => filter.kind === "price");
}

export function toGraphqlListingError(error: unknown): unknown {
  if (error instanceof GraphQLError) {
    return error;
  }

  if (
    error instanceof ListingResolverInputError ||
    error instanceof StorefrontRepositoryValidationError ||
    error instanceof SearchRuntimeError
  ) {
    return new GraphQLError(error.message, {
      extensions: {
        code:
          error instanceof StorefrontRepositoryValidationError
            ? (error.code ?? "BAD_USER_INPUT")
            : error instanceof SearchRuntimeError
              ? error.code
              : "BAD_USER_INPUT",
        field:
          error instanceof SearchRuntimeError ? ["query"] : error.field,
      },
    });
  }

  return error;
}

export function throwGraphqlListingError(error: unknown): never {
  throw toGraphqlListingError(error);
}

function normalizeListingScope(
  scope: ListingScopeInput | null,
  query: string | null | undefined
): StorefrontListingScope {
  const kind = scope?.kind ?? (query?.trim() ? "SEARCH" : null);
  const categoryId = scope?.categoryId ?? null;

  if (!kind) {
    throw new ListingResolverInputError(
      "Listing scope requires CATEGORY or a non-empty search query",
      ["scope"]
    );
  }

  switch (kind) {
    case "SEARCH":
      assertNoScopeIds(categoryId);
      if (!query?.trim()) {
        throw new ListingResolverInputError(
          "SEARCH listing scope requires a non-empty query",
          ["query"]
        );
      }
      return { kind: "global" };
    case "CATEGORY":
      if (!categoryId) {
        throw new ListingResolverInputError(
          "CATEGORY listing scope requires categoryId",
          ["scope", "categoryId"]
        );
      }
      return {
        kind: "category",
        categoryId: decodeListingGlobalId(
          categoryId,
          GlobalIdEntity.Category,
          ["scope", "categoryId"]
        ),
      };
  }
}

function normalizeListingSort(
  orderBy: ListingOrderByInput | null
): StorefrontSortInput | undefined {
  if (!orderBy) return undefined;

  switch (orderBy.by) {
    case "MANUAL":
      return { kind: "manual" };
    case "RELEVANCE":
      return { kind: "relevance" };
    case "NEWEST":
      return { kind: "newest" };
    case "CREATED":
      return { kind: "created" };
    case "NAME":
      return {
        kind: orderBy.direction === "desc" ? "name_desc" : "name_asc",
      };
    case "PRICE":
      return {
        kind: orderBy.direction === "desc" ? "price_desc" : "price_asc",
      };
  }
}

function normalizePageSize(args: ListingQueryArgs): number {
  if (args.first != null && args.last != null) {
    throw new ListingResolverInputError("Use either first or last, not both", [
      "first",
      "last",
    ]);
  }
  if (args.after != null && args.before != null) {
    throw new ListingResolverInputError("Use either after or before, not both", [
      "after",
      "before",
    ]);
  }
  if (args.last != null || args.before != null) {
    throw new ListingResolverInputError(
      "Backward listing pagination is not supported yet",
      args.last != null ? ["last"] : ["before"]
    );
  }

  const value = args.first ?? DEFAULT_LISTING_PAGE_SIZE;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ListingResolverInputError(
      "Listing page size must be a positive safe integer",
      ["first"]
    );
  }
  return Math.min(value, MAX_LISTING_PAGE_SIZE);
}

function assertNoScopeIds(categoryId: string | null): void {
  if (categoryId) {
    throw new ListingResolverInputError(
      "SEARCH listing scope does not accept scope IDs",
      ["scope"]
    );
  }
}

function facetFilter(
  input: ListingFacetValueFilter
): StorefrontListingFilterInput {
  return {
    kind: "facet",
    facetSlug: requiredText(input.facet, "facet"),
    valueHandles: [requiredText(input.value, "value")],
  };
}

function assertPriceBounds(input: {
  minPriceMinor?: number;
  maxPriceMinor?: number;
}): void {
  if (input.minPriceMinor === undefined && input.maxPriceMinor === undefined) {
    throw new ListingResolverInputError(
      "Price filter requires at least one bound",
      ["facets", "price"]
    );
  }
  if (
    input.minPriceMinor !== undefined &&
    input.maxPriceMinor !== undefined &&
    input.minPriceMinor > input.maxPriceMinor
  ) {
    throw new ListingResolverInputError(
      "Price filter min bound must not exceed max bound",
      ["facets", "price"]
    );
  }
}

function optionalMinorUnit(
  value: string | number | null | undefined,
  label: string
): number | undefined {
  if (value === null || value === undefined) return undefined;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ListingResolverInputError(
      "Price filter bounds must be non-negative safe integers",
      ["facets", label]
    );
  }
  return parsed;
}

function requiredText(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ListingResolverInputError(
      `Listing filter ${label} must be a non-empty string`,
      ["facets", label]
    );
  }
  return trimmed;
}

function nonEmpty(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function decodeListingGlobalId(
  value: string,
  expectedType: GlobalIdType,
  field: readonly string[]
): string {
  try {
    return decodeGlobalIdByType(value, expectedType);
  } catch {
    throw new ListingResolverInputError("Invalid listing global ID", field);
  }
}
