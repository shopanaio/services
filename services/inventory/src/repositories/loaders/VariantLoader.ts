import DataLoader from "dataloader";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { BaseLoader } from "./BaseLoader.js";
import {
  variant,
  variantTranslation,
  itemPricing,
  itemDimensions,
  itemWeight,
  variantMedia,
  warehouseStock,
  productOptionVariantLink,
  type Variant,
  type VariantTranslation,
  type ItemPricing,
  type ItemDimensions,
  type ItemWeight,
  type VariantMedia,
  type WarehouseStock,
  type ProductOptionVariantLink,
} from "../models/index.js";

/**
 * Variant loaders interface
 */
export interface VariantLoaders {
  variant: DataLoader<string, Variant | null>;
  variantIds: DataLoader<string, string[]>;
  variantTranslation: DataLoader<string, VariantTranslation | null>;
  variantPricing: DataLoader<string, ItemPricing[]>;
  variantPriceById: DataLoader<string, ItemPricing | null>;
  variantPriceIds: DataLoader<string, string[]>;
  variantDimensions: DataLoader<string, ItemDimensions | null>;
  variantWeight: DataLoader<string, ItemWeight | null>;
  variantMedia: DataLoader<string, VariantMedia[]>;
  variantStock: DataLoader<string, WarehouseStock[]>;
  variantSelectedOptions: DataLoader<string, ProductOptionVariantLink[]>;
}

/**
 * Loader for variant-related data with batch loading support.
 * Provides DataLoaders for variants and their relations.
 */
export class VariantLoader extends BaseLoader {
  /**
   * Create all variant-related DataLoaders
   */
  createLoaders(): VariantLoaders {
    return {
      variant: this.createVariantLoader(),
      variantIds: this.createVariantIdsLoader(),
      variantTranslation: this.createVariantTranslationLoader(),
      variantPricing: this.createVariantPricingLoader(),
      variantPriceById: this.createVariantPriceByIdLoader(),
      variantPriceIds: this.createVariantPriceIdsLoader(),
      variantDimensions: this.createVariantDimensionsLoader(),
      variantWeight: this.createVariantWeightLoader(),
      variantMedia: this.createVariantMediaLoader(),
      variantStock: this.createVariantStockLoader(),
      variantSelectedOptions: this.createVariantSelectedOptionsLoader(),
    };
  }

  /**
   * Variant by ID
   */
  private createVariantLoader(): DataLoader<string, Variant | null> {
    return new DataLoader<string, Variant | null>(async (variantIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select()
        .from(variant)
        .where(
          and(
            eq(variant.projectId, projectId),
            inArray(variant.id, [...variantIds]),
            isNull(variant.deletedAt)
          )
        );

      return variantIds.map((id) => results.find((v) => v.id === id) ?? null);
    });
  }

  /**
   * Variant IDs by product ID
   */
  private createVariantIdsLoader(): DataLoader<string, string[]> {
    return new DataLoader<string, string[]>(async (productIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select({ id: variant.id, productId: variant.productId })
        .from(variant)
        .where(
          and(
            eq(variant.projectId, projectId),
            inArray(variant.productId, [...productIds]),
            isNull(variant.deletedAt)
          )
        );

      return productIds.map((id) =>
        results.filter((v) => v.productId === id).map((v) => v.id)
      );
    });
  }

  /**
   * Variant translation by variant ID (for current locale)
   */
  private createVariantTranslationLoader(): DataLoader<string, VariantTranslation | null> {
    return new DataLoader<string, VariantTranslation | null>(async (variantIds) => {
      const conn = this.connection;
      const projectId = this.projectId;
      const locale = this.locale;

      const results = await conn
        .select()
        .from(variantTranslation)
        .where(
          and(
            eq(variantTranslation.projectId, projectId),
            inArray(variantTranslation.variantId, [...variantIds]),
            eq(variantTranslation.locale, locale)
          )
        );

      return variantIds.map(
        (id) => results.find((t) => t.variantId === id) ?? null
      );
    });
  }

