import type { CatalogProductAvailabilitySnapshot } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductAvailabilitySnapshotResolver extends ServiceType<CatalogProductAvailabilitySnapshot> {
  availableForSale(): boolean {
    return this.notImplemented(
      "CatalogProductAvailabilitySnapshot.availableForSale"
    );
  }

  totalQuantity(): number | null {
    return this.notImplemented(
      "CatalogProductAvailabilitySnapshot.totalQuantity"
    );
  }
}
