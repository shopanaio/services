import type { CatalogProductVendorSnapshot } from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductVendorSnapshotResolver extends ServiceType<
  string,
  CatalogProductVendorSnapshot
> {
  protected async $preload(): Promise<CatalogProductVendorSnapshot> {
    const vendor = await this.$ctx.loaders.vendor.load(this.$props);
    if (!vendor) {
      throw new PreloadNotFoundError(
        `Vendor with ID ${this.$props} not found`
      );
    }

    return {
      id: vendor.id,
      name: vendor.name,
    };
  }

  async id(): Promise<string> {
    return this.$get("id");
  }

  async name(): Promise<string> {
    return this.$get("name");
  }

  async $snapshot(): Promise<CatalogProductVendorSnapshot> {
    return this.$data;
  }
}
