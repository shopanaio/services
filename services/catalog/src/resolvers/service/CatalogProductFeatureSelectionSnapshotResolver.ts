import type { CatalogProductFeatureSelectionSnapshot } from "@shopana/broker-types";
import { CatalogProductFeatureValueRefResolver } from "./CatalogProductFeatureValueRefResolver.js";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductFeatureSelectionSnapshotResolver extends ServiceType<CatalogProductFeatureSelectionSnapshot> {
  id(): string | null {
    return this.notImplemented("CatalogProductFeatureSelectionSnapshot.id");
  }

  handle(): string {
    return this.notImplemented("CatalogProductFeatureSelectionSnapshot.handle");
  }

  values(): CatalogProductFeatureValueRefResolver[] {
    return this.notImplemented("CatalogProductFeatureSelectionSnapshot.values");
  }
}
