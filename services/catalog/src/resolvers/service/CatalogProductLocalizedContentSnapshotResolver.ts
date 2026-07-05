import type { CatalogProductLocalizedContentSnapshot } from "@shopana/broker-types";
import { CatalogRichTextSnapshotResolver } from "./CatalogRichTextSnapshotResolver.js";
import { ServiceType } from "./ServiceType.js";

export class CatalogProductLocalizedContentSnapshotResolver extends ServiceType<CatalogProductLocalizedContentSnapshot> {
  locale(): string {
    return this.notImplemented("CatalogProductLocalizedContentSnapshot.locale");
  }

  title(): string {
    return this.notImplemented("CatalogProductLocalizedContentSnapshot.title");
  }

  excerpt(): CatalogRichTextSnapshotResolver | null {
    return this.notImplemented("CatalogProductLocalizedContentSnapshot.excerpt");
  }

  description(): CatalogRichTextSnapshotResolver | null {
    return this.notImplemented(
      "CatalogProductLocalizedContentSnapshot.description"
    );
  }

  seoTitle(): string | null {
    return this.notImplemented(
      "CatalogProductLocalizedContentSnapshot.seoTitle"
    );
  }

  seoDescription(): string | null {
    return this.notImplemented(
      "CatalogProductLocalizedContentSnapshot.seoDescription"
    );
  }
}
