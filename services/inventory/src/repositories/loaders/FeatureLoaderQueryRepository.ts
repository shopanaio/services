import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  productFeatureTranslation,
  productFeatureValue,
  productFeatureValueTranslation,
  type ProductFeatureTranslation,
  type ProductFeatureValue,
  type ProductFeatureValueTranslation,
} from "../models/index.js";

export class FeatureLoaderQueryRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  async getTranslationsByFeatureIds(
    featureIds: readonly string[]
  ): Promise<ProductFeatureTranslation[]> {
    return this.connection
      .select()
      .from(productFeatureTranslation)
      .where(
        and(
          eq(productFeatureTranslation.projectId, this.projectId),
          inArray(productFeatureTranslation.featureId, [...featureIds]),
          eq(productFeatureTranslation.locale, this.locale)
        )
      );
  }

  async getValueIdsByFeatureIds(
    featureIds: readonly string[]
  ): Promise<Array<{ id: string; featureId: string; sortIndex: number }>> {
    return this.connection
      .select({
        id: productFeatureValue.id,
        featureId: productFeatureValue.featureId,
        sortIndex: productFeatureValue.sortIndex,
      })
      .from(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.projectId),
          inArray(productFeatureValue.featureId, [...featureIds])
        )
      );
  }

  async getValuesByIds(valueIds: readonly string[]): Promise<ProductFeatureValue[]> {
    return this.connection
      .select()
      .from(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.projectId),
          inArray(productFeatureValue.id, [...valueIds])
        )
      );
  }

  async getValueTranslationsByValueIds(
    featureValueIds: readonly string[]
  ): Promise<ProductFeatureValueTranslation[]> {
    return this.connection
      .select()
      .from(productFeatureValueTranslation)
      .where(
        and(
          eq(productFeatureValueTranslation.projectId, this.projectId),
          inArray(productFeatureValueTranslation.featureValueId, [...featureValueIds]),
          eq(productFeatureValueTranslation.locale, this.locale)
        )
      );
  }
}
