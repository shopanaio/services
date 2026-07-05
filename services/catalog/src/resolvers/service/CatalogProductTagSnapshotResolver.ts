import type { CatalogProductTagSnapshot } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductTagSnapshotResolver extends ServiceType<CatalogProductTagSnapshot> {
  id(): string | null {
    return this.notImplemented("CatalogProductTagSnapshot.id");
  }

  handle(): string {
    return this.notImplemented("CatalogProductTagSnapshot.handle");
  }
}
