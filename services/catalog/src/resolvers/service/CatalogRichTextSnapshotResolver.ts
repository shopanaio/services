import type { CatalogRichTextSnapshot } from "@shopana/broker-types";
import { ServiceType } from "./ServiceType.js";

export class CatalogRichTextSnapshotResolver extends ServiceType<CatalogRichTextSnapshot> {
  text(): string {
    return this.notImplemented("CatalogRichTextSnapshot.text");
  }

  html(): string {
    return this.notImplemented("CatalogRichTextSnapshot.html");
  }

  json(): unknown {
    return this.notImplemented("CatalogRichTextSnapshot.json");
  }
}
