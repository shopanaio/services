import { BaseType } from "@shopana/type-executor";
import type { Product } from "../models/index.js";
import type { Description } from "../../domain/types/product.js";
import type { ProductTypeContext } from "./context.js";
import { VariantType } from "./VariantType.js";
import { OptionType } from "./OptionType.js";
import { FeatureType } from "./FeatureType.js";

/**
 * Product type - resolves Product domain interface
 * Accepts product ID, loads data lazily via loaders
 */
export class ProductType extends BaseType<string, Product | null> {
  static fields = {
    variants: () => VariantType,
    options: () => OptionType,
    features: () => FeatureType,
  };

  protected async loadData() {
    return this.ctx<ProductTypeContext>().loaders.product.load(this.value);
  }

  id() {
    return this.value;
  }

  async handle() {
    return (await this.data)?.handle ?? null;
  }

  async publishedAt() {
    return (await this.data)?.publishedAt ?? null;
  }

  async isPublished() {
    const publishedAt = (await this.data)?.publishedAt;
    if (!publishedAt) return false;
    return publishedAt <= new Date();
  }

  async createdAt() {
    return (await this.data)?.createdAt ?? null;
  }

  async updatedAt() {
    return (await this.data)?.updatedAt ?? null;
  }

  async deletedAt() {
    return (await this.data)?.deletedAt ?? null;
  }

  async title() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.productTranslation.load(this.value);
    return translation?.title ?? "";
  }

  async description(): Promise<Description | null> {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.productTranslation.load(this.value);
    if (!translation) return null;

    return {
      text: translation.descriptionText ?? "",
      html: translation.descriptionHtml ?? "",
      json: translation.descriptionJson,
    };
  }

  async excerpt() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.productTranslation.load(this.value);
    return translation?.excerpt ?? null;
  }

  async seoTitle() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.productTranslation.load(this.value);
    return translation?.seoTitle ?? null;
  }

  async seoDescription() {
    const ctx = this.ctx<ProductTypeContext>();
    const translation = await ctx.loaders.productTranslation.load(this.value);
    return translation?.seoDescription ?? null;
  }

  /**
   * Returns variant IDs for this product
   */
  async variants(): Promise<string[]> {
    const ctx = this.ctx<ProductTypeContext>();
    return ctx.loaders.variantIds.load(this.value);
  }

  /**
   * Returns option IDs for this product
   */
  async options(): Promise<string[]> {
    const ctx = this.ctx<ProductTypeContext>();
    return ctx.loaders.productOptionIds.load(this.value);
  }

  /**
   * Returns feature IDs for this product
   */
  async features(): Promise<string[]> {
    const ctx = this.ctx<ProductTypeContext>();
    return ctx.loaders.productFeatureIds.load(this.value);
  }
}
