import { BaseType } from "@shopana/type-resolver";
import type { Description } from "./interfaces/product.js";
import type { Product } from "../../repositories/models/index.js";
import type { ProductVariantsArgs } from "./args.js";
import { FeatureView } from "./FeatureView.js";
import { OptionView } from "./OptionView.js";
import { VariantView } from "./VariantView.js";
import type { ServiceContext } from "../../context/types.js";

/**
 * Product view - resolves Product domain interface
 * Accepts product ID, loads data lazily via loaders
 */
export class ProductView extends BaseType<
  string,
  Product | null,
  ServiceContext
> {
  static fields = {
    variants: () => VariantView,
    options: () => OptionView,
    features: () => FeatureView,
  };

  async loadData() {
    return this.ctx.loaders.product.load(this.value);
  }

  id() {
    return this.value;
  }

  async handle() {
    return this.get("handle");
  }

  async publishedAt() {
    return this.get("publishedAt");
  }

  async isPublished() {
    const publishedAt = await this.get("publishedAt");
    if (!publishedAt) return false;
    return publishedAt <= new Date();
  }

  async createdAt() {
    return this.get("createdAt");
  }

  async updatedAt() {
    return this.get("updatedAt");
  }

  async deletedAt() {
    return this.get("deletedAt");
  }

  async title() {
    const translation = await this.ctx.loaders.productTranslation.load(
      this.value
    );
    return translation?.title ?? "";
  }

  async description(): Promise<Description | null> {
    const translation = await this.ctx.loaders.productTranslation.load(
      this.value
    );
    if (!translation) return null;

    return {
      text: translation.descriptionText ?? "",
      html: translation.descriptionHtml ?? "",
      json: translation.descriptionJson,
    };
  }

  async excerpt() {
    const translation = await this.ctx.loaders.productTranslation.load(
      this.value
    );
    return translation?.excerpt ?? null;
  }

  async seoTitle() {
    const translation = await this.ctx.loaders.productTranslation.load(
      this.value
    );
    return translation?.seoTitle ?? null;
  }

  async seoDescription() {
    const translation = await this.ctx.loaders.productTranslation.load(
      this.value
    );
    return translation?.seoDescription ?? null;
  }

  /**
   * Returns variant IDs for this product
   * @param args - Pagination arguments (first, last, after, before)
   */
  async variants(args: ProductVariantsArgs): Promise<string[]> {
    const services = this.ctx.kernel.getServices();
    return services.repository.variantQuery.getIdsByProductId(this.value, args);
  }

  /**
   * Returns option IDs for this product
   */
  async options(): Promise<string[]> {
    return this.ctx.loaders.productOptionIds.load(this.value);
  }

  /**
   * Returns feature IDs for this product
   */
  async features(): Promise<string[]> {
    return this.ctx.loaders.productFeatureIds.load(this.value);
  }
}
