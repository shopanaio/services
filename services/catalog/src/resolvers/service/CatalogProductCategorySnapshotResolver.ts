import type { CatalogProductCategorySnapshot } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductCategorySnapshotResolver extends ServiceType<CatalogProductCategorySnapshot> {
  id(): string {
    return this.notImplemented("CatalogProductCategorySnapshot.id");
  }
}
