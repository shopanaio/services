import { BaseScript } from "../../kernel/BaseScript.js";
import { validateFeatureSyncParams } from "../feature/validation/index.js";
import { validateOptionSyncParams } from "../option/validation/index.js";
import type {
  ProductFeaturesSyncParams,
  ProductOptionsSyncParams,
} from "../../workflows/dto/ProductUpdateWorkflowDto.js";

export type ProductUpdateReadQuery =
  | { type: "productExists"; productId: string }
  | { type: "optionSyncValidation"; params: ProductOptionsSyncParams }
  | { type: "featureSyncValidation"; params: ProductFeaturesSyncParams }
  | { type: "vendor"; vendorId: string }
  | { type: "productByHandle"; handle: string }
  | { type: "effectiveProfiles"; productId: string }
  | { type: "configurationProfileIds"; productId: string }
  | { type: "variants"; productId: string }
  | { type: "options"; productId: string }
  | { type: "optionValues"; optionIds: string[] }
  | { type: "inventoryItems"; variantIds: string[] }
  | { type: "variantLinks"; variantIds: string[] }
  | { type: "stock"; variantId: string; warehouseId: string }
  | { type: "warehouses"; warehouseIds: string[] }
  | { type: "productMedia"; productId: string; fileIds: string[] }
  | { type: "inventoryItemBySku"; sku: string };

/**
 * Read boundary for ProductUpdateWorkflow.
 *
 * Repositories depend on ServiceContext for tenant scope, so workflows must
 * access them through Kernel.runScript with the persisted workflow context.
 */
export class ProductUpdateReadScript extends BaseScript<ProductUpdateReadQuery, unknown> {
  protected async execute(query: ProductUpdateReadQuery): Promise<unknown> {
    switch (query.type) {
      case "productExists":
        return this.repository.product.exists(query.productId);
      case "optionSyncValidation":
        return validateOptionSyncParams(this.repository, query.params);
      case "featureSyncValidation":
        return validateFeatureSyncParams(this.repository, query.params);
      case "vendor":
        return this.repository.vendor.findById(query.vendorId);
      case "productByHandle":
        return this.repository.product.findByHandle(query.handle);
      case "effectiveProfiles":
        return this.repository.comparisonRead.getEffectiveProfilesByProductIds([query.productId]);
      case "configurationProfileIds":
        return this.repository.comparisonRead.productConfigurationProfileIds(query.productId);
      case "variants":
        return this.repository.variant.findByProductId(query.productId);
      case "options":
        return this.repository.option.findByProductId(query.productId);
      case "optionValues":
        return this.repository.option.findValuesByOptionIds(query.optionIds);
      case "inventoryItems":
        return this.repository.inventoryItem.findActiveByVariantIds(query.variantIds);
      case "variantLinks":
        return this.repository.option.findVariantLinks(query.variantIds);
      case "stock":
        return this.repository.stock.findByVariantWarehouse(query.variantId, query.warehouseId);
      case "warehouses":
        return this.repository.warehouse.getByIds(query.warehouseIds);
      case "productMedia":
        return this.repository.media.getProductMediaByFileIds(query.productId, query.fileIds);
      case "inventoryItemBySku":
        return this.repository.inventoryItem.findBySku(query.sku);
    }
  }

  protected handleError(error: unknown): unknown {
    throw error;
  }
}
