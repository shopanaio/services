import { eq, and, inArray } from "drizzle-orm";
import type { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database";
import {
  productTranslation,
  variantTranslation,
  productOptionTranslation,
  productOptionValueTranslation,
  productFeatureTranslation,
  productFeatureValueTranslation,
  warehouseTranslation,
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
} from "./models";

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

  async getProductTranslations(productId: string): Promise<ProductTranslation[]> {
    return this.connection
      .select()
      .from(productTranslation)
      .where(eq(productTranslation.productId, productId));
  }

  async getProductTranslationsBatch(
    productIds: string[],
    locale: string
  ): Promise<Map<string, ProductTranslation>> {
    if (productIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productTranslation)
      .where(
        and(
          inArray(productTranslation.productId, productIds),
          eq(productTranslation.locale, locale)
        )
      );

    return new Map(results.map((t) => [t.productId, t]));
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
          title: data.title,
          descriptionText: data.descriptionText,
          descriptionHtml: data.descriptionHtml,
          descriptionJson: data.descriptionJson,
          excerpt: data.excerpt,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
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
          title: productTranslation.title,
          descriptionText: productTranslation.descriptionText,
          descriptionHtml: productTranslation.descriptionHtml,
          descriptionJson: productTranslation.descriptionJson,
          excerpt: productTranslation.excerpt,
          seoTitle: productTranslation.seoTitle,
          seoDescription: productTranslation.seoDescription,
        },
      })
      .returning();
  }

  async deleteProductTranslation(
    productId: string,
    locale: string
  ): Promise<void> {
    await this.connection
      .delete(productTranslation)
      .where(
        and(
          eq(productTranslation.productId, productId),
          eq(productTranslation.locale, locale)
        )
      );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Variant Translations
  // ─────────────────────────────────────────────────────────────────────────

  async getVariantTranslation(
    variantId: string,
    locale: string
  ): Promise<VariantTranslation | undefined> {
    const result = await this.connection
      .select()
      .from(variantTranslation)
      .where(
        and(
          eq(variantTranslation.variantId, variantId),
          eq(variantTranslation.locale, locale)
        )
      )
      .limit(1);

    return result[0];
  }

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

  async getOptionTranslation(
    optionId: string,
    locale: string
  ): Promise<ProductOptionTranslation | undefined> {
    const result = await this.connection
      .select()
      .from(productOptionTranslation)
      .where(
        and(
          eq(productOptionTranslation.optionId, optionId),
          eq(productOptionTranslation.locale, locale)
        )
      )
      .limit(1);

    return result[0];
  }

  async getOptionTranslationsBatch(
    optionIds: string[],
    locale: string
  ): Promise<Map<string, ProductOptionTranslation>> {
    if (optionIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productOptionTranslation)
      .where(
        and(
          inArray(productOptionTranslation.optionId, optionIds),
          eq(productOptionTranslation.locale, locale)
        )
      );

    return new Map(results.map((t) => [t.optionId, t]));
  }

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

  async getOptionValueTranslation(
    optionValueId: string,
    locale: string
  ): Promise<ProductOptionValueTranslation | undefined> {
    const result = await this.connection
      .select()
      .from(productOptionValueTranslation)
      .where(
        and(
          eq(productOptionValueTranslation.optionValueId, optionValueId),
          eq(productOptionValueTranslation.locale, locale)
        )
      )
      .limit(1);

    return result[0];
  }

  async getOptionValueTranslationsBatch(
    optionValueIds: string[],
    locale: string
  ): Promise<Map<string, ProductOptionValueTranslation>> {
    if (optionValueIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productOptionValueTranslation)
      .where(
        and(
          inArray(productOptionValueTranslation.optionValueId, optionValueIds),
          eq(productOptionValueTranslation.locale, locale)
        )
      );

    return new Map(results.map((t) => [t.optionValueId, t]));
  }

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

  async getFeatureTranslation(
    featureId: string,
    locale: string
  ): Promise<ProductFeatureTranslation | undefined> {
    const result = await this.connection
      .select()
      .from(productFeatureTranslation)
      .where(
        and(
          eq(productFeatureTranslation.featureId, featureId),
          eq(productFeatureTranslation.locale, locale)
        )
      )
      .limit(1);

    return result[0];
  }

  async getFeatureTranslationsBatch(
    featureIds: string[],
    locale: string
  ): Promise<Map<string, ProductFeatureTranslation>> {
    if (featureIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productFeatureTranslation)
      .where(
        and(
          inArray(productFeatureTranslation.featureId, featureIds),
          eq(productFeatureTranslation.locale, locale)
        )
      );

    return new Map(results.map((t) => [t.featureId, t]));
  }

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

  async getFeatureValueTranslation(
    featureValueId: string,
    locale: string
  ): Promise<ProductFeatureValueTranslation | undefined> {
    const result = await this.connection
      .select()
      .from(productFeatureValueTranslation)
      .where(
        and(
          eq(productFeatureValueTranslation.featureValueId, featureValueId),
          eq(productFeatureValueTranslation.locale, locale)
        )
      )
      .limit(1);

    return result[0];
  }

  async getFeatureValueTranslationsBatch(
    featureValueIds: string[],
    locale: string
  ): Promise<Map<string, ProductFeatureValueTranslation>> {
    if (featureValueIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productFeatureValueTranslation)
      .where(
        and(
          inArray(productFeatureValueTranslation.featureValueId, featureValueIds),
          eq(productFeatureValueTranslation.locale, locale)
        )
      );

    return new Map(results.map((t) => [t.featureValueId, t]));
  }

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
}
