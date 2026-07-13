import type {
  CatalogProductKind,
  CatalogProductLocalizedContentSnapshot,
  CatalogProductSeoSnapshot,
  CatalogProductSnapshotVersion,
  CatalogProductStatus,
} from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { Product } from "../../repositories/models/index.js";
import { CatalogProductAvailabilitySnapshotResolver } from "./CatalogProductAvailabilitySnapshotResolver.js";
import { CatalogProductCategorySnapshotResolver } from "./CatalogProductCategorySnapshotResolver.js";
import { CatalogProductFeatureSelectionSnapshotResolver } from "./CatalogProductFeatureSelectionSnapshotResolver.js";
import { CatalogProductLocalizedContentSnapshotResolver } from "./CatalogProductLocalizedContentSnapshotResolver.js";
import { CatalogProductSeoSnapshotResolver } from "./CatalogProductSeoSnapshotResolver.js";
import { CatalogProductTagSnapshotResolver } from "./CatalogProductTagSnapshotResolver.js";
import { CatalogProductVariantSnapshotResolver } from "./CatalogProductVariantSnapshotResolver.js";
import { CatalogProductVendorSnapshotResolver } from "./CatalogProductVendorSnapshotResolver.js";
import { ServiceType } from "./ServiceType.js";

export class ProductSnapshotResolver extends ServiceType<string, Product> {
  protected async $preload(): Promise<Product> {
    const product = await this.$ctx.loaders.product.load(this.$props);
    if (!product) {
      throw new PreloadNotFoundError(
        `Product with ID ${this.$props} not found`
      );
    }
    return product;
  }

  id() {
    return this.$props;
  }

  snapshotVersion(): CatalogProductSnapshotVersion {
    return "2026-07-13";
  }

  async storeId(): Promise<string> {
    return this.$get("storeId");
  }

  async revision(): Promise<number> {
    return this.$get("revision");
  }

  async kind(): Promise<CatalogProductKind> {
    return this.$get("kind");
  }

  async status(): Promise<CatalogProductStatus> {
    return (await this.$get("publishedAt")) ? "published" : "draft";
  }

  async publishedAt(): Promise<string | null> {
    return this.$get("publishedAt");
  }

  async createdAt(): Promise<string> {
    return this.$get("createdAt");
  }

  async updatedAt(): Promise<string> {
    return this.$get("updatedAt");
  }

  async deletedAt(): Promise<string | null> {
    return this.$get("deletedAt");
  }

  async handle(): Promise<string | null> {
    return this.$get("handle");
  }

  async vendorId(): Promise<string | null> {
    return (await this.$get("vendorId")) ?? null;
  }

  async content(): Promise<CatalogProductLocalizedContentSnapshotResolver[]> {
    return this.localizedContentResolvers();
  }

  async seo(): Promise<CatalogProductSeoSnapshotResolver[]> {
    return this.seoResolvers();
  }

  async vendor(): Promise<CatalogProductVendorSnapshotResolver | null> {
    const vendorId = await this.$get("vendorId");
    return vendorId
      ? new CatalogProductVendorSnapshotResolver(vendorId, this.$ctx)
      : null;
  }

  availability(): CatalogProductAvailabilitySnapshotResolver {
    return new CatalogProductAvailabilitySnapshotResolver(
      { productId: this.$props },
      this.$ctx
    );
  }

  async primaryCategory(): Promise<CatalogProductCategorySnapshotResolver | null> {
    const links = await this.$ctx.loaders.productCategoryLinksByProductId.load(
      this.$props
    );
    const primary = links.find((link) => link.isPrimary);
    return primary
      ? new CatalogProductCategorySnapshotResolver(primary.categoryId, this.$ctx)
      : null;
  }

