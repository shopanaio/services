import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import {
  CatalogFacetCandidateActionNames,
  type Catalog,
} from "@shopana/broker-types";
import { Kernel } from "../kernel/Kernel.js";
import type {
  FacetSourceCandidateQueryParams,
  FacetValueCandidateQueryParams,
  FindFacetSourceCandidateByRefParams,
  FindFacetValueCandidatesByHandlesParams,
} from "../repositories/facet/FacetCandidateRepository.js";

@Injectable()
export class FacetCandidateBrokerActions extends BrokerActions {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  @Action(CatalogFacetCandidateActionNames.sourceCandidates)
  async facetSourceCandidates(
    params: FacetSourceCandidateQueryParams
  ): Promise<Catalog.FacetSourceCandidateConnectionResult> {
    return this.kernel.repository.facetCandidate.getSourceCandidates(params);
  }

  @Action(CatalogFacetCandidateActionNames.valueCandidates)
  async facetValueCandidates(
    params: FacetValueCandidateQueryParams
  ): Promise<Catalog.FacetValueCandidateConnectionResult> {
    return this.kernel.repository.facetCandidate.getValueCandidates(params);
  }

  @Action(CatalogFacetCandidateActionNames.findSourceByRef)
  async findFacetSourceCandidateByRef(
    params: FindFacetSourceCandidateByRefParams
  ): Promise<Catalog.FacetSourceCandidateView | null> {
    return this.kernel.repository.facetCandidate.findSourceCandidateByRef(params);
  }

  @Action(CatalogFacetCandidateActionNames.findValuesByHandles)
  async findFacetValueCandidatesByHandles(
    params: FindFacetValueCandidatesByHandlesParams
  ): Promise<Catalog.FacetValueCandidateView[]> {
    return this.kernel.repository.facetCandidate.findValueCandidatesByHandles(params);
  }
}
