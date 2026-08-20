import {
  decodeGlobalId,
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { mapManualRecommendation, mapRecommendationPolicy } from "./RecommendationResolvers.js";
import { ApolloQuery } from "@shopana/type-resolver";
import { GraphQLError } from "graphql";
import type { FacetSourceCandidateConnectionInput } from "./FacetSourceCandidateConnectionResolver.js";
import type { FacetValueCandidateConnectionInput } from "./FacetValueCandidateConnectionResolver.js";
import { ListingType } from "./ListingType.js";
import type { ListingQueryArgs } from "./ListingQueryTypes.js";

function safeDecodeGlobalId(globalId: string, expectedType: GlobalIdType): string | null {
  try {
    return decodeGlobalIdByType(globalId, expectedType);
  } catch {
    return null;
  }
}

type FacetValueCandidatesArgs = Omit<FacetValueCandidateConnectionInput, "meta"> & {
  meta: Omit<FacetValueCandidateConnectionInput["meta"], "sourceHandles" | "facetId"> & {
    sourceHandles?: string[] | null;
    facetId?: string | null;
  };
};

@ApolloQuery
export class QueryResolver extends ListingType<Record<string, never>> {
  async listingQuery() {
    return this.resolvers.listingQuery();
  }
}

export class ListingQueryResolver extends ListingType<Record<string, never>> {
  async recommendationPlacementPolicy(args: {
    placement: "PRODUCT_RELATED" | "FREQUENTLY_BOUGHT_TOGETHER";
  }) {
    return (await this.resolvers.recommendationQuery()).policy(args);
  }

  async recommendationPlacementPolicies() {
    return (await this.resolvers.recommendationQuery()).policies();
  }

  async manualProductRecommendations(args: {
    anchorProductId: string;
    placement: "PRODUCT_RELATED" | "FREQUENTLY_BOUGHT_TOGETHER";
    first?: number | null;
    after?: string | null;
  }) {
    return (await this.resolvers.recommendationQuery()).manualConnection(args);
  }

  async recommendationSnapshotPreview(
    args: Parameters<
      import("./RecommendationResolvers.js").RecommendationQueryResolver["preview"]
    >[0],
  ) {
    return (await this.resolvers.recommendationQuery()).preview(args);
  }
  async search() {
    return this.resolvers.listingSearchQuery();
  }

  async node(args: { id: string }) {
    try {
      const decoded = decodeGlobalId(args.id);
      if (decoded.typeName === GlobalIdEntity.RecommendationPlacementPolicy) {
        const row = await this.$ctx.loaders.recommendationPolicy.load(decoded.id);
        return row ? mapRecommendationPolicy(row) : null;
      }
      if (decoded.typeName === GlobalIdEntity.ManualProductRecommendation) {
        const row = await this.$ctx.loaders.manualRecommendation.load(decoded.id);
        return row ? mapManualRecommendation(row) : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  async nodes(args: { ids: string[] }) {
    return Promise.all(args.ids.map((id) => this.node({ id })));
  }

  async listing(args: ListingQueryArgs) {
    return this.resolvers.listingConnection(args);
  }

  async facet(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.Facet);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facet.findById(id);
    if (!item) return null;
    return this.resolvers.facet(item.id);
  }

  async facets() {
    const facets = await this.$ctx.kernel.repository.facet.findAll();
    return Promise.all(facets.map((item) => this.resolvers.facet(item.id)));
  }

  async facetSourceCandidates(args: FacetSourceCandidateConnectionInput) {
    return this.resolvers.facetSourceCandidateConnection(args);
  }

  async facetValueCandidates(args: FacetValueCandidatesArgs) {
    let facetId: string | undefined;

    if (args.meta.facetId != null) {
      const decodedFacetId = safeDecodeGlobalId(args.meta.facetId, GlobalIdEntity.Facet);
      if (!decodedFacetId) {
        throw new GraphQLError("Invalid facetId", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      facetId = decodedFacetId;
    }

    return this.resolvers.facetValueCandidateConnection({
      ...args,
      meta: {
        candidateType: args.meta.candidateType,
        sourceHandles: args.meta.sourceHandles ?? undefined,
        facetId,
      },
    });
  }

  async facetValue(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.FacetValue);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facetValue.findById(id);
    if (!item) return null;
    return this.resolvers.facetValue(item.id);
  }

  async facetValues(args: { facetId: string }) {
    const facetId = safeDecodeGlobalId(args.facetId, GlobalIdEntity.Facet);
    if (!facetId) return [];
    const values = await this.$ctx.kernel.repository.facetValue.findByFacetId(facetId);
    return Promise.all(values.map((item) => this.resolvers.facetValue(item.id)));
  }

  async facetSwatch(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.FacetSwatch);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facetSwatch.findById(id);
    if (!item) return null;
    return this.resolvers.facetSwatch(item.id);
  }

  async facetSwatches() {
    const items = await this.$ctx.kernel.repository.facetSwatch.findAll();
    return Promise.all(items.map((item) => this.resolvers.facetSwatch(item.id)));
  }
}
