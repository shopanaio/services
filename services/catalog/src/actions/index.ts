import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
} from "@shopana/shared-kernel";
import type { Catalog } from "@shopana/broker-types";
import type { ContextStore } from "@shopana/shared-context";
import type { QueryArgs } from "@shopana/type-resolver";
import { Kernel } from "../kernel/Kernel.js";
import { Loader } from "../loaders/Loader.js";
import { runWithContext, ServiceContext } from "../context/index.js";
import { ServiceQueryResolver } from "../resolvers/service/index.js";
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

type GetStoreByIdResult = {
  store: ContextStore | null;
  userErrors: Array<{
    code: string;
    message: string;
    field?: string[] | null;
  }>;
};

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

  private async getStoreContext(storeId: string): Promise<ContextStore | null> {
    const result = await this.broker.call<
      GetStoreByIdResult,
      { id: string }
    >("project.getStoreById", { id: storeId });

    return result.store;
  }

  private createServiceContext(store: ContextStore): ServiceContext {
    const kernel = this.kernel;

    return new ServiceContext({
      requestId: `catalog-service-action-${Date.now()}`,
      kernel,
      loaders: new Loader(kernel.repository),
      locale: store.defaultLocale,
      currency: store.defaultCurrency,
      store,
    });
  }

  private validateQueryInput(
    params: Catalog.CatalogQueryParams
  ): Catalog.CatalogQueryResult | null {
    if (!params.storeId?.trim()) {
      return {
        ok: false,
        code: "INVALID_CATALOG_PRODUCT_READ_INPUT",
        message: "storeId is required",
        retryable: false,
      };
    }

    const productsSelection = params.selection.populate?.products;
    if (!productsSelection) {
      return {
        ok: false,
        code: "INVALID_CATALOG_PRODUCT_READ_INPUT",
        message: "selection.populate.products is required",
        retryable: false,
      };
    }

    const hasFields = Boolean(productsSelection.fields?.length);
    const hasPopulate = Boolean(
      productsSelection.populate &&
        Object.keys(productsSelection.populate).length > 0
    );

    if (!hasFields && !hasPopulate) {
      return {
        ok: false,
        code: "INVALID_CATALOG_PRODUCT_READ_INPUT",
        message: "selection must include fields or populate",
        retryable: false,
      };
    }

    return null;
  }

  /**
   * Action: getOffers - retrieves inventory offers through plugins
   */
  @Action("getOffers")
  async getOffers(params: GetOffersParams): Promise<GetOffersResult> {
    return this.kernel.runScript(GetOffersScript, params);
  }

  @Action("query")
  async query(
    params: Catalog.CatalogQueryParams
  ): Promise<Catalog.CatalogQueryResult> {
    const validationError = this.validateQueryInput(params);
    if (validationError) return validationError;

    const store = await this.getStoreContext(params.storeId);
    if (!store) {
      return {
        ok: false,
        code: "CATALOG_STORE_NOT_FOUND",
        message: `Store with id "${params.storeId}" not found`,
        retryable: false,
      };
    }

    const ctx = this.createServiceContext(store);

    try {
      return await runWithContext(ctx, async () => {
        const root = await ServiceQueryResolver.load<
          typeof ServiceQueryResolver,
          Catalog.CatalogQueryResolved
        >(
          {},
          params.selection as unknown as QueryArgs,
          ctx
        );

        return {
          ok: true,
          data: root ?? {},
        };
      });
    } catch (error) {
      return {
        ok: false,
        code: "CATALOG_PRODUCT_READ_QUERY_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Failed to resolve product snapshots",
        retryable: true,
      };
    }
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
