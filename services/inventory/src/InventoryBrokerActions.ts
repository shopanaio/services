import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
} from "@shopana/shared-kernel";
import { Kernel } from "./kernel/Kernel";
import {
  getOffers,
  type GetOffersParams,
  type GetOffersResult,
} from "./scripts/getOffers";

/**
 * Inventory broker actions registered with @Action decorator.
 * Each method decorated with @Action is automatically registered
 * as a broker action when the module initializes.
 */
@Injectable()
export class InventoryBrokerActions extends BrokerActions {
  constructor(@InjectBroker("inventory") broker: ServiceBroker) {
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
    return this.kernel.executeScript(getOffers, params);
  }
}
