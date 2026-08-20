import { GraphQLError } from "graphql";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { CanonicalCollectionRule } from "@shopana/broker-types";
import { ListingType } from "./ListingType.js";
import { ListingSort } from "./generated/types.js";
import type { ProductConnectionInput } from "./ListingQueryTypes.js";

interface CollectionProductsArgs {
  first?: number | null;
  after?: string | null;
  query?: string | null;
  filters?: ProductConnectionInput["filters"];
  sort?: ListingSort | null;
}

export interface CollectionResolverProps {
  id: string;
  listingRevision: number;
}

export class CollectionResolver extends ListingType<CollectionResolverProps> {
  id() {
    return this.encodeId(this.$props.id, GlobalIdEntity.Collection);
  }

  async products(args: CollectionProductsArgs) {
    const state = await this.$ctx.kernel.repository.collectionState.findStateWithVisibility(
      this.$props.id,
    );
    if (!state || state.listingRevision !== this.$props.listingRevision) {
      throw new GraphQLError("Collection index is not ready", {
        extensions: { code: "COLLECTION_INDEX_NOT_READY" },
      });
    }
    if (!state.isVisible) {
      throw new GraphQLError("Collection is not available", {
        extensions: { code: "NOT_FOUND" },
      });
    }
    const currency = this.$ctx.currency || this.$ctx.store.currencyCode;
    const evaluated =
      state.collectionType === "manual"
        ? null
        : await this.$ctx.kernel.repository.collectionRuleEvaluation.evaluate({
            rules: state.rulesJson as CanonicalCollectionRule[],
            currency,
            definitionKey: {
              kind: "persisted",
              listingRevision: state.listingRevision,
              rulesHash: state.rulesHash,
            },
          });
    const membershipBitmap = evaluated?.membershipBitmap ?? (await this.manualMembershipBitmap());
    return this.resolvers.productConnection({
      entryPoint: "collection",
      collectionId: this.$props.id,
      collectionListingRevision: state.listingRevision,
      collectionRulesHash: state.rulesHash,
      collectionMembershipBitmap: membershipBitmap,
      collectionProductBitmap: evaluated?.productBitmap ?? membershipBitmap,
      collectionVariantBitmap: evaluated?.variantBitmap ?? undefined,
      collectionType: state.collectionType,
      collectionDefaultSort: defaultSort(state.defaultSort, state.defaultSortDirection),
      query: args.query,
      first: args.first,
      after: args.after,
      filters: args.filters,
      sort: args.sort,
    });
  }

  private async manualMembershipBitmap(): Promise<string> {
    return this.$ctx.kernel.repository.collectionRuleEvaluation.getManualMembership(
      this.$props.id,
      "storefront",
    );
  }
}

function defaultSort(sort: string, direction: string): ListingSort {
  switch (sort) {
    case "manual":
      return ListingSort.Manual;
    case "price":
      return direction === "asc" ? ListingSort.PriceAsc : ListingSort.PriceDesc;
    case "name":
      return direction === "asc" ? ListingSort.TitleAsc : ListingSort.TitleDesc;
    case "newest":
    default:
      return ListingSort.Newest;
  }
}
