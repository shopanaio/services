import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { BundleItem } from "../../repositories/models/index.js";
import { BundlePricingTemplateResolver } from "./BundlePricingTemplateResolver.js";

export class BundleItemResolver extends CatalogType<string, BundleItem> {
  async $preload() {
    const bundleItem = await this.$ctx.loaders.bundleItem.load(this.$props);
    if (!bundleItem) {
      throw new Error(`BundleItem with ID ${this.$props} not found`);
    }
    return bundleItem;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.BundleItem);
  }

  async groupId() {
    return encodeGlobalIdByType(await this.$get("groupId"), GlobalIdEntity.BundleGroup);
  }

  async itemType() {
    return this.$get("itemType");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }

  async refProductId() {
    const refProductId = await this.$get("refProductId");
    return refProductId
      ? encodeGlobalIdByType(refProductId, GlobalIdEntity.Product)
      : null;
  }

  async refVariantId() {
    const refVariantId = await this.$get("refVariantId");
    return refVariantId
      ? encodeGlobalIdByType(refVariantId, GlobalIdEntity.Variant)
      : null;
  }

  async title() {
    return this.$get("title");
  }

  async featuredImageId() {
    const featuredImageId = await this.$get("featuredImageId");
    return featuredImageId
      ? encodeGlobalIdByType(featuredImageId, GlobalIdEntity.File)
      : null;
  }

  async excludedVariantIds() {
    const excludedVariantIds = await this.$get("excludedVariantIds");
    if (!excludedVariantIds) return null;
    return excludedVariantIds.map((id: string) =>
      encodeGlobalIdByType(id, GlobalIdEntity.Variant)
    );
  }

  async minQty() {
    return this.$get("minQty");
  }

  async maxQty() {
    return this.$get("maxQty");
  }

  async defaultQty() {
    return this.$get("defaultQty");
  }

  async priceType() {
    return this.$get("priceType");
  }

  async priceValue() {
    return this.$get("priceValue");
  }

  async pricingTemplateId() {
    const pricingTemplateId = await this.$get("pricingTemplateId");
    return pricingTemplateId
      ? encodeGlobalIdByType(pricingTemplateId, GlobalIdEntity.BundlePricingTemplate)
      : null;
  }

  async pricingTemplate() {
    const pricingTemplateId = await this.$get("pricingTemplateId");
    if (!pricingTemplateId) return null;
    return new BundlePricingTemplateResolver(pricingTemplateId, this.$ctx);
  }

  async visible() {
    return this.$get("visible");
  }

  async selected() {
    return this.$get("selected");
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
