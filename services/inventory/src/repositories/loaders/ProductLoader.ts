import DataLoader from "dataloader";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { BaseLoader } from "./BaseLoader.js";
import {
  product,
  productTranslation,
  productOption,
  productFeature,
  type Product,
  type ProductTranslation,
  type ProductOption,
  type ProductFeature,
} from "../models/index.js";

/**
 * Product loaders interface
 */
export interface ProductDataLoaders {
  product: DataLoader<string, Product | null>;
  productTranslation: DataLoader<string, ProductTranslation | null>;
  productOptionIds: DataLoader<string, string[]>;
  productFeatureIds: DataLoader<string, string[]>;
  productOption: DataLoader<string, ProductOption | null>;
  productFeature: DataLoader<string, ProductFeature | null>;
}

/**
 * Loader for product-related data with batch loading support.
 * Provides DataLoaders for product translations, options, and features.
 */
export class ProductLoader extends BaseLoader {
  /**
   * Create all product-related DataLoaders
   */
  createLoaders(): ProductDataLoaders {
    return {
      product: this.createProductLoader(),
      productTranslation: this.createProductTranslationLoader(),
      productOptionIds: this.createProductOptionIdsLoader(),
      productFeatureIds: this.createProductFeatureIdsLoader(),
      productOption: this.createProductOptionLoader(),
      productFeature: this.createProductFeatureLoader(),
    };
  }

  /**
   * Product by ID
   */
  private createProductLoader(): DataLoader<string, Product | null> {
    const conn = this.connection;
    const projectId = this.projectId;

    return new DataLoader<string, Product | null>(async (productIds) => {
      const results = await conn
        .select()
        .from(product)
        .where(
          and(
            eq(product.projectId, projectId),
            inArray(product.id, [...productIds]),
            isNull(product.deletedAt)
          )
        );

      return productIds.map(
        (id) => results.find((p) => p.id === id) ?? null
      );
    });
  }

  /**
   * Product translation by product ID (for current locale)
   */
  private createProductTranslationLoader(): DataLoader<string, ProductTranslation | null> {
    const conn = this.connection;
    const projectId = this.projectId;
    const locale = this.locale;

    return new DataLoader<string, ProductTranslation | null>(async (productIds) => {
      const results = await conn
        .select()
        .from(productTranslation)
        .where(
          and(
            eq(productTranslation.projectId, projectId),
            inArray(productTranslation.productId, [...productIds]),
            eq(productTranslation.locale, locale)
          )
        );

      return productIds.map(
        (id) => results.find((t) => t.productId === id) ?? null
      );
    });
  }

  /**
   * Product option IDs by product ID
   */
  private createProductOptionIdsLoader(): DataLoader<string, string[]> {
    const conn = this.connection;
    const projectId = this.projectId;

    return new DataLoader<string, string[]>(async (productIds) => {
      const results = await conn
        .select({ id: productOption.id, productId: productOption.productId })
        .from(productOption)
        .where(
          and(
            eq(productOption.projectId, projectId),
            inArray(productOption.productId, [...productIds])
          )
        );

      return productIds.map((id) =>
        results.filter((o) => o.productId === id).map((o) => o.id)
      );
    });
  }

  /**
   * Product feature IDs by product ID
   */
  private createProductFeatureIdsLoader(): DataLoader<string, string[]> {
    const conn = this.connection;
    const projectId = this.projectId;

    return new DataLoader<string, string[]>(async (productIds) => {
      const results = await conn
        .select({ id: productFeature.id, productId: productFeature.productId })
        .from(productFeature)
        .where(
          and(
            eq(productFeature.projectId, projectId),
            inArray(productFeature.productId, [...productIds])
          )
        );

      return productIds.map((id) =>
        results.filter((f) => f.productId === id).map((f) => f.id)
      );
    });
  }

  /**
   * Product option by ID
   */
  private createProductOptionLoader(): DataLoader<string, ProductOption | null> {
    const conn = this.connection;
    const projectId = this.projectId;

    return new DataLoader<string, ProductOption | null>(async (optionIds) => {
      const results = await conn
        .select()
        .from(productOption)
        .where(
          and(
            eq(productOption.projectId, projectId),
            inArray(productOption.id, [...optionIds])
          )
        );

      return optionIds.map((id) => results.find((o) => o.id === id) ?? null);
    });
  }

  /**
   * Product feature by ID
   */
  private createProductFeatureLoader(): DataLoader<string, ProductFeature | null> {
    const conn = this.connection;
    const projectId = this.projectId;

    return new DataLoader<string, ProductFeature | null>(async (featureIds) => {
      const results = await conn
        .select()
        .from(productFeature)
        .where(
          and(
            eq(productFeature.projectId, projectId),
            inArray(productFeature.id, [...featureIds])
          )
        );

      return featureIds.map((id) => results.find((f) => f.id === id) ?? null);
    });
  }
}
