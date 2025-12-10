import DataLoader from "dataloader";
import { and, eq, inArray } from "drizzle-orm";
import { BaseLoader } from "./BaseLoader.js";
import {
  productOptionTranslation,
  productOptionValue,
  productOptionValueTranslation,
  type ProductOptionTranslation,
  type ProductOptionValue,
  type ProductOptionValueTranslation,
} from "../models/index.js";

/**
 * Option loaders interface
 */
export interface OptionLoaders {
  optionTranslation: DataLoader<string, ProductOptionTranslation | null>;
  optionValueIds: DataLoader<string, string[]>;
  optionValue: DataLoader<string, ProductOptionValue | null>;
  optionValueTranslation: DataLoader<string, ProductOptionValueTranslation | null>;
}

/**
 * Loader for option-related data with batch loading support.
 * Provides DataLoaders for option translations and values.
 */
export class OptionLoader extends BaseLoader {
  /**
   * Create all option-related DataLoaders
   */
  createLoaders(): OptionLoaders {
    return {
      optionTranslation: this.createOptionTranslationLoader(),
      optionValueIds: this.createOptionValueIdsLoader(),
      optionValue: this.createOptionValueLoader(),
      optionValueTranslation: this.createOptionValueTranslationLoader(),
    };
  }

  /**
   * Option translation by option ID (for current locale)
   */
  private createOptionTranslationLoader(): DataLoader<string, ProductOptionTranslation | null> {
    return new DataLoader<string, ProductOptionTranslation | null>(async (optionIds) => {
      const conn = this.connection;
      const projectId = this.projectId;
      const locale = this.locale;

      const results = await conn
        .select()
        .from(productOptionTranslation)
        .where(
          and(
            eq(productOptionTranslation.projectId, projectId),
            inArray(productOptionTranslation.optionId, [...optionIds]),
            eq(productOptionTranslation.locale, locale)
          )
        );

      return optionIds.map(
        (id) => results.find((t) => t.optionId === id) ?? null
      );
    });
  }

  /**
   * Option value IDs by option ID (sorted by sortIndex)
   */
  private createOptionValueIdsLoader(): DataLoader<string, string[]> {
    return new DataLoader<string, string[]>(async (optionIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select({
          id: productOptionValue.id,
          optionId: productOptionValue.optionId,
          sortIndex: productOptionValue.sortIndex,
        })
        .from(productOptionValue)
        .where(
          and(
            eq(productOptionValue.projectId, projectId),
            inArray(productOptionValue.optionId, [...optionIds])
          )
        );

      return optionIds.map((id) =>
        results
          .filter((v) => v.optionId === id)
          .sort((a, b) => a.sortIndex - b.sortIndex)
          .map((v) => v.id)
      );
    });
  }

  /**
   * Option value by ID
   */
  private createOptionValueLoader(): DataLoader<string, ProductOptionValue | null> {
    return new DataLoader<string, ProductOptionValue | null>(async (valueIds) => {
      const conn = this.connection;
      const projectId = this.projectId;

      const results = await conn
        .select()
        .from(productOptionValue)
        .where(
          and(
            eq(productOptionValue.projectId, projectId),
            inArray(productOptionValue.id, [...valueIds])
          )
        );

      return valueIds.map((id) => results.find((v) => v.id === id) ?? null);
    });
  }

  /**
   * Option value translation by option value ID (for current locale)
   */
  private createOptionValueTranslationLoader(): DataLoader<string, ProductOptionValueTranslation | null> {
    return new DataLoader<string, ProductOptionValueTranslation | null>(async (optionValueIds) => {
      const conn = this.connection;
      const projectId = this.projectId;
      const locale = this.locale;

      const results = await conn
        .select()
        .from(productOptionValueTranslation)
        .where(
          and(
            eq(productOptionValueTranslation.projectId, projectId),
            inArray(productOptionValueTranslation.optionValueId, [...optionValueIds]),
            eq(productOptionValueTranslation.locale, locale)
          )
        );

      return optionValueIds.map(
        (id) => results.find((t) => t.optionValueId === id) ?? null
      );
    });
  }
}
