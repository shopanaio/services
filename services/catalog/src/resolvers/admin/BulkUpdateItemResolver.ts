import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { BulkEditItem } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

const OP_TYPE_MAP: Record<string, string> = {
  productUpdate: "PRODUCT_UPDATE",
  productSetStatus: "PRODUCT_SET_STATUS",
  variantSetSku: "VARIANT_SET_SKU",
  variantSetPricing: "VARIANT_SET_PRICING",
  variantSetCost: "VARIANT_SET_COST",
  variantSetStock: "VARIANT_SET_STOCK",
  variantSetDimensions: "VARIANT_SET_DIMENSIONS",
  variantSetWeight: "VARIANT_SET_WEIGHT",
};

export class BulkUpdateItemResolver extends CatalogType<string, BulkEditItem> {
  async $preload() {
    const item = await this.$ctx.loaders.bulkEditItem.load(this.$props);
    if (!item) {
      throw new Error(`BulkEditItem with ID ${this.$props} not found`);
    }
    return item;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.BulkUpdateItem);
  }

  async productId() {
    return this.$get("productId");
  }

  async variantId() {
    return this.$get("variantId");
  }

  async opType() {
    const opType = (await this.$get("opType")) ?? "";
    return OP_TYPE_MAP[opType] ?? "PRODUCT_UPDATE";
  }

  async opIndex() {
    return this.$get("opIndex");
  }

  async status() {
    return this.$get("status");
  }

  async startedAt() {
    return this.$get("startedAt");
  }

  async finishedAt() {
    return this.$get("finishedAt");
  }

  async errors() {
    const raw = (await this.$get("errors")) as
      | Array<{ message: string; code?: string; field?: string[] }>
      | null;

    if (!raw || raw.length === 0) return [];

    const productId = await this.$get("productId");
    const variantId = await this.$get("variantId");
    const operation = await this.$get("opType");

    return raw.map((error) => ({
      message: error.message,
      field: error.field,
      code: error.code,
      productId,
      variantId,
      operation,
    }));
  }

  async cancelReason() {
    return this.$get("cancelReason");
  }

  async supersededByJobId() {
    return this.$get("supersededByJobId");
  }
}
