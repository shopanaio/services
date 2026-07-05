import type {
  CatalogProductAvailabilitySnapshot,
  CatalogProductCategorySnapshot,
  CatalogProductFeatureSelectionSnapshot,
  CatalogProductFeatureValueRef,
  CatalogProductLocalizedContentSnapshot,
  CatalogProductOptionValueRef,
  CatalogProductTagSnapshot,
  CatalogProductVariantOptionSelectionSnapshot,
  CatalogProductVariantPriceSnapshot,
  CatalogProductVariantSnapshot,
  CatalogRichTextSnapshot,
} from "@shopana/broker-types";
import type { ServiceContext } from "../../context/types.js";

const registries = new WeakMap<ServiceContext, ServiceResolverRegistry>();

export function getServiceResolverRegistry(ctx: ServiceContext): ServiceResolverRegistry {
  const existing = registries.get(ctx);
  if (existing) return existing;

  const registry = new ServiceResolverRegistry(ctx);
  registries.set(ctx, registry);
  return registry;
}

export class ServiceResolverRegistry {
  constructor(private readonly ctx: ServiceContext) {}

  async productSnapshot(id: string) {
    const { ProductSnapshotResolver } = await import(
      "./ProductSnapshotResolver.js"
    );
    return new ProductSnapshotResolver(id, this.ctx);
  }

  async catalogProductLocalizedContentSnapshot(
    snapshot: CatalogProductLocalizedContentSnapshot
  ) {
    const { CatalogProductLocalizedContentSnapshotResolver } = await import(
      "./CatalogProductLocalizedContentSnapshotResolver.js"
    );
    return new CatalogProductLocalizedContentSnapshotResolver(snapshot, this.ctx);
  }

  async catalogRichTextSnapshot(snapshot: CatalogRichTextSnapshot) {
    const { CatalogRichTextSnapshotResolver } = await import(
      "./CatalogRichTextSnapshotResolver.js"
    );
    return new CatalogRichTextSnapshotResolver(snapshot, this.ctx);
  }

  async catalogProductAvailabilitySnapshot(
    snapshot: CatalogProductAvailabilitySnapshot
  ) {
    const { CatalogProductAvailabilitySnapshotResolver } = await import(
      "./CatalogProductAvailabilitySnapshotResolver.js"
    );
    return new CatalogProductAvailabilitySnapshotResolver(snapshot, this.ctx);
  }

  async catalogProductCategorySnapshot(
    snapshot: CatalogProductCategorySnapshot
  ) {
    const { CatalogProductCategorySnapshotResolver } = await import(
      "./CatalogProductCategorySnapshotResolver.js"
    );
    return new CatalogProductCategorySnapshotResolver(snapshot, this.ctx);
  }

  async catalogProductTagSnapshot(snapshot: CatalogProductTagSnapshot) {
    const { CatalogProductTagSnapshotResolver } = await import(
      "./CatalogProductTagSnapshotResolver.js"
    );
    return new CatalogProductTagSnapshotResolver(snapshot, this.ctx);
  }

  async catalogProductFeatureSelectionSnapshot(
    snapshot: CatalogProductFeatureSelectionSnapshot
  ) {
    const { CatalogProductFeatureSelectionSnapshotResolver } = await import(
      "./CatalogProductFeatureSelectionSnapshotResolver.js"
    );
    return new CatalogProductFeatureSelectionSnapshotResolver(
      snapshot,
      this.ctx
    );
  }

  async catalogProductFeatureValueRef(
    snapshot: CatalogProductFeatureValueRef
  ) {
    const { CatalogProductFeatureValueRefResolver } = await import(
      "./CatalogProductFeatureValueRefResolver.js"
    );
    return new CatalogProductFeatureValueRefResolver(snapshot, this.ctx);
  }

  async catalogProductVariantSnapshot(
    snapshot: CatalogProductVariantSnapshot
  ) {
    const { CatalogProductVariantSnapshotResolver } = await import(
      "./CatalogProductVariantSnapshotResolver.js"
    );
    return new CatalogProductVariantSnapshotResolver(snapshot, this.ctx);
  }

  async catalogProductVariantPriceSnapshot(
    snapshot: CatalogProductVariantPriceSnapshot
  ) {
    const { CatalogProductVariantPriceSnapshotResolver } = await import(
      "./CatalogProductVariantPriceSnapshotResolver.js"
    );
    return new CatalogProductVariantPriceSnapshotResolver(snapshot, this.ctx);
  }

  async catalogProductVariantOptionSelectionSnapshot(
    snapshot: CatalogProductVariantOptionSelectionSnapshot
  ) {
    const { CatalogProductVariantOptionSelectionSnapshotResolver } =
      await import("./CatalogProductVariantOptionSelectionSnapshotResolver.js");
    return new CatalogProductVariantOptionSelectionSnapshotResolver(
      snapshot,
      this.ctx
    );
  }

  async catalogProductOptionValueRef(
    snapshot: CatalogProductOptionValueRef
  ) {
    const { CatalogProductOptionValueRefResolver } = await import(
      "./CatalogProductOptionValueRefResolver.js"
    );
    return new CatalogProductOptionValueRefResolver(snapshot, this.ctx);
  }
}
