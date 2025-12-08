import { BaseType } from "@shopana/type-executor";
import type { Description } from "../../domain/types/product.js";
import type { ProductTypeContext } from "./context.js";
import { VariantType } from "./VariantType.js";
import { OptionType } from "./OptionType.js";
import { FeatureType } from "./FeatureType.js";

/**
 * Product type - resolves Product domain interface
 * Accepts product ID, loads all data via loaders
 */
export class ProductType extends BaseType<string> {
  static fields = {
    variants: () => VariantType,
    options: () => OptionType,
    features: () => FeatureType,
  };

  id() {
    return this.value;
  }

  async handle() {
    const ctx = this.ctx<ProductTypeContext>();
    const product = await ctx.loaders.product.load(this.value);
    return product?.handle ?? null;
  }

  async publishedAt() {
    const ctx = this.ctx<ProductTypeContext>();
    const product = await ctx.loaders.product.load(this.value);
    return product?.publishedAt ?? null;
  }

  async isPublished() {
    const ctx = this.ctx<ProductTypeContext>();
    const product = await ctx.loaders.product.load(this.value);
    if (!product?.publishedAt) return false;
    return product.publishedAt <= new Date();
  }

  async createdAt() {
    const ctx = this.ctx<ProductTypeContext>();
    const product = await ctx.loaders.product.load(this.value);
    return product?.createdAt ?? null;
  }

  async updatedAt() {
    const ctx = this.ctx<ProductTypeContext>();
    const product = await ctx.loaders.product.load(this.value);
    return product?.updatedAt ?? null;
  }

  async deletedAt() {
    const ctx = this.ctx<ProductTypeContext>();
    const product = await ctx.loaders.product.load(this.value);
    return product?.deletedAt ?? null;
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
