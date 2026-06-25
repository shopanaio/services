import { eq, and, inArray, sql } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../../infrastructure/db/database.js";
import { getContext } from "../../context/index.js";
import {
  productTranslation,
  variantTranslation,
  productOptionTranslation,
  productOptionValueTranslation,
  productFeatureTranslation,
  productFeatureValueTranslation,
  warehouseTranslation,
  productSeo,
  categorySeo,
  type ProductTranslation,
  type NewProductTranslation,
  type VariantTranslation,
  type NewVariantTranslation,
  type ProductOptionTranslation,
  type NewProductOptionTranslation,
  type ProductOptionValueTranslation,
  type NewProductOptionValueTranslation,
  type ProductFeatureTranslation,
  type NewProductFeatureTranslation,
  type ProductFeatureValueTranslation,
  type NewProductFeatureValueTranslation,
  type WarehouseTranslation,
  type NewWarehouseTranslation,
  type ProductSeo,
  type NewProductSeo,
  type CategorySeo,
  type NewCategorySeo,
} from "../models";

export class TranslationRepository {
  constructor(
    private readonly db: Database,
    private readonly txManager: TransactionManager<Database>
  ) {}

  /**
   * Get active connection (transaction if in tx, otherwise db)
   */
  private get connection(): Database {
    return this.txManager.getConnection() as Database;
  }

  private get locale(): string {
    const context = getContext();
    return context.locale ?? context.store.defaultLocale;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Product Translations
  // ─────────────────────────────────────────────────────────────────────────

  async getProductTranslation(
    productId: string,
    locale: string
  ): Promise<ProductTranslation | undefined> {
    const result = await this.connection
      .select()
      .from(productTranslation)
      .where(
        and(
          eq(productTranslation.productId, productId),
          eq(productTranslation.locale, locale)
        )
      )
      .limit(1);

    return result[0];
  }

  async upsertProductTranslation(
    data: NewProductTranslation
  ): Promise<ProductTranslation> {
    const result = await this.connection
      .insert(productTranslation)
      .values(data)
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: {
          name: data.name,
          descriptionText: data.descriptionText,
          descriptionHtml: data.descriptionHtml,
          descriptionJson: data.descriptionJson,
          excerptText: data.excerptText,
          excerptHtml: data.excerptHtml,
          excerptJson: data.excerptJson,
        },
      })
      .returning();

