import {
  decodeGlobalIdByType,
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import { ApolloQuery } from "@shopana/type-resolver";
import { GraphQLError } from "graphql";
import {
  FacetSourceCandidateConnectionResolver,
  type FacetSourceCandidateConnectionInput,
} from "./FacetSourceCandidateConnectionResolver.js";
import { FacetResolver } from "./FacetResolver.js";
import { FacetSwatchResolver } from "./FacetSwatchResolver.js";
import {
  FacetValueCandidateConnectionResolver,
  type FacetValueCandidateConnectionInput,
} from "./FacetValueCandidateConnectionResolver.js";
import { FacetValueResolver } from "./FacetValueResolver.js";
import { ListingConnectionResolver } from "./ListingConnectionResolver.js";
import { ListingType } from "./ListingType.js";
import type { ListingQueryArgs } from "./ListingQueryTypes.js";

function safeDecodeGlobalId(
  globalId: string,
  expectedType: GlobalIdType
): string | null {
  try {
    return decodeGlobalIdByType(globalId, expectedType);
  } catch {
    return null;
  }
}

type FacetValueCandidatesArgs = Omit<
  FacetValueCandidateConnectionInput,
  "meta"
> & {
  meta: Omit<FacetValueCandidateConnectionInput["meta"], "sourceHandles" | "facetId"> & {
    sourceHandles?: string[] | null;
    facetId?: string | null;
  };
};

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

  async facet(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.Facet);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facet.findById(id);
    if (!item) return null;
    return new FacetResolver(item.id, this.$ctx);
  }

  async facets() {
    const facets = await this.$ctx.kernel.repository.facet.findAll();
    return facets.map((item) => new FacetResolver(item.id, this.$ctx));
  }

  facetSourceCandidates(args: FacetSourceCandidateConnectionInput) {
    return new FacetSourceCandidateConnectionResolver(args, this.$ctx);
  }

  facetValueCandidates(args: FacetValueCandidatesArgs) {
    let facetId: string | undefined;

    if (args.meta.facetId != null) {
      const decodedFacetId = safeDecodeGlobalId(
        args.meta.facetId,
        GlobalIdEntity.Facet
      );
      if (!decodedFacetId) {
        throw new GraphQLError("Invalid facetId", {
          extensions: { code: "BAD_USER_INPUT" },
        });
      }
      facetId = decodedFacetId;
    }

    return new FacetValueCandidateConnectionResolver(
      {
        ...args,
        meta: {
          candidateType: args.meta.candidateType,
          sourceHandles: args.meta.sourceHandles ?? undefined,
          facetId,
        },
      },
      this.$ctx
    );
  }

  async facetValue(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.FacetValue);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facetValue.findById(id);
    if (!item) return null;
    return new FacetValueResolver(item.id, this.$ctx);
  }

  async facetValues(args: { facetId: string }) {
    const facetId = safeDecodeGlobalId(args.facetId, GlobalIdEntity.Facet);
    if (!facetId) return [];
    const values = await this.$ctx.kernel.repository.facetValue.findByFacetId(
      facetId
    );
    return values.map((item) => new FacetValueResolver(item.id, this.$ctx));
  }

  async facetSwatch(args: { id: string }) {
    const id = safeDecodeGlobalId(args.id, GlobalIdEntity.FacetSwatch);
    if (!id) return null;
    const item = await this.$ctx.kernel.repository.facetSwatch.findById(id);
    if (!item) return null;
    return new FacetSwatchResolver(item.id, this.$ctx);
  }

  async facetSwatches() {
    const items = await this.$ctx.kernel.repository.facetSwatch.findAll();
    return items.map((item) => new FacetSwatchResolver(item.id, this.$ctx));
  }
}
