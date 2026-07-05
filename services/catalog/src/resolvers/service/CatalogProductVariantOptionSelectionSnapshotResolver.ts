import type { CatalogProductVariantOptionSelectionSnapshot } from "@shopana/broker-types";
import { CatalogProductOptionValueRefResolver } from "./CatalogProductOptionValueRefResolver.js";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductVariantOptionSelectionSnapshotResolver extends ServiceType<CatalogProductVariantOptionSelectionSnapshot> {
  id(): string | null {
    return this.notImplemented(
      "CatalogProductVariantOptionSelectionSnapshot.id"
    );
  }

  handle(): string {
    return this.notImplemented(
      "CatalogProductVariantOptionSelectionSnapshot.handle"
    );
  }

  values(): CatalogProductOptionValueRefResolver[] {
    return this.notImplemented(
      "CatalogProductVariantOptionSelectionSnapshot.values"
    );
  }
}
