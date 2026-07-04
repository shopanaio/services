import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import {
  GetOffersScript,
  type GetOffersParams,
  type GetOffersResult,
} from "../scripts/GetOffersScript.js";
import type {
  FacetSourceCandidateConnectionResult,
  FacetSourceCandidateQueryParams,
  FacetValueCandidateConnectionResult,
  FacetValueCandidateQueryParams,
  FacetValueCandidateView,
  GetFacetSourceCandidateParams,
  GetFacetValueCandidatesByHandlesParams,
} from "../repositories/facet/FacetCandidateRepository.js";
import type { FacetSourceCandidateView } from "../repositories/models/index.js";

/**
 * Catalog broker actions registered with @Action decorator.
 * Each method decorated with @Action is automatically registered
 * as a broker action when the module initializes.
 */
@Injectable()
export class CatalogBrokerActions extends BrokerActions {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  /**
   * Action: getOffers - retrieves inventory offers through plugins
   */
  @Action("getOffers")
  async getOffers(params: GetOffersParams): Promise<GetOffersResult> {
    return this.kernel.runScript(GetOffersScript, params);
  }

  @Action("facetSourceCandidates")
  async facetSourceCandidates(
    params: FacetSourceCandidateQueryParams
  ): Promise<FacetSourceCandidateConnectionResult> {
    return this.kernel.repository.facetCandidate.getSourceCandidates(params);
  }

  @Action("facetValueCandidates")
  async facetValueCandidates(
    params: FacetValueCandidateQueryParams
  ): Promise<FacetValueCandidateConnectionResult> {
    return this.kernel.repository.facetCandidate.getValueCandidates(params);
  }

  @Action("getFacetSourceCandidate")
  async getFacetSourceCandidate(
    params: GetFacetSourceCandidateParams
  ): Promise<FacetSourceCandidateView | null> {
    return this.kernel.repository.facetCandidate.getSourceCandidate(params);
  }

  @Action("getFacetValueCandidatesByHandles")
  async getFacetValueCandidatesByHandles(
    params: GetFacetValueCandidatesByHandlesParams
  ): Promise<FacetValueCandidateView[]> {
    return this.kernel.repository.facetCandidate.getValueCandidatesByHandles(params);
  }
}
