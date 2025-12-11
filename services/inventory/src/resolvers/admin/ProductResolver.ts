import type { Description } from "./interfaces/index.js";
import type { Product } from "../../repositories/models/index.js";
import type { VariantRelayInput } from "../../repositories/variant/VariantRepository.js";
import { InventoryType } from "./InventoryType.js";
import { FeatureResolver } from "./FeatureResolver.js";
import { OptionResolver } from "./OptionResolver.js";
import {
  VariantConnectionResolver,
  type VariantConnectionInput,
} from "./VariantConnectionResolver.js";

/**
 * Product view - resolves Product domain interface
 * Accepts product ID, loads data lazily via loaders
 */
export class ProductResolver extends InventoryType<string, Product | null> {
  static fields = {
    variants: () => VariantConnectionResolver,
    options: () => OptionResolver,
    features: () => FeatureResolver,
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
   * Returns variant connection input for this product
   * @param args - Pagination arguments (first, last, after, before)
   */
  async variants(args: VariantRelayInput): Promise<VariantConnectionInput> {
    return {
      ...args,
      productId: this.value,
    };
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
