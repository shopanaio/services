import DataLoader from "dataloader";
import { and, eq, inArray } from "drizzle-orm";
import { BaseLoader } from "./BaseLoader.js";
import {
  productFeatureTranslation,
  productFeatureValue,
  productFeatureValueTranslation,
  type ProductFeatureTranslation,
  type ProductFeatureValue,
  type ProductFeatureValueTranslation,
} from "../models/index.js";

/**
 * Feature loaders interface
 */
export interface FeatureLoaders {
  featureTranslation: DataLoader<string, ProductFeatureTranslation | null>;
  featureValueIds: DataLoader<string, string[]>;
  featureValue: DataLoader<string, ProductFeatureValue | null>;
  featureValueTranslation: DataLoader<string, ProductFeatureValueTranslation | null>;
}

/**
 * Loader for feature-related data with batch loading support.
 * Provides DataLoaders for feature translations and values.
 */
export class FeatureLoader extends BaseLoader {
  /**
   * Create all feature-related DataLoaders
   */
  createLoaders(): FeatureLoaders {
    return {
      featureTranslation: this.createFeatureTranslationLoader(),
      featureValueIds: this.createFeatureValueIdsLoader(),
      featureValue: this.createFeatureValueLoader(),
      featureValueTranslation: this.createFeatureValueTranslationLoader(),
    };
  }

  /**
   * Feature translation by feature ID (for current locale)
   */
  private createFeatureTranslationLoader(): DataLoader<string, ProductFeatureTranslation | null> {
    const conn = this.connection;
    const projectId = this.projectId;
    const locale = this.locale;

    return new DataLoader<string, ProductFeatureTranslation | null>(async (featureIds) => {
      const results = await conn
        .select()
        .from(productFeatureTranslation)
        .where(
          and(
            eq(productFeatureTranslation.projectId, projectId),
            inArray(productFeatureTranslation.featureId, [...featureIds]),
            eq(productFeatureTranslation.locale, locale)
          )
        );

      return featureIds.map(
        (id) => results.find((t) => t.featureId === id) ?? null
      );
    });
  }

  /**
   * Feature value IDs by feature ID (sorted by sortIndex)
   */
  private createFeatureValueIdsLoader(): DataLoader<string, string[]> {
    const conn = this.connection;
    const projectId = this.projectId;

    return new DataLoader<string, string[]>(async (featureIds) => {
      const results = await conn
        .select({
          id: productFeatureValue.id,
          featureId: productFeatureValue.featureId,
          sortIndex: productFeatureValue.sortIndex,
        })
        .from(productFeatureValue)
        .where(
          and(
            eq(productFeatureValue.projectId, projectId),
            inArray(productFeatureValue.featureId, [...featureIds])
          )
        );

      return featureIds.map((id) =>
        results
          .filter((v) => v.featureId === id)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((v) => v.id)
      );
    });
  }

  /**
   * Feature value by ID
   */
  private createFeatureValueLoader(): DataLoader<string, ProductFeatureValue | null> {
    const conn = this.connection;
    const projectId = this.projectId;

    return new DataLoader<string, ProductFeatureValue | null>(async (valueIds) => {
      const results = await conn
        .select()
        .from(productFeatureValue)
        .where(
          and(
            eq(productFeatureValue.projectId, projectId),
            inArray(productFeatureValue.id, [...valueIds])
          )
        );

      return valueIds.map((id) => results.find((v) => v.id === id) ?? null);
    });
  }

  /**
   * Feature value translation by feature value ID (for current locale)
   */
  private createFeatureValueTranslationLoader(): DataLoader<string, ProductFeatureValueTranslation | null> {
    const conn = this.connection;
    const projectId = this.projectId;
    const locale = this.locale;

    return new DataLoader<string, ProductFeatureValueTranslation | null>(async (featureValueIds) => {
      const results = await conn
        .select()
        .from(productFeatureValueTranslation)
        .where(
          and(
            eq(productFeatureValueTranslation.projectId, projectId),
            inArray(productFeatureValueTranslation.featureValueId, [...featureValueIds]),
            eq(productFeatureValueTranslation.locale, locale)
          )
        );

      return featureValueIds.map(
        (id) => results.find((t) => t.featureValueId === id) ?? null
      );
    });
  }
}
