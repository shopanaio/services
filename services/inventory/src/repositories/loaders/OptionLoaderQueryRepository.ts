import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  productOptionTranslation,
  productOptionValue,
  productOptionValueTranslation,
  type ProductOptionTranslation,
  type ProductOptionValue,
  type ProductOptionValueTranslation,
} from "../models/index.js";

export class OptionLoaderQueryRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  async getTranslationsByOptionIds(
    optionIds: readonly string[]
  ): Promise<ProductOptionTranslation[]> {
    return this.connection
      .select()
      .from(productOptionTranslation)
      .where(
        and(
          eq(productOptionTranslation.projectId, this.projectId),
          inArray(productOptionTranslation.optionId, [...optionIds]),
          eq(productOptionTranslation.locale, this.locale)
        )
      );
  }

  async getValueIdsByOptionIds(
    optionIds: readonly string[]
  ): Promise<Array<{ id: string; optionId: string; sortIndex: number }>> {
    return this.connection
      .select({
        id: productOptionValue.id,
        optionId: productOptionValue.optionId,
        sortIndex: productOptionValue.sortIndex,
      })
      .from(productOptionValue)
      .where(
        and(
          eq(productOptionValue.projectId, this.projectId),
          inArray(productOptionValue.optionId, [...optionIds])
        )
      );
  }

  async getValuesByIds(valueIds: readonly string[]): Promise<ProductOptionValue[]> {
    return this.connection
      .select()
      .from(productOptionValue)
      .where(
        and(
          eq(productOptionValue.projectId, this.projectId),
          inArray(productOptionValue.id, [...valueIds])
        )
      );
  }

  async getValueTranslationsByValueIds(
    optionValueIds: readonly string[]
  ): Promise<ProductOptionValueTranslation[]> {
    return this.connection
      .select()
      .from(productOptionValueTranslation)
      .where(
        and(
          eq(productOptionValueTranslation.projectId, this.projectId),
          inArray(productOptionValueTranslation.optionValueId, [...optionValueIds]),
          eq(productOptionValueTranslation.locale, this.locale)
        )
      );
  }
}
