import type { PageInfo } from "@shopana/drizzle-query";
import type { ServiceBroker } from "@shopana/shared-kernel";

export interface FacetSourceCandidateView {
  id: string;
  storeId: string;
  locale: string;
  facetType: string;
  handle: string;
  name: string | null;
  sourceSortBucket: number;
  sortName: string | null;
}

export type FacetValueCandidateType = "TAG" | "OPTION" | "FEATURE";

export interface FacetValueCandidateView {
  id: string;
  storeId: string;
  locale: string;
  facetType: FacetValueCandidateType;
  sourceHandle: string;
  handle: string;
  label: string;
}

export interface CandidateRelayInput {
  after?: string | null;
  before?: string | null;
  first?: number | null;
  last?: number | null;
  where?: unknown;
  orderBy?: unknown;
}

export type FacetSourceCandidateRelayInput = CandidateRelayInput;
export type FacetValueCandidateRelayInput = CandidateRelayInput;

export interface FacetSourceCandidateConnectionResult {
  edges: Array<{ cursor: string; node: FacetSourceCandidateView }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface FacetValueCandidateConnectionResult {
  edges: Array<{ cursor: string; node: FacetValueCandidateView }>;
  pageInfo: PageInfo;
  totalCount: number;
}

export interface FacetValueCandidateArgs extends FacetValueCandidateRelayInput {
  meta: {
    candidateType: FacetValueCandidateType;
    sourceHandles?: string[];
    facetId?: string;
  };
}

export interface FacetSourceCandidateRef {
  facetType: string;
  handle: string;
}

export interface CatalogFacetCandidateClientContext {
  storeId: string;
  locale: string;
}

export class CatalogFacetCandidateClient {
  constructor(private readonly broker: ServiceBroker) {}

  getSourceCandidates(
    context: CatalogFacetCandidateClientContext,
    input: {
      relay: FacetSourceCandidateRelayInput;
      excludedSources?: FacetSourceCandidateRef[];
    }
  ): Promise<FacetSourceCandidateConnectionResult> {
    return this.broker.call<
      FacetSourceCandidateConnectionResult,
      {
        storeId: string;
        locale: string;
        excludedSources?: FacetSourceCandidateRef[];
        input: FacetSourceCandidateRelayInput;
      }
    >("catalog.facetSourceCandidates", {
      storeId: context.storeId,
      locale: context.locale,
      excludedSources: input.excludedSources,
      input: input.relay,
    });
  }

  getValueCandidates(
    context: CatalogFacetCandidateClientContext,
    input: {
      candidateType: FacetValueCandidateType;
      sourceHandles: string[];
      existingSourceValueHandles?: string[];
      relay: FacetValueCandidateRelayInput;
    }
  ): Promise<FacetValueCandidateConnectionResult> {
    return this.broker.call<
      FacetValueCandidateConnectionResult,
      {
        storeId: string;
        locale: string;
        candidateType: FacetValueCandidateType;
        sourceHandles: string[];
        existingSourceValueHandles?: string[];
        input: FacetValueCandidateRelayInput;
      }
    >("catalog.facetValueCandidates", {
      storeId: context.storeId,
      locale: context.locale,
      candidateType: input.candidateType,
      sourceHandles: input.sourceHandles,
      existingSourceValueHandles: input.existingSourceValueHandles,
      input: input.relay,
    });
  }

  findSourceCandidateByRef(
    context: CatalogFacetCandidateClientContext,
    input: { facetType: string; handle: string }
  ): Promise<FacetSourceCandidateView | null> {
    return this.broker.call<
      FacetSourceCandidateView | null,
      { storeId: string; locale: string; facetType: string; handle: string }
    >("catalog.findFacetSourceCandidateByRef", {
      storeId: context.storeId,
      locale: context.locale,
      facetType: input.facetType,
      handle: input.handle,
    });
  }

  findValueCandidatesByHandles(
    context: CatalogFacetCandidateClientContext,
    input: {
      candidateType: FacetValueCandidateType;
      sourceHandles: string[];
      handles: string[];
    }
  ): Promise<FacetValueCandidateView[]> {
    return this.broker.call<
      FacetValueCandidateView[],
      {
        storeId: string;
        locale: string;
        candidateType: FacetValueCandidateType;
        sourceHandles: string[];
        handles: string[];
      }
    >("catalog.findFacetValueCandidatesByHandles", {
      storeId: context.storeId,
      locale: context.locale,
      candidateType: input.candidateType,
      sourceHandles: input.sourceHandles,
      handles: input.handles,
    });
  }
}
