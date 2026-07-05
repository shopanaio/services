import type { CatalogProductFeatureValueRef } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductFeatureValueRefResolver extends ServiceType<CatalogProductFeatureValueRef> {
  id(): string | null {
    return this.notImplemented("CatalogProductFeatureValueRef.id");
  }

  handle(): string {
    return this.notImplemented("CatalogProductFeatureValueRef.handle");
  }
}
