import type { CatalogProductCollectionSnapshot } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductCollectionSnapshotResolver extends ServiceType<
  CatalogProductCollectionSnapshot,
  CatalogProductCollectionSnapshot
> {
  protected async $preload(): Promise<CatalogProductCollectionSnapshot> {
    return this.$props;
  }

  id(): string {
    return this.$props.id;
  }

  manualRank(): string {
    return this.$props.manualRank;
  }

  async $snapshot(): Promise<CatalogProductCollectionSnapshot> {
    return this.$data;
  }
}
