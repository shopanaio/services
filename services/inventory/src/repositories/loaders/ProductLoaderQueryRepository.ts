import { and, eq, inArray, isNull } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
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

export class ProductLoaderQueryRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  async getByIds(productIds: readonly string[]): Promise<Product[]> {
    return this.connection
      .select()
      .from(product)
      .where(
        and(
          eq(product.projectId, this.projectId),
          inArray(product.id, [...productIds]),
          isNull(product.deletedAt)
        )
      );
  }

  async getTranslationsByProductIds(
    productIds: readonly string[]
  ): Promise<ProductTranslation[]> {
    return this.connection
      .select()
      .from(productTranslation)
      .where(
        and(
          eq(productTranslation.projectId, this.projectId),
          inArray(productTranslation.productId, [...productIds]),
          eq(productTranslation.locale, this.locale)
        )
      );
  }

  async getOptionIdsByProductIds(
    productIds: readonly string[]
  ): Promise<Array<{ id: string; productId: string }>> {
    return this.connection
      .select({ id: productOption.id, productId: productOption.productId })
      .from(productOption)
      .where(
        and(
          eq(productOption.projectId, this.projectId),
          inArray(productOption.productId, [...productIds])
        )
      );
  }

  async getFeatureIdsByProductIds(
    productIds: readonly string[]
  ): Promise<Array<{ id: string; productId: string }>> {
    return this.connection
      .select({ id: productFeature.id, productId: productFeature.productId })
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.projectId),
          inArray(productFeature.productId, [...productIds])
        )
      );
  }

  async getOptionsByIds(optionIds: readonly string[]): Promise<ProductOption[]> {
    return this.connection
      .select()
      .from(productOption)
      .where(
        and(
          eq(productOption.projectId, this.projectId),
          inArray(productOption.id, [...optionIds])
        )
      );
  }

  async getFeaturesByIds(featureIds: readonly string[]): Promise<ProductFeature[]> {
    return this.connection
      .select()
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.projectId),
          inArray(productFeature.id, [...featureIds])
        )
      );
  }
}