    return result[0];
  }

  async upsertProductTranslationsBatch(
    translations: NewProductTranslation[]
  ): Promise<ProductTranslation[]> {
    if (translations.length === 0) return [];

    return this.connection
      .insert(productTranslation)
      .values(translations)
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: {
          name: sql`excluded.name`,
          descriptionText: sql`excluded.description_text`,
          descriptionHtml: sql`excluded.description_html`,
          descriptionJson: sql`excluded.description_json`,
          excerptText: sql`excluded.excerpt_text`,
          excerptHtml: sql`excluded.excerpt_html`,
          excerptJson: sql`excluded.excerpt_json`,
        },
      })
      .returning();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variant Translations
  // ─────────────────────────────────────────────────────────────────────────

  async upsertVariantTranslation(
    data: NewVariantTranslation
  ): Promise<VariantTranslation> {
    const result = await this.connection
      .insert(variantTranslation)
      .values(data)
      .onConflictDoUpdate({
        target: [variantTranslation.variantId, variantTranslation.locale],
        set: { title: data.title },
      })
      .returning();

    return result[0];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Option Translations
  // ─────────────────────────────────────────────────────────────────────────

  async upsertOptionTranslation(
    data: NewProductOptionTranslation
  ): Promise<ProductOptionTranslation> {
    const result = await this.connection
      .insert(productOptionTranslation)
      .values(data)
      .onConflictDoUpdate({
        target: [productOptionTranslation.optionId, productOptionTranslation.locale],
        set: { name: data.name },
      })
      .returning();

    return result[0];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Option Value Translations
  // ─────────────────────────────────────────────────────────────────────────

  async upsertOptionValueTranslation(
    data: NewProductOptionValueTranslation
  ): Promise<ProductOptionValueTranslation> {
    const result = await this.connection
      .insert(productOptionValueTranslation)
      .values(data)
      .onConflictDoUpdate({
        target: [
          productOptionValueTranslation.optionValueId,
          productOptionValueTranslation.locale,
        ],
        set: { name: data.name },
      })
      .returning();

    return result[0];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Feature Translations
  // ─────────────────────────────────────────────────────────────────────────

  async upsertFeatureTranslation(
    data: NewProductFeatureTranslation
  ): Promise<ProductFeatureTranslation> {
    const result = await this.connection
      .insert(productFeatureTranslation)
      .values(data)
      .onConflictDoUpdate({
        target: [productFeatureTranslation.featureId, productFeatureTranslation.locale],
        set: { name: data.name },
      })
      .returning();

    return result[0];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Feature Value Translations
  // ─────────────────────────────────────────────────────────────────────────

  async upsertFeatureValueTranslation(
    data: NewProductFeatureValueTranslation
  ): Promise<ProductFeatureValueTranslation> {
    const result = await this.connection
      .insert(productFeatureValueTranslation)
      .values(data)
      .onConflictDoUpdate({
        target: [
          productFeatureValueTranslation.featureValueId,
          productFeatureValueTranslation.locale,
        ],
        set: { name: data.name },
      })
      .returning();

    return result[0];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Warehouse Translations
  // ─────────────────────────────────────────────────────────────────────────

  async getWarehouseTranslation(
    warehouseId: string,
    locale: string
  ): Promise<WarehouseTranslation | undefined> {
    const result = await this.connection
      .select()
      .from(warehouseTranslation)
      .where(
        and(
          eq(warehouseTranslation.warehouseId, warehouseId),
          eq(warehouseTranslation.locale, locale)
        )
      )
      .limit(1);

    return result[0];
  }

  async upsertWarehouseTranslation(
    data: NewWarehouseTranslation
  ): Promise<WarehouseTranslation> {
    const result = await this.connection
      .insert(warehouseTranslation)
      .values(data)
      .onConflictDoUpdate({
        target: [warehouseTranslation.warehouseId, warehouseTranslation.locale],
        set: { name: data.name },
      })
      .returning();

    return result[0];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Product SEO
  // ─────────────────────────────────────────────────────────────────────────

  async getProductSeo(
    productId: string,
    locale: string
  ): Promise<ProductSeo | undefined> {
    const result = await this.connection
      .select()
      .from(productSeo)
      .where(
        and(
          eq(productSeo.productId, productId),
          eq(productSeo.locale, locale)
        )
      )
      .limit(1);

    return result[0];
  }

  async getProductSeoBatch(
    productIds: readonly string[]
  ): Promise<Map<string, ProductSeo>> {
    if (productIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productSeo)
      .where(
        and(
          inArray(productSeo.productId, productIds as string[]),
          eq(productSeo.locale, this.locale)
        )
      );

    return new Map(results.map((s) => [s.productId, s]));
  }

  async upsertProductSeo(data: NewProductSeo): Promise<ProductSeo> {
    const result = await this.connection
      .insert(productSeo)
      .values(data)
      .onConflictDoUpdate({
        target: [productSeo.productId, productSeo.locale],
        set: {
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          ogTitle: data.ogTitle,
          ogDescription: data.ogDescription,
          ogImageId: data.ogImageId,
        },
      })
      .returning();

    return result[0];
  }

  async getCategorySeoBatch(
    categoryIds: readonly string[]
  ): Promise<Map<string, CategorySeo>> {
    if (categoryIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(categorySeo)
      .where(
        and(
          inArray(categorySeo.categoryId, categoryIds as string[]),
          eq(categorySeo.locale, this.locale)
        )
      );

    return new Map(results.map((s) => [s.categoryId, s]));
  }

  async upsertCategorySeo(data: NewCategorySeo): Promise<CategorySeo> {
    const result = await this.connection
      .insert(categorySeo)
      .values(data)
      .onConflictDoUpdate({
        target: [categorySeo.categoryId, categorySeo.locale],
        set: {
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          ogTitle: data.ogTitle,
          ogDescription: data.ogDescription,
          ogImageId: data.ogImageId,
        },
      })
      .returning();

    return result[0];
  }

  async deleteCategorySeo(categoryId: string, locale: string): Promise<void> {
    await this.connection
      .delete(categorySeo)
      .where(
        and(
          eq(categorySeo.categoryId, categoryId),
          eq(categorySeo.locale, locale)
        )
      );
  }
}
