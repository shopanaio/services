import type { CatalogProductOptionValueRef } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductOptionValueRefResolver extends ServiceType<CatalogProductOptionValueRef> {
  id(): string | null {
    return this.notImplemented("CatalogProductOptionValueRef.id");
  }

  handle(): string {
    return this.notImplemented("CatalogProductOptionValueRef.handle");
  }
}
