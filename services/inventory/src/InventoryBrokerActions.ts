import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
} from "@shopana/shared-kernel";
import { Kernel } from "./kernel/Kernel.js";
import {
  GetOffersScript,
  type GetOffersParams,
  type GetOffersResult,
} from "./scripts/GetOffersScript.js";
import type { VariantCost, CurrencyCode } from "./resolvers/admin/interfaces/index.js";

export interface GetVariantCostParams {
  projectId: string;
  variantId: string;
  currency: CurrencyCode;
}

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
    return this.kernel.runScript(GetOffersScript, params);
  }

  /**
   * Action: getVariantCost - retrieves current cost for a variant
   */
  @Action("getVariantCost")
  async getVariantCost(params: GetVariantCostParams): Promise<VariantCost | null> {
    const services = this.kernel.getServicesForProject(params.projectId);
    const cost = await services.repository.cost.getCurrentCost({
      variantId: params.variantId,
      currency: params.currency,
    });

    if (!cost) return null;

    return {
      id: cost.id,
      currency: cost.currency as CurrencyCode,
      unitCostMinor: cost.unitCostMinor,
      effectiveFrom: cost.effectiveFrom instanceof Date ? cost.effectiveFrom : new Date(cost.effectiveFrom),
      effectiveTo: cost.effectiveTo ? (cost.effectiveTo instanceof Date ? cost.effectiveTo : new Date(cost.effectiveTo)) : null,
      recordedAt: cost.recordedAt instanceof Date ? cost.recordedAt : new Date(cost.recordedAt),
      isCurrent: cost.effectiveTo === null,
    };
  }
}
