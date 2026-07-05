import type {
  CatalogProductKind,
  CatalogProductSnapshotVersion,
  CatalogProductStatus,
} from "@shopana/broker-types";
import { CatalogProductAvailabilitySnapshotResolver } from "./CatalogProductAvailabilitySnapshotResolver.js";
import { CatalogProductCategorySnapshotResolver } from "./CatalogProductCategorySnapshotResolver.js";
import { CatalogProductFeatureSelectionSnapshotResolver } from "./CatalogProductFeatureSelectionSnapshotResolver.js";
import { CatalogProductLocalizedContentSnapshotResolver } from "./CatalogProductLocalizedContentSnapshotResolver.js";
import { CatalogProductTagSnapshotResolver } from "./CatalogProductTagSnapshotResolver.js";
import { CatalogProductVariantSnapshotResolver } from "./CatalogProductVariantSnapshotResolver.js";
import { ServiceType } from "./ServiceType.js";

export class ProductSnapshotResolver extends ServiceType<string> {
  id() {
    return this.$props;
  }

  snapshotVersion(): CatalogProductSnapshotVersion {
    return this.notImplemented("ProductSnapshot.snapshotVersion");
  }

  storeId(): string {
    return this.notImplemented("ProductSnapshot.storeId");
  }

  revision(): number {
    return this.notImplemented("ProductSnapshot.revision");
  }

  kind(): CatalogProductKind {
    return this.notImplemented("ProductSnapshot.kind");
  }

  status(): CatalogProductStatus {
    return this.notImplemented("ProductSnapshot.status");
  }

  publishedAt(): string | null {
    return this.notImplemented("ProductSnapshot.publishedAt");
  }

  createdAt(): string {
    return this.notImplemented("ProductSnapshot.createdAt");
  }

  updatedAt(): string {
    return this.notImplemented("ProductSnapshot.updatedAt");
  }

  deletedAt(): string | null {
    return this.notImplemented("ProductSnapshot.deletedAt");
  }

  handle(): string | null {
    return this.notImplemented("ProductSnapshot.handle");
  }

  vendorId(): string | null {
    return this.notImplemented("ProductSnapshot.vendorId");
  }

  translations(): CatalogProductLocalizedContentSnapshotResolver[] {
    return this.notImplemented("ProductSnapshot.translations");
  }

  content(): CatalogProductLocalizedContentSnapshotResolver[] {
    return this.notImplemented("ProductSnapshot.content");
  }

  availability(): CatalogProductAvailabilitySnapshotResolver {
    return this.notImplemented("ProductSnapshot.availability");
  }

  primaryCategory(): CatalogProductCategorySnapshotResolver | null {
    return this.notImplemented("ProductSnapshot.primaryCategory");
  }

  categories(): CatalogProductCategorySnapshotResolver[] {
    return this.notImplemented("ProductSnapshot.categories");
  }

  tags(): CatalogProductTagSnapshotResolver[] {
    return this.notImplemented("ProductSnapshot.tags");
  }

  features(): CatalogProductFeatureSelectionSnapshotResolver[] {
    return this.notImplemented("ProductSnapshot.features");
  }

  variants(): CatalogProductVariantSnapshotResolver[] {
    return this.notImplemented("ProductSnapshot.variants");
  }
}
