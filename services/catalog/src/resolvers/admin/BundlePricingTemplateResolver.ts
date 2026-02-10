import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { BundlePricingTemplate } from "../../repositories/models/index.js";

export class BundlePricingTemplateResolver extends CatalogType<
  string,
  BundlePricingTemplate
> {
  async $preload() {
    const template = await this.$ctx.loaders.bundlePricingTemplate.load(
      this.$props
    );
    if (!template) {
      throw new Error(`BundlePricingTemplate with ID ${this.$props} not found`);
    }
    return template;
  }

  id() {
    return encodeGlobalIdByType(
      this.$props,
      GlobalIdEntity.BundlePricingTemplate
    );
  }

  async productId() {
    return encodeGlobalIdByType(
      await this.$get("productId"),
      GlobalIdEntity.Product
    );
  }

  async name() {
    return this.$get("name");
  }

  async priceType() {
    return this.$get("priceType");
  }

  async priceValue() {
    return this.$get("priceValue");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }
}
