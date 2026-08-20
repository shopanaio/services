import { GraphQLError } from "graphql";
import { decodeListingCursor } from "../../repositories/storefront/cursor.js";
import type {
  StorefrontListingFilterInput,
  StorefrontListingRepositoryResult,
} from "../../repositories/storefront/types.js";
import { StorefrontRepositoryValidationError } from "../../repositories/storefront/types.js";
import type { FilterResolverInput } from "./FilterModels.js";
import { ListingType } from "./ListingType.js";
import type { ProductConnectionInput } from "./ListingQueryTypes.js";
import {
  normalizeListingRequest,
  throwGraphqlListingError,
  type NormalizedListingRequest,
} from "./listingInput.js";
import { toProductReference } from "./listingReferences.js";

export class ProductConnectionResolver extends ListingType<
  ProductConnectionInput,
  StorefrontListingRepositoryResult
> {
  private request: NormalizedListingRequest | null = null;

  async $preload() {
    try {
      const services = this.$ctx.kernel.getServices();
      const normalized = this.normalizedRequest();
      let repositoryInput = normalized.repositoryInput;

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
        this.request = { ...normalized, repositoryInput };
      }

      const result =
        await services.repository.storefrontListingQuery.getStorefrontListing(repositoryInput);
      for (const userError of result.userErrors) {
        this.$ctx.addGraphqlError(userError);
      }
      return result;
    } catch (error) {
      this.logError(error);
      throwGraphqlListingError(error);
    }
  }

  async edges() {
    const rows = (await this.$get("rows")) ?? [];
    return rows.map((row) => ({
      cursor: requiredCursor(row.cursor),
      node: toProductReference(row.productId),
    }));
  }

  async nodes() {
    const rows = (await this.$get("rows")) ?? [];
    return rows.map((row) => toProductReference(row.productId));
  }

  async pageInfo() {
    const rows = (await this.$get("rows")) ?? [];
    return {
      hasNextPage: (await this.$get("hasNextPage")) ?? false,
      hasPreviousPage: false,
      startCursor: rows[0]?.cursor ?? null,
      endCursor: rows[rows.length - 1]?.cursor ?? null,
    };
  }

  async totalCount() {
    return (await this.$get("totalCount")) ?? 0;
  }

  async filters() {
    const [facets, priceRange, availableCount, unavailableCount] = await Promise.all([
      this.$get("facets"),
      this.$get("priceRange"),
      this.$get("inStockCount"),
      this.$get("unavailableCount"),
    ]);
    const request = this.normalizedRequest();
    const selections = resolveSelections(request.repositoryInput.filters);
    const inputs: FilterResolverInput[] = [
      ...(facets ?? []).map((facet): FilterResolverInput => ({
        kind: "facet",
        facet,
        selectedHandles: [...(selections.facetHandles.get(facet.facetSlug) ?? [])],
      })),
      {
        kind: "availability",
        availableCount: availableCount ?? 0,
        unavailableCount: unavailableCount ?? 0,
        selected: selections.availability,
      },
      ...(priceRange
        ? [
            {
              kind: "price" as const,
              range: priceRange,
              selectedMinMinor: selections.priceMin,
              selectedMaxMinor: selections.priceMax,
            },
          ]
        : []),
    ];

    return Promise.all(inputs.map((input) => this.resolvers.filter(input)));
  }

  sort() {
    return this.normalizedRequest().sort;
  }

  availableSorts() {
    return this.normalizedRequest().availableSorts;
  }

  private normalizedRequest(): NormalizedListingRequest {
    if (this.request) return this.request;

    try {
      this.request = normalizeListingRequest(this.$props, {
        locale: this.$ctx.locale || this.$ctx.store.defaultLocale,
        currency: this.$ctx.currency || this.$ctx.store.currencyCode,
      });
      return this.request;
    } catch (error) {
      throwGraphqlListingError(error);
    }
  }

  private logError(error: unknown): void {
    this.$ctx.kernel.getServices().logger.error(
      {
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
        listing: {
          entryPoint: this.$props.entryPoint,
          categoryId: this.$props.categoryId ?? null,
          collectionId: this.$props.collectionId ?? null,
          collectionListingRevision: this.$props.collectionListingRevision ?? null,
          queryProvided: !!this.$props.query?.trim(),
          first: this.$props.first ?? null,
          afterProvided: !!this.$props.after,
          filterCount: this.$props.filters?.length ?? 0,
          sort: this.$props.sort ?? null,
        },
        storeId: this.$ctx.store.id,
      },
      "Storefront listing connection preload failed",
    );
  }
}

function requiredCursor(value: string | undefined): string {
  if (value) return value;
  throw new GraphQLError("Listing page row has no cursor", {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  });
}

function resolveSelections(filters: readonly StorefrontListingFilterInput[]) {
  const facetHandles = new Map<string, Set<string>>();
  let availability: boolean | undefined;
  let priceMin: number | undefined;
  let priceMax: number | undefined;

  for (const filter of filters) {
    switch (filter.kind) {
      case "facet": {
        const handles = facetHandles.get(filter.facetSlug) ?? new Set<string>();
        filter.valueHandles.forEach((handle) => handles.add(handle));
        facetHandles.set(filter.facetSlug, handles);
        break;
      }
      case "in_stock":
        availability = filter.value;
        break;
      case "price":
        if (filter.minPriceMinor !== undefined) {
          priceMin =
            priceMin === undefined
              ? filter.minPriceMinor
              : Math.max(priceMin, filter.minPriceMinor);
        }
        if (filter.maxPriceMinor !== undefined) {
          priceMax =
            priceMax === undefined
              ? filter.maxPriceMinor
              : Math.min(priceMax, filter.maxPriceMinor);
        }
        break;
      case "vendor":
      case "status":
        break;
    }
  }

  return { facetHandles, availability, priceMin, priceMax };
}
