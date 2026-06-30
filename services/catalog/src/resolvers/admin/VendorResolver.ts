import { SubgraphReference } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Vendor } from "../../repositories/models/index.js";
import { CatalogType } from "./CatalogType.js";

@SubgraphReference()
export class VendorResolver extends CatalogType<string, Vendor> {
  async $preload() {
    const vendor = await this.$ctx.loaders.vendor.load(this.$props);
    if (!vendor) {
      throw new Error(`Vendor with ID ${this.$props} not found`);
    }
    return vendor;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Vendor);
  }

  async name() {
    return this.$get("name");
  }
}
