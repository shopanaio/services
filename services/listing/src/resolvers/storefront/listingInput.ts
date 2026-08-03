import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { GraphQLError } from "graphql";
import type {
  StorefrontListingFilterInput,
  StorefrontListingInput,
  StorefrontSortInput,
} from "../../repositories/storefront/types.js";
import { StorefrontRepositoryValidationError } from "../../repositories/storefront/types.js";
import { SearchRuntimeError } from "../../search/errors.js";
import {
  Availability,
  ListingSort,
  type ListingFilterInput,
  type PriceRangeFilterInput,
} from "./generated/types.js";
import type { ProductConnectionInput } from "./ListingQueryTypes.js";
import { currencyDecimalPlaces } from "./money.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface NormalizedListingRequest {
  repositoryInput: StorefrontListingInput;
  sort: ListingSort;
  availableSorts: ListingSort[];
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

export function normalizeListingRequest(
  input: ProductConnectionInput,
  defaults: { locale: string; currency: string }
): NormalizedListingRequest {
  const query = normalizeQuery(input.query, input.entryPoint === "search");
  const availableSorts = resolveAvailableSorts(input.entryPoint, !!query);
  const sort = resolveSort(input, query, availableSorts);
  const scope =
    input.entryPoint === "category"
      ? {
          kind: "category" as const,
          categoryId: requiredCategoryId(input.categoryId),
        }
      : { kind: "global" as const };
  const locale = defaults.locale.trim();
  const currency = defaults.currency.trim().toUpperCase();
  if (!locale) {
    throw new GraphQLError("Storefront locale is not configured", {
      extensions: { code: "STORE_CONFIGURATION_ERROR" },
    });
  }
  currencyDecimalPlaces(currency);

  return {
    repositoryInput: {
      scope,
      locale,
      currency,
      query: query ?? undefined,
      filters: normalizeFilters(input.filters ?? [], currency),
      sort: toRepositorySort(sort),
      first: normalizePageSize(input.first),
      after: input.after ?? null,
    },
    sort,
    availableSorts,
  };
}

export function throwGraphqlListingError(error: unknown): never {
  if (error instanceof GraphQLError) throw error;

  if (
    error instanceof ListingResolverInputError ||
    error instanceof StorefrontRepositoryValidationError ||
    error instanceof SearchRuntimeError
  ) {
    throw new GraphQLError(error.message, {
      extensions: {
        code:
          error instanceof StorefrontRepositoryValidationError
            ? (error.code ?? "BAD_USER_INPUT")
            : error instanceof SearchRuntimeError
              ? error.code
              : "BAD_USER_INPUT",
        field:
          error instanceof SearchRuntimeError
            ? error.code === "SEARCH_NORMALIZATION_FAILED"
              ? ["query"]
              : undefined
            : error.field,
      },
    });
  }

  throw error;
}

function normalizeFilters(
  filters: readonly ListingFilterInput[],
  currency: string
): StorefrontListingFilterInput[] {
  return filters.map((filter, index) => {
    const field = ["filters", String(index)];
    const keys = [
      filter.facet != null ? "facet" : null,
      filter.vendorId != null ? "vendorId" : null,
      filter.price != null ? "price" : null,
      filter.availability != null ? "availability" : null,
    ].filter(Boolean);

    if (keys.length !== 1) {
      throw new ListingResolverInputError(
        "ListingFilterInput requires exactly one field",
        field
      );
    }

    if (filter.facet) {
      const facetSlug = requiredText(filter.facet.facet, [...field, "facet"]);
      const valueHandle = requiredText(filter.facet.value, [...field, "value"]);
      return {
        kind: "facet",
        facetSlug,
        valueHandles: [valueHandle],
      };
    }
    if (filter.vendorId != null) {
      return {
        kind: "vendor",
        vendorIds: [decodeVendorId(filter.vendorId, [...field, "vendorId"])],
      };
    }
    if (filter.price) {
      return normalizePriceFilter(filter.price, currency, [...field, "price"]);
    }
    if (filter.availability != null) {
      return {
        kind: "in_stock",
        value: filter.availability === Availability.Available,
      };
    }

    throw new ListingResolverInputError("Unsupported listing filter", field);
  });
}

function normalizePriceFilter(
  input: PriceRangeFilterInput,
  currency: string,
  field: readonly string[]
): StorefrontListingFilterInput {
  if (input.min == null && input.max == null) {
    throw new ListingResolverInputError(
      "Price filter requires at least one bound",
      field
    );
  }

  const minPriceMinor =
    input.min == null
      ? undefined
      : decimalToMinorUnits(input.min, currency, [...field, "min"]);
  const maxPriceMinor =
    input.max == null
      ? undefined
      : decimalToMinorUnits(input.max, currency, [...field, "max"]);
  if (
    minPriceMinor !== undefined &&
    maxPriceMinor !== undefined &&
    minPriceMinor > maxPriceMinor
  ) {
    throw new ListingResolverInputError(
      "Price filter min bound must not exceed max bound",
      field
    );
  }
  return { kind: "price", minPriceMinor, maxPriceMinor };
}

