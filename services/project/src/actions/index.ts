import { Injectable } from "@nestjs/common";
import { BrokerActions, InjectBroker, ServiceBroker, Action } from "@shopana/shared-kernel";
import { Kernel } from "../kernel/Kernel.js";
import {
  GetCurrentStoreScript,
  type GetCurrentStoreParams,
  type GetCurrentStoreResult,
  GetStoreByIdScript,
  type GetStoreByIdParams,
  type GetStoreByIdResult,
} from "../scripts/index.js";
import {
  ProjectRecommendationActionNames,
  type ListActiveStoresParams,
  type ListActiveStoresResult,
} from "@shopana/broker-types";
import type { BrokerCallContext } from "@shopana/shared-kernel";

/**
 * Project broker actions registered with @Action decorator.
 * Each method decorated with @Action is automatically registered
 * as a broker action when the module initializes.
 */
@Injectable()
export class ProjectBrokerActions extends BrokerActions {
  constructor(@InjectBroker("project") broker: ServiceBroker) {
    super(broker);
  }

  private get kernel(): Kernel {
    return Kernel.getInstance();
  }

  /**
   * Action: getCurrentStore - get store by slug
   */
  @Action("getCurrentStore")
  async getCurrentStore(params: GetCurrentStoreParams): Promise<GetCurrentStoreResult> {
    return this.kernel.runScript(GetCurrentStoreScript, params);
  }

  /**
   * Action: getStoreById - get store by ID
   */
  @Action("getStoreById")
  async getStoreById(params: GetStoreByIdParams): Promise<GetStoreByIdResult> {
    return this.kernel.runScript(GetStoreByIdScript, params);
  }

  @Action(ProjectRecommendationActionNames.listActiveStores, {
    readOnly: true,
    timeoutMs: 5_000,
  })
  async listActiveStores(
    params: ListActiveStoresParams,
    ctx: BrokerCallContext,
  ): Promise<ListActiveStoresResult> {
    if (ctx.caller.service !== "listing") {
      throw new Error("PROJECT_ACTIVE_STORE_ENUMERATION_FORBIDDEN");
    }
    if (!Number.isSafeInteger(params.first) || params.first < 1 || params.first > 500) {
      throw new Error("PROJECT_ACTIVE_STORE_PAGE_SIZE_INVALID");
    }
    return this.kernel.repository.store.listActiveWorkflowContexts(params);
  }
}
