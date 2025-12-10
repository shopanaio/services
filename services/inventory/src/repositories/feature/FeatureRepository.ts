import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  productFeature,
  productFeatureValue,
  productFeatureTranslation,
  productFeatureValueTranslation,
  type ProductFeature,
  type NewProductFeature,
  type ProductFeatureValue,
  type NewProductFeatureValue,
  type ProductFeatureTranslation,
  type ProductFeatureValueTranslation,
} from "../models/index.js";

export class FeatureRepository extends BaseRepository {
  private get locale(): string {
    return this.ctx.locale ?? "uk";
  }

  // ============ Features CRUD ============

  async findById(id: string): Promise<ProductFeature | null> {
    const result = await this.connection
      .select()
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.projectId),
          eq(productFeature.id, id)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findBySlug(productId: string, slug: string): Promise<ProductFeature | null> {
    const result = await this.connection
      .select()
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.projectId),
          eq(productFeature.productId, productId),
          eq(productFeature.slug, slug)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByProductId(productId: string): Promise<ProductFeature[]> {
    return this.connection
      .select()
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.projectId),
          eq(productFeature.productId, productId)
        )
      );
  }

  async findByProductIds(productIds: string[]): Promise<Map<string, ProductFeature[]>> {
    if (productIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.projectId),
          inArray(productFeature.productId, productIds)
        )
      );

    const map = new Map<string, ProductFeature[]>();
    for (const feature of results) {
      const existing = map.get(feature.productId) ?? [];
      existing.push(feature);
      map.set(feature.productId, existing);
    }
    return map;
  }

  async create(productId: string, data: { slug: string }): Promise<ProductFeature> {
    const id = randomUUID();

    const newFeature: NewProductFeature = {
      id,
      projectId: this.projectId,
      productId,
      slug: data.slug,
    };

    const result = await this.connection
      .insert(productFeature)
      .values(newFeature)
      .returning();

    return result[0];
  }

  async update(id: string, data: { slug?: string }): Promise<ProductFeature | null> {
    const updateData: Partial<NewProductFeature> = {};

    if (data.slug !== undefined) updateData.slug = data.slug;

    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }

    const result = await this.connection
      .update(productFeature)
      .set(updateData)
      .where(
        and(
          eq(productFeature.projectId, this.projectId),
          eq(productFeature.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.projectId),
          eq(productFeature.id, id)
        )
      )
      .returning({ id: productFeature.id });

    return result.length > 0;
  }

  // ============ Feature Values ============

  async findValueById(id: string): Promise<ProductFeatureValue | null> {
    const result = await this.connection
      .select()
      .from(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.projectId),
          eq(productFeatureValue.id, id)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findValuesByFeatureId(featureId: string): Promise<ProductFeatureValue[]> {
    return this.connection
      .select()
      .from(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.projectId),
          eq(productFeatureValue.featureId, featureId)
        )
      )
      .orderBy(productFeatureValue.sortIndex);
  }

  async findValuesByFeatureIds(
    featureIds: string[]
  ): Promise<Map<string, ProductFeatureValue[]>> {
    if (featureIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.projectId),
          inArray(productFeatureValue.featureId, featureIds)
        )
      )
      .orderBy(productFeatureValue.sortIndex);

    const map = new Map<string, ProductFeatureValue[]>();
    for (const value of results) {
      const existing = map.get(value.featureId) ?? [];
      existing.push(value);
      map.set(value.featureId, existing);
    }
    return map;
  }

  async createValue(
    featureId: string,
    data: { slug: string; sortIndex: number }
  ): Promise<ProductFeatureValue> {
    const id = randomUUID();

    const newValue: NewProductFeatureValue = {
      id,
      projectId: this.projectId,
      featureId,
      slug: data.slug,
      sortIndex: data.sortIndex,
    };

    const result = await this.connection
      .insert(productFeatureValue)
      .values(newValue)
      .returning();

    return result[0];
  }

  async updateValue(
    id: string,
    data: { slug?: string; sortIndex?: number }
  ): Promise<ProductFeatureValue | null> {
    const updateData: Partial<NewProductFeatureValue> = {};

    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.sortIndex !== undefined) updateData.sortIndex = data.sortIndex;

    if (Object.keys(updateData).length === 0) {
      return this.findValueById(id);
    }

    const result = await this.connection
      .update(productFeatureValue)
      .set(updateData)
      .where(
        and(
          eq(productFeatureValue.projectId, this.projectId),
          eq(productFeatureValue.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async deleteValue(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.projectId),
          eq(productFeatureValue.id, id)
        )
      )
      .returning({ id: productFeatureValue.id });

    return result.length > 0;
  }

  // ============ Loader ============

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
