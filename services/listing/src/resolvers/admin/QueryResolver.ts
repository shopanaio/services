import { ApolloQuery } from "@shopana/type-resolver";
import { inArray } from "drizzle-orm";
import {
  decodeGlobalIdByType,
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { ListingType } from "./ListingType.js";
import { productListingIndex } from "../../repositories/models/index.js";
import type {
  StorefrontListingFilterInput,
  StorefrontListingRepositoryResult,
  StorefrontListingScope,
  StorefrontSortInput,
} from "../../repositories/storefront/types.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type ListingScopeKind = "GLOBAL" | "SEARCH" | "CATEGORY" | "COLLECTION";
type ListingSortBy =
  | "MANUAL"
  | "RELEVANCE"
  | "NEWEST"
  | "CREATED"
  | "NAME"
  | "PRICE";
type ListingSortDirection = "asc" | "desc";

interface ListingScopeInput {
  kind: ListingScopeKind;
  categoryId?: string | null;
  collectionId?: string | null;
}

interface ListingPriceRangeFilter {
  min?: string | number | null;
  max?: string | number | null;
}

interface ListingVariantOptionFilter {
  name: string;
  value: string;
}

interface ListingFacetValueFilter {
  facet: string;
  value: string;
}

interface ListingProductFilter {
  available?: boolean | null;
  price?: ListingPriceRangeFilter | null;
  productVendor?: string | null;
  tag?: string | null;
  variantOption?: ListingVariantOptionFilter | null;
  productFacet?: ListingFacetValueFilter | null;
  variantFacet?: ListingFacetValueFilter | null;
}

interface ListingOrderByInput {
  by: ListingSortBy;
  direction?: ListingSortDirection | null;
}

interface ListingQueryArgs {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
  scope?: ListingScopeInput | null;
  query?: string | null;
  locale?: string | null;
  currency?: string | null;
  facets?: ListingProductFilter[] | null;
  orderBy?: ListingOrderByInput | null;
}

type ListingNodeReference = {
  __typename: "Bundle" | "Product";
  id: string;
};

type ProductKind = "BASE" | "BUNDLE";

@ApolloQuery
export class QueryResolver extends ListingType<Record<string, never>> {
  listingQuery() {
    return new ListingQueryResolver({}, this.$ctx);
  }
}

export class ListingQueryResolver extends ListingType<Record<string, never>> {
  node(_args: { id: string }) {
    return null;
  }

  nodes(args: { ids: string[] }) {
    return args.ids.map(() => null);
  }

  listing(args: ListingQueryArgs) {
    return new ListingConnectionResolver(args, this.$ctx);
  }
}

class ListingConnectionResolver extends ListingType<
  ListingQueryArgs,
  StorefrontListingRepositoryResult
> {
  async $preload() {
    return this.$ctx.kernel
      .getServices()
      .repository.storefrontListingQuery.getStorefrontListing(
        this.toRepositoryInput()
      );
  }

  async edges() {
    const rows = (await this.$get("rows")) ?? [];
    const kinds = await this.loadProductKinds(rows.map((row) => row.productId));

    return rows.map((row) => ({
      cursor: row.cursor ?? "",
      node: this.toNodeReference(row.productId, kinds.get(row.productId)),
    }));
  }

  async pageInfo() {
    const rows = (await this.$get("rows")) ?? [];
    const firstCursor = rows[0]?.cursor ?? null;
    const lastCursor = rows[rows.length - 1]?.cursor ?? null;

    return {
      hasNextPage: (await this.$get("hasNextPage")) ?? false,
      hasPreviousPage: false,
      startCursor: firstCursor,
      endCursor: lastCursor,
    };
  }

  async totalCount() {
    return (await this.$get("totalCount")) ?? 0;
  }

  async facets() {
    const result = await this.$preload();
    const selected = new Set(
      this.normalizeFilters(this.$props.facets ?? []).map((filter) =>
        this.filterSelectionKey(filter)
      )
    );

    return [
      ...result.facets.map((facet) => ({
        id: facet.facetSlug,
        label: this.labelFromHandle(facet.facetSlug),
        type: "LIST",
        uiType: "CHECKBOX",
        values: facet.values.map((value) => {
          const input = this.facetValueInput(facet.facetType, {
            facet: facet.facetSlug,
            value: value.valueHandle,
          });
          return {
            id: value.valueHandle,
            label: this.labelFromHandle(value.valueHandle),
            count: value.count,
            selected: selected.has(this.filterSelectionKey(input)),
            input,
            swatch: null,
          };
        }),
      })),
      ...this.virtualFacets(result, selected),
    ];
  }

  private toRepositoryInput() {
    const first = this.normalizePageSize(this.$props.first);
    const filters = this.normalizeFilters(this.$props.facets ?? []);

    return {
      scope: this.normalizeScope(this.$props.scope ?? null, this.$props.query),
      query: this.$props.query?.trim() || undefined,
      locale:
        this.$props.locale?.trim() ||
        this.$ctx.locale ||
        this.$ctx.store.defaultLocale,
      currency:
        this.$props.currency?.trim() ||
        this.$ctx.currency ||
        this.$ctx.store.defaultCurrency,
      filters,
      sort: this.normalizeSort(this.$props.orderBy ?? null),
      first,
      after: this.$props.after ?? null,
    };
  }

  private normalizeScope(
    scope: ListingScopeInput | null,
    query: string | null | undefined
  ): StorefrontListingScope {
    const kind = scope?.kind ?? (query?.trim() ? "SEARCH" : "GLOBAL");
    const categoryId = scope?.categoryId ?? null;
    const collectionId = scope?.collectionId ?? null;

    switch (kind) {
      case "GLOBAL":
        this.assertNoScopeIds(kind, categoryId, collectionId);
        return { kind: "global" };
      case "SEARCH":
        this.assertNoScopeIds(kind, categoryId, collectionId);
        if (!query?.trim()) {
          throw new Error("SEARCH listing scope requires a non-empty query");
        }
        return { kind: "search" };
      case "CATEGORY":
        if (!categoryId) {
          throw new Error("CATEGORY listing scope requires categoryId");
        }
        if (collectionId) {
          throw new Error("CATEGORY listing scope does not accept collectionId");
        }
        return {
          kind: "category",
          categoryId: decodeGlobalIdByType(categoryId, GlobalIdEntity.Category),
        };
      case "COLLECTION":
        if (!collectionId) {
          throw new Error("COLLECTION listing scope requires collectionId");
        }
        if (categoryId) {
          throw new Error("COLLECTION listing scope does not accept categoryId");
        }
        return {
          kind: "manual_collection",
          collectionId: decodeGlobalIdByType(
            collectionId,
            GlobalIdEntity.Collection
          ),
        };
    }
  }

  private assertNoScopeIds(
    kind: "GLOBAL" | "SEARCH",
    categoryId: string | null,
    collectionId: string | null
  ): void {
    if (categoryId || collectionId) {
      throw new Error(`${kind} listing scope does not accept scope IDs`);
    }
  }

  private normalizeFilters(
    filters: readonly ListingProductFilter[]
  ): StorefrontListingFilterInput[] {
    return filters.map((filter) => {
      const keys = [
        filter.available !== undefined && filter.available !== null
          ? "available"
          : null,
        filter.price ? "price" : null,
        filter.productVendor ? "productVendor" : null,
        filter.tag ? "tag" : null,
        filter.variantOption ? "variantOption" : null,
        filter.productFacet ? "productFacet" : null,
        filter.variantFacet ? "variantFacet" : null,
      ].filter(Boolean);

      if (keys.length !== 1) {
        throw new Error("ListingProductFilter requires exactly one field");
      }

      if (filter.available !== undefined && filter.available !== null) {
        return { kind: "in_stock", value: filter.available };
      }
      if (filter.price) {
        return {
          kind: "price",
          minPriceMinor: this.optionalMinorUnit(filter.price.min),
          maxPriceMinor: this.optionalMinorUnit(filter.price.max),
        };
      }
      if (filter.productVendor) {
        return { kind: "vendor", vendorIds: [filter.productVendor] };
      }
      if (filter.tag) {
        return { kind: "facet", facetSlug: "tag", valueHandles: [filter.tag] };
      }
      if (filter.variantOption) {
        return {
          kind: "facet",
          facetSlug: filter.variantOption.name,
          valueHandles: [filter.variantOption.value],
        };
      }
      if (filter.productFacet) {
        return this.facetFilter(filter.productFacet);
      }
      if (filter.variantFacet) {
        return this.facetFilter(filter.variantFacet);
      }

      throw new Error("Unsupported ListingProductFilter");
    });
  }

  private facetFilter(
    input: ListingFacetValueFilter
  ): StorefrontListingFilterInput {
    if (!input.facet.trim() || !input.value.trim()) {
      throw new Error("Facet filters require non-empty facet and value");
    }
    return {
      kind: "facet",
      facetSlug: input.facet,
      valueHandles: [input.value],
    };
  }

  private normalizeSort(
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
        return { kind: "name" };
      case "PRICE":
        return {
          kind: orderBy.direction === "desc" ? "price_desc" : "price_asc",
        };
    }
  }

  private normalizePageSize(first: number | null | undefined): number {
    if (this.$props.first !== undefined && this.$props.last !== undefined) {
      throw new Error("Use either first or last, not both");
    }
    if (this.$props.after && this.$props.before) {
      throw new Error("Use either after or before, not both");
    }
    if (this.$props.last !== undefined || this.$props.before !== undefined) {
      throw new Error("Backward listing pagination is not supported yet");
    }

    const value = first ?? DEFAULT_PAGE_SIZE;
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error("Listing page size must be a positive safe integer");
    }
    return Math.min(value, MAX_PAGE_SIZE);
  }

  private optionalMinorUnit(value: string | number | null | undefined) {
    if (value === null || value === undefined) return undefined;

    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new Error("Price filter bounds must be non-negative safe integers");
    }
    return parsed;
  }

  private async loadProductKinds(productIds: string[]) {
    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length === 0) return new Map<string, ProductKind>();

    // Listing owns the index and can decide Product vs Bundle without catalog IO.
    const rows = await this.$ctx.kernel.db
      .select({
        productId: productListingIndex.productId,
        kind: productListingIndex.kind,
      })
      .from(productListingIndex)
      .where(inArray(productListingIndex.productId, uniqueIds));

    return new Map(
      rows.map((row) => [row.productId, row.kind as ProductKind])
    );
  }

  private toNodeReference(
    productId: string,
    kind: ProductKind | undefined
  ): ListingNodeReference {
    return {
      __typename: kind === "BUNDLE" ? "Bundle" : "Product",
      id: encodeGlobalIdByType(productId, GlobalIdEntity.Product),
    };
  }

  private virtualFacets(
    result: StorefrontListingRepositoryResult,
    selected: ReadonlySet<string>
  ) {
    const facets: Array<Record<string, unknown>> = [
      {
        id: "available",
        label: "Available",
        type: "BOOLEAN",
        uiType: "BOOLEAN",
        values: [
          {
            id: "true",
            label: "Available",
            count: result.inStockCount,
            selected: selected.has("in_stock:true"),
            input: { available: true },
            swatch: null,
          },
        ],
      },
    ];

    if (result.priceRange) {
      const input: ListingProductFilter = {
        price: {
          min: String(result.priceRange.minPriceMinor),
          max: String(result.priceRange.maxPriceMinor),
        },
      };
      facets.push({
        id: "price",
        label: "Price",
        type: "PRICE_RANGE",
        uiType: "RANGE",
        values: [
          {
            id: "range",
            label: "Price",
            count: result.totalCount,
            selected: selected.has(this.filterSelectionKey(input)),
            input,
            swatch: null,
          },
        ],
      });
    }

    return facets;
  }

  private facetValueInput(
    facetType: string,
    value: ListingFacetValueFilter
  ): ListingProductFilter {
    // Returned inputs are intentionally reusable as the next facets[] payload.
    if (facetType === "OPTION") {
      return { variantFacet: value };
    }
    if (facetType === "TAG") {
      return { tag: value.value };
    }
    return { productFacet: value };
  }

  private filterSelectionKey(filter: StorefrontListingFilterInput | ListingProductFilter) {
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

  private labelFromHandle(handle: string): string {
    return handle
      .split(/[-_]/g)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
