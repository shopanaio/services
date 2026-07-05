import type { ServiceContext } from "../../context/types.js";
import type { CatalogProductAvailabilitySnapshotInput } from "./CatalogProductAvailabilitySnapshotResolver.js";
import type { CatalogProductLocalizedContentSnapshotInput } from "./CatalogProductLocalizedContentSnapshotResolver.js";
import type { CatalogProductSeoSnapshotInput } from "./CatalogProductSeoSnapshotResolver.js";
import type { CatalogProductVariantOptionSelectionSnapshotInput } from "./CatalogProductVariantOptionSelectionSnapshotResolver.js";
import type { CatalogRichTextSnapshotInput } from "./CatalogRichTextSnapshotResolver.js";

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
    input: CatalogProductLocalizedContentSnapshotInput
  ) {
    const { CatalogProductLocalizedContentSnapshotResolver } = await import(
      "./CatalogProductLocalizedContentSnapshotResolver.js"
    );
    return new CatalogProductLocalizedContentSnapshotResolver(input, this.ctx);
  }

  async catalogProductSeoSnapshot(input: CatalogProductSeoSnapshotInput) {
    const { CatalogProductSeoSnapshotResolver } = await import(
      "./CatalogProductSeoSnapshotResolver.js"
    );
    return new CatalogProductSeoSnapshotResolver(input, this.ctx);
  }

  async catalogRichTextSnapshot(input: CatalogRichTextSnapshotInput) {
    const { CatalogRichTextSnapshotResolver } = await import(
      "./CatalogRichTextSnapshotResolver.js"
    );
    return new CatalogRichTextSnapshotResolver(input, this.ctx);
  }

  async catalogProductAvailabilitySnapshot(
    input: CatalogProductAvailabilitySnapshotInput
  ) {
    const { CatalogProductAvailabilitySnapshotResolver } = await import(
      "./CatalogProductAvailabilitySnapshotResolver.js"
    );
    return new CatalogProductAvailabilitySnapshotResolver(input, this.ctx);
  }

  async catalogProductCategorySnapshot(categoryId: string) {
    const { CatalogProductCategorySnapshotResolver } = await import(
      "./CatalogProductCategorySnapshotResolver.js"
    );
    return new CatalogProductCategorySnapshotResolver(categoryId, this.ctx);
  }

  async catalogProductTagSnapshot(tagId: string) {
    const { CatalogProductTagSnapshotResolver } = await import(
      "./CatalogProductTagSnapshotResolver.js"
    );
    return new CatalogProductTagSnapshotResolver(tagId, this.ctx);
  }

  async catalogProductFeatureSelectionSnapshot(featureId: string) {
    const { CatalogProductFeatureSelectionSnapshotResolver } = await import(
      "./CatalogProductFeatureSelectionSnapshotResolver.js"
    );
    return new CatalogProductFeatureSelectionSnapshotResolver(
      featureId,
      this.ctx
    );
  }

  async catalogProductFeatureValueRef(valueId: string) {
    const { CatalogProductFeatureValueRefResolver } = await import(
      "./CatalogProductFeatureValueRefResolver.js"
    );
    return new CatalogProductFeatureValueRefResolver(valueId, this.ctx);
  }

  async catalogProductVariantSnapshot(variantId: string) {
    const { CatalogProductVariantSnapshotResolver } = await import(
      "./CatalogProductVariantSnapshotResolver.js"
    );
    return new CatalogProductVariantSnapshotResolver(variantId, this.ctx);
  }

  async catalogProductVariantPriceSnapshot(priceId: string) {
    const { CatalogProductVariantPriceSnapshotResolver } = await import(
      "./CatalogProductVariantPriceSnapshotResolver.js"
    );
    return new CatalogProductVariantPriceSnapshotResolver(priceId, this.ctx);
  }

  async catalogProductVariantOptionSelectionSnapshot(
    input: CatalogProductVariantOptionSelectionSnapshotInput
  ) {
    const { CatalogProductVariantOptionSelectionSnapshotResolver } =
      await import("./CatalogProductVariantOptionSelectionSnapshotResolver.js");
    return new CatalogProductVariantOptionSelectionSnapshotResolver(
      input,
      this.ctx
    );
  }

  async catalogProductOptionValueRef(valueId: string) {
    const { CatalogProductOptionValueRefResolver } = await import(
      "./CatalogProductOptionValueRefResolver.js"
    );
    return new CatalogProductOptionValueRefResolver(valueId, this.ctx);
  }
}
