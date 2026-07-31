import type {
  CatalogProductLocalizedContentSnapshot,
  CatalogProductSeoSnapshot,
  CatalogProductSnapshotVersion,
  CatalogProductStatus,
} from "@shopana/broker-types";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { Product } from "../../repositories/models/index.js";
import type { CatalogProductAvailabilitySnapshotResolver } from "./CatalogProductAvailabilitySnapshotResolver.js";
import type { CatalogProductCategorySnapshotResolver } from "./CatalogProductCategorySnapshotResolver.js";
import type { CatalogProductFeatureSelectionSnapshotResolver } from "./CatalogProductFeatureSelectionSnapshotResolver.js";
import type { CatalogProductLocalizedContentSnapshotResolver } from "./CatalogProductLocalizedContentSnapshotResolver.js";
import type { CatalogProductSeoSnapshotResolver } from "./CatalogProductSeoSnapshotResolver.js";
import type { CatalogProductTagSnapshotResolver } from "./CatalogProductTagSnapshotResolver.js";
import type { CatalogProductVariantSnapshotResolver } from "./CatalogProductVariantSnapshotResolver.js";
import type { CatalogProductVendorSnapshotResolver } from "./CatalogProductVendorSnapshotResolver.js";
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
      ? this.resolvers.catalogProductVendorSnapshot(vendorId)
      : null;
  }

  availability(): Promise<CatalogProductAvailabilitySnapshotResolver> {
    return this.resolvers.catalogProductAvailabilitySnapshot({
      productId: this.$props,
    });
  }

  async primaryCategory(): Promise<CatalogProductCategorySnapshotResolver | null> {
    const links = await this.$ctx.loaders.productCategoryLinksByProductId.load(
      this.$props
    );
    const primary = links.find((link) => link.isPrimary);
    return primary
      ? this.resolvers.catalogProductCategorySnapshot({
          categoryId: primary.categoryId,
          primary: true,
          manualRank: primary.lexoRank,
        })
      : null;
  }

  async categories(): Promise<CatalogProductCategorySnapshotResolver[]> {
    const links = await this.$ctx.loaders.productCategoryLinksByProductId.load(
      this.$props
    );
    return Promise.all(
      [...links]
        .sort((a, b) => {
          if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
          const rank = a.lexoRank.localeCompare(b.lexoRank);
          if (rank !== 0) return rank;
          return a.categoryId.localeCompare(b.categoryId);
        })
        .map((link) =>
          this.resolvers.catalogProductCategorySnapshot({
            categoryId: link.categoryId,
            primary: link.isPrimary,
            manualRank: link.lexoRank,
          })
        )
    );
  }

  async tags(): Promise<CatalogProductTagSnapshotResolver[]> {
    const tagIds = await this.$ctx.loaders.productTagIds.load(this.$props);
    return Promise.all(
      tagIds.map((tagId) =>
        this.resolvers.catalogProductTagSnapshot(tagId)
      )
    );
  }

  async features(): Promise<CatalogProductFeatureSelectionSnapshotResolver[]> {
    const featureIds = await this.$ctx.loaders.productFeatureIds.load(this.$props);
    return Promise.all(
      featureIds.map((featureId) =>
        this.resolvers.catalogProductFeatureSelectionSnapshot(featureId)
      )
    );
  }

  async variants(): Promise<CatalogProductVariantSnapshotResolver[]> {
    const variantIds = await this.$ctx.loaders.variantIds.load(this.$props);
    return Promise.all(
      variantIds.map((variantId) =>
        this.resolvers.catalogProductVariantSnapshot(variantId)
      )
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
      this.availabilitySnapshot(),
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
    return Promise.all(
      translations.map((translation) =>
        this.resolvers.catalogProductLocalizedContentSnapshot({
          productId: this.$props,
          locale: translation.locale,
        })
      )
    );
  }

  private async seoResolvers(): Promise<CatalogProductSeoSnapshotResolver[]> {
    const seoRows = await this.$ctx.loaders.productSeos.load(this.$props);
    return Promise.all(
      seoRows.map((seo) =>
        this.resolvers.catalogProductSeoSnapshot({
          productId: this.$props,
          locale: seo.locale,
        })
      )
    );
  }

  private async availabilitySnapshot() {
    const resolver = await this.availability();
    return resolver.$snapshot();
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
