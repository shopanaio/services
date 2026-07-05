import type { CatalogProductVariantPriceSnapshot } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductVariantPriceSnapshotResolver extends ServiceType<CatalogProductVariantPriceSnapshot> {
  currencyCode(): string {
    return this.notImplemented(
      "CatalogProductVariantPriceSnapshot.currencyCode"
    );
  }

  amountMinor(): number | null {
    return this.notImplemented("CatalogProductVariantPriceSnapshot.amountMinor");
  }
}
