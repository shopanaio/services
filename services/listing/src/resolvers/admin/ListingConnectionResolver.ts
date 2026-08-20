import type {
  StorefrontListingInput,
  StorefrontListingRepositoryResult,
} from "../../repositories/storefront/types.js";
import { StorefrontRepositoryValidationError } from "../../repositories/storefront/types.js";
import { decodeListingCursor } from "../../repositories/storefront/cursor.js";
import {
  decodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { CanonicalCollectionRule } from "@shopana/broker-types";
import { ListingType } from "./ListingType.js";
import {
  type ListingFacet,
  type ListingQueryArgs,
} from "./ListingQueryTypes.js";
import { mapListingFacets } from "./listingFacetMapper.js";
import { toListingNodeReference } from "./listingReferences.js";
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
      const services = this.$ctx.kernel.getServices();
      const resolvedArgs = await this.resolveCollectionScope(this.$props);
      let repositoryInput = this.toRepositoryInput(resolvedArgs);
      if (repositoryInput.query) {
        const continuationMode = repositoryInput.after
          ? decodeListingCursor(repositoryInput.after).payload.mode
          : null;
        if (repositoryInput.after && continuationMode === null) {
          throw new StorefrontRepositoryValidationError(
            "Search continuation cursor has no execution mode",
          );
        }
        const searchCandidates = await services.searchExecution.execute({
          locale: repositoryInput.locale,
          query: repositoryInput.query,
          mode: continuationMode ?? undefined,
        });
        repositoryInput = Object.freeze({
          ...repositoryInput,
          locale: searchCandidates.request.locale,
          query: searchCandidates.request.normalizedQuery.display,
          searchCandidates,
        });
        this.repositoryInput = repositoryInput;
      }
      const result = await services.repository.storefrontListingQuery
        .getStorefrontListing(repositoryInput);
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

    return rows.map((row) => ({
      cursor: row.cursor ?? "",
      node: toListingNodeReference(row.productId),
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

  private toRepositoryInput(args: ListingQueryArgs): StorefrontListingInput {
    if (this.repositoryInput) {
      return this.repositoryInput;
    }

    try {
      this.repositoryInput = toStorefrontListingInput(args, {
        locale: this.$ctx.locale || this.$ctx.store.defaultLocale,
        currency: this.$ctx.currency || this.$ctx.store.currencyCode,
      });
      return this.repositoryInput;
    } catch (error) {
      throwGraphqlListingError(error);
    }
  }

  private async resolveCollectionScope(
    args: ListingQueryArgs,
  ): Promise<ListingQueryArgs> {
    if (args.resolvedScope || args.scope?.kind !== "COLLECTION") return args;
    if (!args.scope.collectionId) {
      throw new StorefrontRepositoryValidationError(
        "COLLECTION listing scope requires collectionId",
      );
    }
    const collectionId = decodeGlobalIdByType(
      args.scope.collectionId,
      GlobalIdEntity.Collection,
    );
    const state =
      await this.$ctx.kernel.repository.collectionState.findState(collectionId);
    if (!state) {
      throw new StorefrontRepositoryValidationError(
        "Collection index is not ready",
        ["scope", "collectionId"],
        "COLLECTION_INDEX_NOT_READY",
      );
    }
    const currency =
      args.currency?.trim() ||
      this.$ctx.currency ||
      this.$ctx.store.currencyCode;
    const evaluated =
      state.collectionType === "rule"
        ? await this.$ctx.kernel.repository.collectionRuleEvaluation.evaluate({
            rules: state.rulesJson as CanonicalCollectionRule[],
            currency,
            universe: "admin",
            definitionKey: {
              kind: "persisted",
              listingRevision: state.listingRevision,
              rulesHash: state.rulesHash,
            },
          })
        : null;
    const productBitmap =
      evaluated?.productBitmap ??
      await this.$ctx.kernel.repository.collectionRuleEvaluation
        .getManualMembership(collectionId, "admin");
    return {
      ...args,
      orderBy:
        args.orderBy ??
        (args.query?.trim()
          ? { by: "RELEVANCE" }
          : collectionDefaultOrderBy(
              state.defaultSort,
              state.defaultSortDirection,
            )),
      resolvedScope: {
        kind: "collection",
        collectionId,
        listingRevision: state.listingRevision,
        rulesHash: state.rulesHash,
        productBitmap,
        membershipBitmap:
          evaluated?.membershipBitmap ?? productBitmap,
        variantBitmap: evaluated?.variantBitmap ?? undefined,
        manualSortScopeId:
          state.collectionType === "manual" ? collectionId : undefined,
      },
    };
  }

  private logListingError(error: unknown, message: string): void {
    this.$ctx.kernel.getServices().logger.error(
      {
        error: errorToLogObject(error),
        listingArgs: listingArgsToLogObject(this.$props),
        storeId: this.$ctx.store.id,
        locale: this.$ctx.locale || this.$ctx.store.defaultLocale,
        currency: this.$ctx.currency || this.$ctx.store.currencyCode,
      },
      message
    );
  }
}

function collectionDefaultOrderBy(
  sort: string,
  direction: string,
): ListingQueryArgs["orderBy"] {
  switch (sort) {
    case "manual":
      return { by: "MANUAL" };
    case "price":
      return { by: "PRICE", direction: direction as "asc" | "desc" };
    case "name":
      return { by: "NAME", direction: direction as "asc" | "desc" };
    default:
      return { by: "NEWEST", direction: "desc" };
  }
}

function listingArgsToLogObject(args: ListingQueryArgs) {
  return {
    first: args.first ?? null,
    after: args.after ?? null,
    last: args.last ?? null,
    before: args.before ?? null,
    scope: args.scope ?? null,
    queryProvided: !!args.query?.trim(),
    queryCodePointLength: args.query ? [...args.query].length : 0,
    locale: args.locale ?? null,
    currency: args.currency ?? null,
    orderBy: args.orderBy ?? null,
    facets: (args.facets ?? []).map((filter) => ({
      statuses: filter.statuses ?? null,
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
