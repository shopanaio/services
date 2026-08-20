import { GraphQLError } from "graphql";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { CanonicalCollectionRule } from "@shopana/broker-types";
import { ListingType } from "./ListingType.js";
import type {
  ListingOrderByInput,
  ListingProductFilter,
  ListingQueryArgs,
} from "./ListingQueryTypes.js";

export interface AdminCollectionResolverProps {
  id: string;
  listingRevision: number;
}

interface AdminCollectionProductsArgs {
  first?: number | null;
  after?: string | null;
  query?: string | null;
  locale?: string | null;
  currency?: string | null;
  facets?: ListingProductFilter[] | null;
  orderBy?: ListingOrderByInput | null;
}

export class CollectionResolver extends ListingType<AdminCollectionResolverProps> {
  id() {
    return this.encodeId(this.$props.id, GlobalIdEntity.Collection);
  }

  async products(args: AdminCollectionProductsArgs) {
    const state = await this.$ctx.kernel.repository.collectionState.findState(this.$props.id);
    if (!state || state.listingRevision !== this.$props.listingRevision) {
      throw new GraphQLError("Collection index is not ready", {
        extensions: { code: "COLLECTION_INDEX_NOT_READY" },
      });
    }
    const currency = args.currency?.trim() || this.$ctx.currency || this.$ctx.store.currencyCode;
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
      (await this.$ctx.kernel.repository.collectionRuleEvaluation.getManualMembership(
        this.$props.id,
        "admin",
      ));
    const listingArgs: ListingQueryArgs = {
      ...args,
      resolvedScope: {
        kind: "collection",
        collectionId: this.$props.id,
        listingRevision: state.listingRevision,
        rulesHash: state.rulesHash,
        productBitmap,
        membershipBitmap: evaluated?.membershipBitmap ?? productBitmap,
        variantBitmap: evaluated?.variantBitmap ?? undefined,
        manualSortScopeId: state.collectionType === "manual" ? this.$props.id : undefined,
      },
      orderBy:
        args.orderBy ??
        (args.query?.trim()
          ? { by: "RELEVANCE" }
          : defaultOrderBy(state.defaultSort, state.defaultSortDirection)),
    };
    return this.resolvers.listingConnection(listingArgs);
  }
}

function defaultOrderBy(sort: string, direction: string): ListingOrderByInput {
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
