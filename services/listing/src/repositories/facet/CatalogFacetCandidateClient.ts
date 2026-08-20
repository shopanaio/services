import { CatalogFacetCandidateActions, type Catalog } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";

export type FacetSourceCandidateView = Catalog.FacetSourceCandidateView;
export type FacetValueCandidateType = Catalog.FacetValueCandidateType;
export type FacetValueCandidateView = Catalog.FacetValueCandidateView;
export type FacetSourceCandidateRelayInput = Catalog.FacetSourceCandidateRelayInput;
export type FacetValueCandidateRelayInput = Catalog.FacetValueCandidateRelayInput;
export type FacetSourceCandidateConnectionResult = Catalog.FacetSourceCandidateConnectionResult;
export type FacetValueCandidateConnectionResult = Catalog.FacetValueCandidateConnectionResult;

export interface FacetValueCandidateArgs extends FacetValueCandidateRelayInput {
  meta: {
    candidateType: FacetValueCandidateType;
    sourceHandles?: string[];
    facetId?: string;
  };
}

export type FacetSourceCandidateRef = Catalog.FacetSourceCandidateRef;

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
    },
  ): Promise<FacetSourceCandidateConnectionResult> {
    return this.broker.call<
      Catalog.FacetSourceCandidateConnectionResult,
      Catalog.FacetSourceCandidateQueryParams
    >(CatalogFacetCandidateActions.sourceCandidates, {
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
    },
  ): Promise<FacetValueCandidateConnectionResult> {
    return this.broker.call<
      Catalog.FacetValueCandidateConnectionResult,
      Catalog.FacetValueCandidateQueryParams
    >(CatalogFacetCandidateActions.valueCandidates, {
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
    input: { facetType: string; handle: string },
  ): Promise<FacetSourceCandidateView | null> {
    return this.broker.call<
      Catalog.FacetSourceCandidateView | null,
      Catalog.FindFacetSourceCandidateByRefParams
    >(CatalogFacetCandidateActions.findSourceByRef, {
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
    },
  ): Promise<FacetValueCandidateView[]> {
    return this.broker.call<
      Catalog.FacetValueCandidateView[],
      Catalog.FindFacetValueCandidatesByHandlesParams
    >(CatalogFacetCandidateActions.findValuesByHandles, {
      storeId: context.storeId,
      locale: context.locale,
      candidateType: input.candidateType,
      sourceHandles: input.sourceHandles,
      handles: input.handles,
    });
  }
}
