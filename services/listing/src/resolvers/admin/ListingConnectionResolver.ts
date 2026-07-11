import type {
  StorefrontListingInput,
  StorefrontListingRepositoryResult,
} from "../../repositories/storefront/types.js";
import { ListingType } from "./ListingType.js";
import {
  type ListingFacet,
  type ListingQueryArgs,
} from "./ListingQueryTypes.js";
import { mapListingFacets } from "./listingFacetMapper.js";
import {
  loadProductKindMap,
  toListingNodeReference,
} from "./listingReferences.js";
import {
  throwGraphqlListingError,
  toStorefrontListingInput,
} from "./listingInput.js";

export class ListingConnectionResolver extends ListingType<
  ListingQueryArgs,
  StorefrontListingRepositoryResult
> {
  private repositoryInput: StorefrontListingInput | null = null;

  async $preload() {
    try {
      const result = await this.$ctx.kernel
        .getServices()
        .repository.storefrontListingQuery.getStorefrontListing(
          this.toRepositoryInput()
        );
      for (const userError of result.userErrors) {
        this.$ctx.addGraphqlError(userError);
      }
      return result;
    } catch (error) {
      this.logListingError(error, "Listing connection preload failed");
      throwGraphqlListingError(error);
    }
  }

  async edges() {
    const rows = (await this.$get("rows")) ?? [];
    const kinds = await loadProductKindMap(
      this.$ctx.kernel.getServices().repository,
      rows.map((row) => row.productId)
    );

    return rows.map((row) => ({
      cursor: row.cursor ?? "",
      node: toListingNodeReference(row.productId, kinds.get(row.productId)),
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

  async facets(): Promise<ListingFacet[]> {
    const [rows, hasNextPage, totalCount, facets, priceRange, inStockCount, unavailableCount] =
      await Promise.all([
        this.$get("rows"),
        this.$get("hasNextPage"),
        this.$get("totalCount"),
        this.$get("facets"),
        this.$get("priceRange"),
        this.$get("inStockCount"),
        this.$get("unavailableCount"),
      ]);

    try {
      return mapListingFacets(
        {
          rows: rows ?? [],
          hasNextPage: hasNextPage ?? false,
          totalCount: totalCount ?? 0,
          facets: facets ?? [],
          priceRange: priceRange ?? null,
          inStockCount: inStockCount ?? 0,
          unavailableCount: unavailableCount ?? 0,
          userErrors: [],
        },
        this.$props
      );
    } catch (error) {
      this.logListingError(error, "Listing facets mapping failed");
      throwGraphqlListingError(error);
    }
  }

  private toRepositoryInput(): StorefrontListingInput {
    if (this.repositoryInput) {
      return this.repositoryInput;
    }

    try {
      this.repositoryInput = toStorefrontListingInput(this.$props, {
        locale: this.$ctx.locale || this.$ctx.store.defaultLocale,
        currency: this.$ctx.currency || this.$ctx.store.defaultCurrency,
      });
      return this.repositoryInput;
    } catch (error) {
      throwGraphqlListingError(error);
    }
  }

  private logListingError(error: unknown, message: string): void {
    this.$ctx.kernel.getServices().logger.error(
      {
        error: errorToLogObject(error),
        listingArgs: listingArgsToLogObject(this.$props),
        storeId: this.$ctx.store.id,
        locale: this.$ctx.locale || this.$ctx.store.defaultLocale,
        currency: this.$ctx.currency || this.$ctx.store.defaultCurrency,
      },
      message
    );
  }
}

function listingArgsToLogObject(args: ListingQueryArgs) {
  return {
    first: args.first ?? null,
    after: args.after ?? null,
    last: args.last ?? null,
    before: args.before ?? null,
    scope: args.scope ?? null,
    query: args.query ?? null,
    locale: args.locale ?? null,
    currency: args.currency ?? null,
    orderBy: args.orderBy ?? null,
    facets: (args.facets ?? []).map((filter) => ({
      available: filter.available ?? null,
      price: filter.price ?? null,
      productVendor: filter.productVendor ?? null,
      tag: filter.tag ?? null,
      variantOption: filter.variantOption ?? null,
      productFacet: filter.productFacet ?? null,
      variantFacet: filter.variantFacet ?? null,
    })),
  };
}

function errorToLogObject(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  return error;
}