function decimalToMinorUnits(
  value: string,
  currency: string,
  field: readonly string[]
): number {
  const text = String(value).trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d+))?$/.exec(text);
  if (!match) {
    throw new ListingResolverInputError(
      "Price bounds must be non-negative decimal amounts",
      field
    );
  }

  const decimalPlaces = currencyDecimalPlaces(currency);
  const whole = match[1];
  const fraction = match[2] ?? "";
  const excess = fraction.slice(decimalPlaces);
  if (excess && /[1-9]/.test(excess)) {
    throw new ListingResolverInputError(
      `Price bounds support at most ${decimalPlaces} decimal places for ${currency}`,
      field
    );
  }
  const normalizedFraction = fraction
    .slice(0, decimalPlaces)
    .padEnd(decimalPlaces, "0");
  const minor = BigInt(`${whole}${normalizedFraction}`);
  if (minor > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new ListingResolverInputError("Price bound is too large", field);
  }
  return Number(minor);
}

function resolveSort(
  input: ProductConnectionInput,
  query: string | null,
  availableSorts: readonly ListingSort[]
): ListingSort {
  const fallback =
    input.entryPoint === "category"
      ? query
        ? ListingSort.Relevance
        : ListingSort.Manual
      : input.entryPoint === "search"
        ? ListingSort.Relevance
        : ListingSort.Newest;
  const sort = input.sort ?? fallback;
  if (!availableSorts.includes(sort)) {
    throw new ListingResolverInputError(
      `Sort ${sort} is not available for this listing context`,
      ["sort"]
    );
  }
  return sort;
}

function resolveAvailableSorts(
  entryPoint: ProductConnectionInput["entryPoint"],
  hasQuery: boolean
): ListingSort[] {
  return [
    ...(entryPoint === "category" ? [ListingSort.Manual] : []),
    ...(hasQuery ? [ListingSort.Relevance] : []),
    ListingSort.Newest,
    ListingSort.CreatedAt,
    ListingSort.TitleAsc,
    ListingSort.TitleDesc,
    ListingSort.PriceAsc,
    ListingSort.PriceDesc,
  ];
}

function toRepositorySort(sort: ListingSort): StorefrontSortInput {
  switch (sort) {
    case ListingSort.Manual:
      return { kind: "manual" };
    case ListingSort.Relevance:
      return { kind: "relevance" };
    case ListingSort.Newest:
      return { kind: "newest" };
    case ListingSort.CreatedAt:
      return { kind: "created" };
    case ListingSort.TitleAsc:
      return { kind: "name_asc" };
    case ListingSort.TitleDesc:
      return { kind: "name_desc" };
    case ListingSort.PriceAsc:
      return { kind: "price_asc" };
    case ListingSort.PriceDesc:
      return { kind: "price_desc" };
  }
}

function normalizeQuery(
  value: string | null | undefined,
  required: boolean
): string | null {
  const normalized = value?.trim().replace(/\s+/gu, " ") ?? "";
  if (!normalized) {
    if (required) {
      throw new ListingResolverInputError(
        "Search query must contain at least one Unicode code point",
        ["query"]
      );
    }
    return null;
  }
  if ([...normalized].length > 128) {
    throw new ListingResolverInputError(
      "Search query exceeds 128 Unicode code points",
      ["query"]
    );
  }
  return normalized;
}

function normalizePageSize(value: number | null | undefined): number {
  const first = value ?? DEFAULT_PAGE_SIZE;
  if (!Number.isSafeInteger(first) || first < 1 || first > MAX_PAGE_SIZE) {
    throw new ListingResolverInputError(
      `first must be between 1 and ${MAX_PAGE_SIZE}`,
      ["first"]
    );
  }
  return first;
}

function requiredCategoryId(categoryId: string | undefined): string {
  if (!categoryId) {
    throw new ListingResolverInputError("Category scope requires categoryId");
  }
  return categoryId;
}

function decodeVendorId(value: string, field: readonly string[]): string {
  try {
    return decodeGlobalIdByType(value, GlobalIdEntity.Vendor);
  } catch {
    throw new ListingResolverInputError("Invalid vendor global ID", field);
  }
}

function requiredText(value: string, field: readonly string[]): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new ListingResolverInputError("Filter value must not be empty", field);
  }
  return trimmed;
}
