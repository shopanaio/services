import { Injectable } from "@nestjs/common";
import {
  Action,
  BrokerActions,
  InjectBroker,
  ServiceBroker,
} from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import type {
  FacetSourceCandidateConnectionResult,
  FacetSourceCandidateQueryParams,
  FacetValueCandidateView,
  FacetValueCandidateConnectionResult,
  FacetValueCandidateQueryParams,
  FindFacetSourceCandidateByRefParams,
  FindFacetValueCandidatesByHandlesParams,
} from "../repositories/facet/FacetCandidateRepository.js";
import type { FacetSourceCandidateView } from "../repositories/models/index.js";

@Injectable()
export class FacetCandidateBrokerActions extends BrokerActions {
  constructor(@InjectBroker("catalog") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
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

  @Action("findFacetSourceCandidateByRef")
  async findFacetSourceCandidateByRef(
    params: FindFacetSourceCandidateByRefParams
  ): Promise<FacetSourceCandidateView | null> {
    return this.kernel.repository.facetCandidate.findSourceCandidateByRef(params);
  }

  @Action("findFacetValueCandidatesByHandles")
  async findFacetValueCandidatesByHandles(
    params: FindFacetValueCandidatesByHandlesParams
  ): Promise<FacetValueCandidateView[]> {
    return this.kernel.repository.facetCandidate.findValueCandidatesByHandles(params);
  }
}