  /**
   * Variant pricing by variant ID (active pricing only)
   */
  private createVariantPricingLoader(): DataLoader<string, ItemPricing[]> {
    return new DataLoader<string, ItemPricing[]>(async (variantIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select()
        .from(itemPricing)
        .where(
          and(
            eq(itemPricing.projectId, projectId),
            inArray(itemPricing.variantId, [...variantIds]),
            isNull(itemPricing.effectiveTo)
          )
        );

      return variantIds.map((id) => results.filter((p) => p.variantId === id));
    });
  }

  /**
   * Variant price by price ID
   */
  private createVariantPriceByIdLoader(): DataLoader<string, ItemPricing | null> {
    return new DataLoader<string, ItemPricing | null>(async (priceIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select()
        .from(itemPricing)
        .where(
          and(
            eq(itemPricing.projectId, projectId),
            inArray(itemPricing.id, [...priceIds])
          )
        );

      return priceIds.map((id) => results.find((p) => p.id === id) ?? null);
    });
  }

  /**
   * Variant price IDs by variant ID (all prices, for history)
   */
  private createVariantPriceIdsLoader(): DataLoader<string, string[]> {
    return new DataLoader<string, string[]>(async (variantIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select({ id: itemPricing.id, variantId: itemPricing.variantId })
        .from(itemPricing)
        .where(
          and(
            eq(itemPricing.projectId, projectId),
            inArray(itemPricing.variantId, [...variantIds])
          )
        );

      return variantIds.map((id) =>
        results.filter((p) => p.variantId === id).map((p) => p.id)
      );
    });
  }

  /**
   * Variant dimensions by variant ID
   */
  private createVariantDimensionsLoader(): DataLoader<string, ItemDimensions | null> {
    return new DataLoader<string, ItemDimensions | null>(async (variantIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select()
        .from(itemDimensions)
        .where(
          and(
            eq(itemDimensions.projectId, projectId),
            inArray(itemDimensions.variantId, [...variantIds])
          )
        );

      return variantIds.map(
        (id) => results.find((d) => d.variantId === id) ?? null
      );
    });
  }

  /**
   * Variant weight by variant ID
   */
  private createVariantWeightLoader(): DataLoader<string, ItemWeight | null> {
    return new DataLoader<string, ItemWeight | null>(async (variantIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select()
        .from(itemWeight)
        .where(
          and(
            eq(itemWeight.projectId, projectId),
            inArray(itemWeight.variantId, [...variantIds])
          )
        );

      return variantIds.map(
        (id) => results.find((w) => w.variantId === id) ?? null
      );
    });
  }

  /**
   * Variant media by variant ID (sorted by sortIndex)
   */
  private createVariantMediaLoader(): DataLoader<string, VariantMedia[]> {
    return new DataLoader<string, VariantMedia[]>(async (variantIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select()
        .from(variantMedia)
        .where(
          and(
            eq(variantMedia.projectId, projectId),
            inArray(variantMedia.variantId, [...variantIds])
          )
        );

      return variantIds.map((id) =>
        results.filter((m) => m.variantId === id).sort((a, b) => a.sortIndex - b.sortIndex)
      );
    });
  }

  /**
   * Variant stock by variant ID
   */
  private createVariantStockLoader(): DataLoader<string, WarehouseStock[]> {
    return new DataLoader<string, WarehouseStock[]>(async (variantIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select()
        .from(warehouseStock)
        .where(
          and(
            eq(warehouseStock.projectId, projectId),
            inArray(warehouseStock.variantId, [...variantIds])
          )
        );

      return variantIds.map((id) => results.filter((s) => s.variantId === id));
    });
  }

  /**
   * Variant selected options (option value links) by variant ID
   */
  private createVariantSelectedOptionsLoader(): DataLoader<string, ProductOptionVariantLink[]> {
    return new DataLoader<string, ProductOptionVariantLink[]>(async (variantIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select()
        .from(productOptionVariantLink)
        .where(
          and(
            eq(productOptionVariantLink.projectId, projectId),
            inArray(productOptionVariantLink.variantId, [...variantIds])
          )
        );

      return variantIds.map((id) =>
        results.filter((o) => o.variantId === id)
      );
    });
  }
}
