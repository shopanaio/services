import { BaseScript } from "../../kernel/BaseScript.js";
import {
  validateFeatureSyncParams,
  type FeatureSyncValidationResult,
} from "../feature/validation/index.js";
import {
  validateOptionSyncParams,
  type OptionSyncValidationResult,
} from "../option/validation/index.js";
import type {
  ProductFeaturesSyncParams,
  ProductOptionsSyncParams,
} from "../../workflows/product-update/dto/ProductUpdateWorkflowDto.js";

export interface ProductUpdateReadQueryMap {
  productExists: { type: "productExists"; productId: string };
  optionSyncValidation: { type: "optionSyncValidation"; params: ProductOptionsSyncParams };
  featureSyncValidation: { type: "featureSyncValidation"; params: ProductFeaturesSyncParams };
  vendor: { type: "vendor"; vendorId: string };
  productByHandle: { type: "productByHandle"; handle: string };
  effectiveProfiles: { type: "effectiveProfiles"; productId: string };
  configurationProfileIds: { type: "configurationProfileIds"; productId: string };
  variants: { type: "variants"; productId: string };
  options: { type: "options"; productId: string };
  optionValues: { type: "optionValues"; optionIds: string[] };
  inventoryItems: { type: "inventoryItems"; variantIds: string[] };
  variantLinks: { type: "variantLinks"; variantIds: string[] };
  stocks: {
    type: "stocks";
    pairs: Array<{ variantId: string; warehouseId: string }>;
  };
  warehouses: { type: "warehouses"; warehouseIds: string[] };
  productMedia: { type: "productMedia"; productId: string; fileIds: string[] };
  inventoryItemsBySku: { type: "inventoryItemsBySku"; skus: string[] };
}

export interface ProductUpdateReadResultMap {
  productExists: boolean;
  optionSyncValidation: OptionSyncValidationResult;
  featureSyncValidation: FeatureSyncValidationResult;
  vendor: { id: string } | null;
  productByHandle: { id: string } | null;
  effectiveProfiles: Array<{ profileId: string | null }>;
  configurationProfileIds: string[];
  variants: Array<{ id: string; isDefault: boolean }>;
  options: Array<{ id: string }>;
  optionValues: Map<string, Array<{ id: string }>>;
  inventoryItems: Array<{ variantId: string }>;
  variantLinks: Map<string, Array<{ optionId: string; optionValueId: string | null }>>;
  stocks: Array<{ variantId: string; warehouseId: string; reservedQty: number }>;
  warehouses: Array<{ id: string }>;
  productMedia: Array<{ fileId: string }>;
  inventoryItemsBySku: Array<{ sku: string | null; variantId: string }>;
}

export type ProductUpdateReadQuery = ProductUpdateReadQueryMap[keyof ProductUpdateReadQueryMap];

export type ProductUpdateReadResponse = {
  [TType in keyof ProductUpdateReadQueryMap]: {
    type: TType;
    result: ProductUpdateReadResultMap[TType];
  };
}[keyof ProductUpdateReadQueryMap];

export type ProductUpdateReadResponseFor<TType extends keyof ProductUpdateReadQueryMap> = Extract<
  ProductUpdateReadResponse,
  { type: TType }
>;

export function isProductUpdateReadResponseFor<TType extends keyof ProductUpdateReadQueryMap>(
  response: ProductUpdateReadResponse,
  query: ProductUpdateReadQueryMap[TType],
): response is ProductUpdateReadResponseFor<TType> {
  return response.type === query.type;
}

/**
 * Read boundary for ProductUpdateWorkflow.
 *
 * Repositories depend on ServiceContext for tenant scope, so workflows must
 * access them through Kernel.runScript with the persisted workflow context.
 */
export class ProductUpdateReadScript extends BaseScript<
  ProductUpdateReadQuery,
  ProductUpdateReadResponse
> {
  protected async execute(query: ProductUpdateReadQuery): Promise<ProductUpdateReadResponse> {
    switch (query.type) {
      case "productExists":
        return {
          type: query.type,
          result: await this.repository.product.exists(query.productId),
        };
      case "optionSyncValidation":
        return {
          type: query.type,
          result: await validateOptionSyncParams(this.repository, query.params),
        };
      case "featureSyncValidation":
        return {
          type: query.type,
          result: await validateFeatureSyncParams(this.repository, query.params),
        };
      case "vendor":
        return {
          type: query.type,
          result: await this.repository.vendor.findById(query.vendorId),
        };
      case "productByHandle":
        return {
          type: query.type,
          result: await this.repository.product.findByHandle(query.handle),
        };
      case "effectiveProfiles":
        return {
          type: query.type,
          result: await this.repository.comparisonRead.getEffectiveProfilesByProductIds([
            query.productId,
          ]),
        };
      case "configurationProfileIds":
        return {
          type: query.type,
          result: await this.repository.comparisonRead.productConfigurationProfileIds(
            query.productId,
          ),
        };
      case "variants":
        return {
          type: query.type,
          result: await this.repository.variant.findByProductId(query.productId),
        };
      case "options":
        return {
          type: query.type,
          result: await this.repository.option.findByProductId(query.productId),
        };
      case "optionValues":
        return {
          type: query.type,
          result: await this.repository.option.findValuesByOptionIds(query.optionIds),
        };
      case "inventoryItems":
        return {
          type: query.type,
          result: await this.repository.inventoryItem.findActiveByVariantIds(query.variantIds),
        };
      case "variantLinks":
        return {
          type: query.type,
          result: await this.repository.option.findVariantLinks(query.variantIds),
        };
      case "stocks":
        return {
          type: query.type,
          result: await this.repository.stock.findByVariantWarehousePairs(query.pairs),
        };
      case "warehouses":
        return {
          type: query.type,
          result: await this.repository.warehouse.getByIds(query.warehouseIds),
        };
      case "productMedia":
        return {
          type: query.type,
          result: await this.repository.media.getProductMediaByFileIds(
            query.productId,
            query.fileIds,
          ),
        };
      case "inventoryItemsBySku":
        return {
          type: query.type,
          result: await this.repository.inventoryItem.findBySkus(query.skus),
        };
    }
  }

  protected handleError(error: unknown): ProductUpdateReadResponse {
    throw error;
  }
}
