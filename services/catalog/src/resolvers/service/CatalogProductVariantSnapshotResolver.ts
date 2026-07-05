import type { CatalogProductVariantSnapshot } from "@shopana/broker-types";
import { CatalogProductAvailabilitySnapshotResolver } from "./CatalogProductAvailabilitySnapshotResolver.js";
import { CatalogProductVariantOptionSelectionSnapshotResolver } from "./CatalogProductVariantOptionSelectionSnapshotResolver.js";
import { CatalogProductVariantPriceSnapshotResolver } from "./CatalogProductVariantPriceSnapshotResolver.js";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductVariantSnapshotResolver extends ServiceType<CatalogProductVariantSnapshot> {
  id(): string {
    return this.notImplemented("CatalogProductVariantSnapshot.id");
  }

  handle(): string {
    return this.notImplemented("CatalogProductVariantSnapshot.handle");
  }

  isDefault(): boolean {
    return this.notImplemented("CatalogProductVariantSnapshot.isDefault");
  }

  createdAt(): string {
    return this.notImplemented("CatalogProductVariantSnapshot.createdAt");
  }

  updatedAt(): string {
    return this.notImplemented("CatalogProductVariantSnapshot.updatedAt");
  }

  availability(): CatalogProductAvailabilitySnapshotResolver {
    return this.notImplemented("CatalogProductVariantSnapshot.availability");
  }

  prices(): CatalogProductVariantPriceSnapshotResolver[] {
    return this.notImplemented("CatalogProductVariantSnapshot.prices");
  }

  options(): CatalogProductVariantOptionSelectionSnapshotResolver[] {
    return this.notImplemented("CatalogProductVariantSnapshot.options");
  }
}