  async categories(): Promise<CatalogProductCategorySnapshotResolver[]> {
    const links = await this.$ctx.loaders.productCategoryLinksByProductId.load(
      this.$props
    );
    return [...links]
      .sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        const rank = a.lexoRank.localeCompare(b.lexoRank);
        if (rank !== 0) return rank;
        return a.categoryId.localeCompare(b.categoryId);
      })
      .map(
        (link) => new CatalogProductCategorySnapshotResolver(link.categoryId, this.$ctx)
      );
  }

  async tags(): Promise<CatalogProductTagSnapshotResolver[]> {
    const tagIds = await this.$ctx.loaders.productTagIds.load(this.$props);
    return tagIds.map((tagId) => new CatalogProductTagSnapshotResolver(tagId, this.$ctx));
  }

  async features(): Promise<CatalogProductFeatureSelectionSnapshotResolver[]> {
    const featureIds = await this.$ctx.loaders.productFeatureIds.load(this.$props);
    return featureIds.map(
      (featureId) =>
        new CatalogProductFeatureSelectionSnapshotResolver(featureId, this.$ctx)
    );
  }

  async variants(): Promise<CatalogProductVariantSnapshotResolver[]> {
    const variantIds = await this.$ctx.loaders.variantIds.load(this.$props);
    return variantIds.map(
      (variantId) => new CatalogProductVariantSnapshotResolver(variantId, this.$ctx)
    );
  }

  async $snapshot() {
    const product = await this.$data;
    const [
      content,
      seo,
      vendor,
      availability,
      primaryCategory,
      categories,
      tags,
      features,
      variants,
    ] = await Promise.all([
      this.contentSnapshot(),
      this.seoSnapshot(),
      this.vendorSnapshot(),
      this.availability().$snapshot(),
      this.primaryCategorySnapshot(),
      this.categorySnapshots(),
      this.tagSnapshots(),
      this.featureSnapshots(),
      this.variantSnapshots(),
    ]);

    return {
      snapshotVersion: this.snapshotVersion(),
      id: product.id,
      storeId: product.storeId,
      revision: product.revision,
      kind: product.kind,
      status: product.publishedAt ? "published" : "draft",
      publishedAt: product.publishedAt,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
      handle: product.handle,
      vendorId: product.vendorId,
      content,
      seo,
      vendor,
      availability,
      primaryCategory,
      categories,
      tags,
      features,
      variants,
    };
  }

  private async contentSnapshot(): Promise<
    CatalogProductLocalizedContentSnapshot[]
  > {
    const resolvers = this.localizedContentResolvers();
    return Promise.all(
      (await resolvers).map(async (resolver) => resolver.$snapshot())
    );
  }

  private async seoSnapshot(): Promise<CatalogProductSeoSnapshot[]> {
    const resolvers = this.seoResolvers();
    return Promise.all(
      (await resolvers).map(async (resolver) => resolver.$snapshot())
    );
  }

  private async vendorSnapshot() {
    const resolver = await this.vendor();
    return resolver ? resolver.$snapshot() : null;
  }

  private async localizedContentResolvers(): Promise<
    CatalogProductLocalizedContentSnapshotResolver[]
  > {
    const translations = await this.$ctx.loaders.productTranslations.load(
      this.$props
    );
    return translations.map(
      (translation) =>
        new CatalogProductLocalizedContentSnapshotResolver(
          { productId: this.$props, locale: translation.locale },
          this.$ctx
        )
    );
  }

  private async seoResolvers(): Promise<CatalogProductSeoSnapshotResolver[]> {
    const seoRows = await this.$ctx.loaders.productSeos.load(this.$props);
    return seoRows.map(
      (seo) =>
        new CatalogProductSeoSnapshotResolver(
          { productId: this.$props, locale: seo.locale },
          this.$ctx
        )
    );
  }

  private async primaryCategorySnapshot() {
    const resolver = await this.primaryCategory();
    return resolver ? resolver.$snapshot() : null;
  }

  private async categorySnapshots() {
    const resolvers = await this.categories();
    return Promise.all(resolvers.map((resolver) => resolver.$snapshot()));
  }

  private async tagSnapshots() {
    const resolvers = await this.tags();
    return Promise.all(resolvers.map((resolver) => resolver.$snapshot()));
  }

  private async featureSnapshots() {
    const resolvers = await this.features();
    return Promise.all(resolvers.map((resolver) => resolver.$snapshot()));
  }

  private async variantSnapshots() {
    const resolvers = await this.variants();
    return Promise.all(resolvers.map((resolver) => resolver.$snapshot()));
  }
}
