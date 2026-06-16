import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { CatalogType } from "./CatalogType.js";
import type { BundleGroup } from "../../repositories/models/index.js";
import { BundleItemResolver } from "./BundleItemResolver.js";

export class BundleGroupResolver extends CatalogType<string, BundleGroup> {
  async $preload() {
    const bundleGroup = await this.$ctx.loaders.bundleGroup.load(this.$props);
    if (!bundleGroup) {
      throw new Error(`BundleGroup with ID ${this.$props} not found`);
    }
    return bundleGroup;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.BundleGroup);
  }

  async productId() {
    return encodeGlobalIdByType(await this.$get("productId"), GlobalIdEntity.Product);
  }

  async title() {
    return this.$get("title");
  }

  async sortIndex() {
    return this.$get("sortIndex");
  }

  async minSelection() {
    return this.$get("minSelection");
  }

  async maxSelection() {
    return this.$get("maxSelection");
  }

  async items() {
    const items = await this.$ctx.loaders.bundleItemsByGroupId.load(this.$props);
    return items.map((item) => new BundleItemResolver(item.id, this.$ctx));
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
