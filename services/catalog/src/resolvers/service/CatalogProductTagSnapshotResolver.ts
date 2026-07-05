import type { CatalogProductTagSnapshot } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductTagSnapshotResolver extends ServiceType<
  string,
  CatalogProductTagSnapshot
> {
  protected async $preload(): Promise<CatalogProductTagSnapshot> {
    const tag = await this.$ctx.loaders.tag.load(this.$props);
    if (!tag) {
      throw new Error(`Tag with ID ${this.$props} not found`);
    }
    return { id: tag.id, handle: tag.handle };
  }

  async id(): Promise<string | null> {
    return (await this.$get("id")) ?? null;
  }

  async handle(): Promise<string> {
    return this.$get("handle");
  }

  async $snapshot() {
    return this.$data;
  }
}
