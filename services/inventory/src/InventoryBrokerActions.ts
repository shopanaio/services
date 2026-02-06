import { Injectable } from "@nestjs/common";
import {
  BrokerActions,
  InjectBroker,
  ServiceBroker,
  Action,
} from "@shopana/shared-kernel";
import type { Inventory } from "@shopana/broker-types";
import { Kernel } from "./kernel/Kernel.js";
import { runWithContext, ServiceContext } from "./context/index.js";
import { Loader } from "./loaders/Loader.js";
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

  private async runWithStoreContext<T>(storeId: string, fn: () => Promise<T>): Promise<T> {
    const kernel = this.kernel;
    const ctx = new ServiceContext({
      requestId: `broker-action-${Date.now()}`,
      kernel,
      loaders: new Loader(kernel.repository),
      store: {
        id: storeId,
        name: storeId,
        displayName: storeId,
        organizationId: storeId,
        timezone: "UTC",
        email: null,
        defaultLocale: "uk",
        defaultCurrency: "UAH",
      },
    });
    return runWithContext(ctx, fn);
  }

  /**
   * Action: getOffers - retrieves inventory offers through plugins
   */
  @Action("getOffers")
  async getOffers(params: GetOffersParams): Promise<GetOffersResult> {
    return this.kernel.runScript(GetOffersScript, params);
  }

  /**
   * Action: createItem - creates an inventory item for a variant
   */
  @Action("createItem")
  async createItem(params: Inventory.CreateItemParams): Promise<Inventory.CreateItemResult> {
    return this.runWithStoreContext(params.storeId, async () => {
      const item = await this.kernel.repository.inventoryItem.upsertByVariantId(params.variantId, {
        trackInventory: params.trackInventory,
        sku: params.sku ?? undefined,
        continueSellingWhenOutOfStock: params.continueSellingWhenOutOfStock,
      });

      return { inventoryItemId: item.id };
    });
  }

  /**
   * Action: deleteItemByVariantId - deletes an inventory item by variant ID (saga compensation)
   */
  @Action("deleteItemByVariantId")
  async deleteItemByVariantId(params: Inventory.DeleteItemByVariantIdParams): Promise<Inventory.DeleteItemByVariantIdResult> {
    return this.runWithStoreContext(params.storeId, async () => {
      const item = await this.kernel.repository.inventoryItem.findByVariantId(params.variantId);
      if (item) {
        await this.kernel.repository.inventoryItem.delete(item.id);
      }
      return { success: true };
    });
  }

  /**
   * Action: getVariantCost - retrieves current cost for a variant
   */
  @Action("getVariantCost")
  async getVariantCost(params: GetVariantCostParams): Promise<VariantCost | null> {
    return this.runWithStoreContext(params.projectId, async () => {
      const cost = await this.kernel.repository.cost.getCurrentCost({
        variantId: params.variantId,
        currency: params.currency,
      });

      if (!cost) return null;

      return {
        id: cost.id,
        currency: cost.currency as CurrencyCode,
        unitCostMinor: cost.unitCostMinor,
        effectiveFrom: new Date(cost.effectiveFrom),
        effectiveTo: cost.effectiveTo ? new Date(cost.effectiveTo) : null,
        recordedAt: new Date(cost.recordedAt),
        isCurrent: cost.effectiveTo === null,
      };
    });
  }
}
