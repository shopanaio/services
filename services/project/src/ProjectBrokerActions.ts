import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
} from "@shopana/shared-kernel";
import { Kernel } from "./kernel/Kernel.js";
import {
  GetCurrentStoreScript,
  type GetCurrentStoreParams,
  type GetCurrentStoreResult,
  GetStoreByIdScript,
  type GetStoreByIdParams,
  type GetStoreByIdResult,
  GetResourcesScript,
  type GetResourcesParams,
  type GetResourcesResult,
} from "./scripts/index.js";

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
  async getCurrentStore(
    params: GetCurrentStoreParams
  ): Promise<GetCurrentStoreResult> {
    return this.kernel.runScript(GetCurrentStoreScript, params);
  }

  /**
   * Action: getStoreById - get store by ID
   */
  @Action("getStoreById")
  async getStoreById(params: GetStoreByIdParams): Promise<GetStoreByIdResult> {
    return this.kernel.runScript(GetStoreByIdScript, params);
  }

  /**
   * Action: getResources - get service resources for IAM
   */
  @Action("getResources")
  async getResources(params: GetResourcesParams): Promise<GetResourcesResult> {
    return this.kernel.runScript(GetResourcesScript, params);
  }
}
