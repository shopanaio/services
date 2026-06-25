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
import {
  GetInventoryItemProjectionSnapshotScript,
  type GetInventoryItemProjectionSnapshotParams,
  type GetInventoryItemProjectionSnapshotResult,
} from "../scripts/GetInventoryItemProjectionSnapshotScript.js";

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

  /**
   * Action: getInventoryItemProjectionSnapshot - returns catalog data needed by Inventory read projection.
   */
  @Action("getInventoryItemProjectionSnapshot")
  async getInventoryItemProjectionSnapshot(
    params: GetInventoryItemProjectionSnapshotParams
  ): Promise<GetInventoryItemProjectionSnapshotResult> {
    return this.kernel.runScript(
      GetInventoryItemProjectionSnapshotScript,
      params,
      {
        storeId: params.storeId,
        organizationId: params.organizationId,
        locale: params.locale,
        userId: params.userId,
        requestId: params.requestId,
      }
    );
  }
}
