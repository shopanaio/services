import { and, eq, inArray, notInArray } from "drizzle-orm";
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
          eq(productFeature.projectId, this.storeId),
          eq(productFeature.id, id)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByIds(productId: string, ids: string[]): Promise<ProductFeature[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.storeId),
          eq(productFeature.productId, productId),
          inArray(productFeature.id, ids)
        )
      );
  }

  async findByProductId(productId: string): Promise<ProductFeature[]> {
    return this.connection
      .select()
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.storeId),
          eq(productFeature.productId, productId)
        )
      )
      .orderBy(productFeature.index);
  }

  async findBySlug(productId: string, slug: string): Promise<ProductFeature | null> {
    const result = await this.connection
      .select()
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.storeId),
          eq(productFeature.productId, productId),
          eq(productFeature.slug, slug)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findByProductIds(productIds: string[]): Promise<Map<string, ProductFeature[]>> {
    if (productIds.length === 0) return new Map();

    const results = await this.connection
      .select()
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.storeId),
          inArray(productFeature.productId, productIds)
        )
      )
      .orderBy(productFeature.index);

    const map = new Map<string, ProductFeature[]>();
    for (const feature of results) {
      const existing = map.get(feature.productId) ?? [];
      existing.push(feature);
      map.set(feature.productId, existing);
    }
    return map;
  }

  async create(
    productId: string,
    data: {
      slug: string;
      isGroup?: boolean;
      parentId?: string | null;
      index: number[];
    }
  ): Promise<ProductFeature> {
    const id = randomUUID();

    const newFeature: NewProductFeature = {
      id,
      projectId: this.storeId,
      productId,
      slug: data.slug,
      index: data.index,
      isGroup: data.isGroup ?? false,
      parentId: data.parentId ?? null,
    };

    const result = await this.connection
      .insert(productFeature)
      .values(newFeature)
      .returning();

    return result[0];
  }

  async update(
    id: string,
    data: {
      slug?: string;
      isGroup?: boolean;
      parentId?: string | null;
      index?: number[];
    }
  ): Promise<ProductFeature | null> {
    const updateData: Partial<NewProductFeature> = {};

    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.isGroup !== undefined) updateData.isGroup = data.isGroup;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.index !== undefined) updateData.index = data.index;

    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }

    const result = await this.connection
      .update(productFeature)
      .set(updateData)
      .where(
        and(
          eq(productFeature.projectId, this.storeId),
          eq(productFeature.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  async deleteExcept(productId: string, keepIds: string[]): Promise<void> {
    if (keepIds.length === 0) {
      await this.connection
        .delete(productFeature)
        .where(
          and(
            eq(productFeature.projectId, this.storeId),
            eq(productFeature.productId, productId)
          )
        );
    } else {
      await this.connection
        .delete(productFeature)
        .where(
          and(
            eq(productFeature.projectId, this.storeId),
            eq(productFeature.productId, productId),
            notInArray(productFeature.id, keepIds)
          )
        );
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.storeId),
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
          eq(productFeatureValue.projectId, this.storeId),
          eq(productFeatureValue.id, id)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  async findValueIdsByFeatureIds(featureIds: string[]): Promise<Map<string, string[]>> {
    if (featureIds.length === 0) return new Map();

    const rows = await this.connection
      .select({
        id: productFeatureValue.id,
        featureId: productFeatureValue.featureId,
      })
      .from(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.storeId),
          inArray(productFeatureValue.featureId, featureIds)
        )
      );

    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.featureId) ?? [];
      list.push(row.id);
      map.set(row.featureId, list);
    }
    return map;
  }

  async findValuesByFeatureId(featureId: string): Promise<ProductFeatureValue[]> {
    return this.connection
      .select()
      .from(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.storeId),
          eq(productFeatureValue.featureId, featureId)
        )
      )
      .orderBy(productFeatureValue.index);
  }

  async findValueBySlug(
    featureId: string,
    slug: string
  ): Promise<ProductFeatureValue | null> {
    const result = await this.connection
      .select()
      .from(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.storeId),
          eq(productFeatureValue.featureId, featureId),
          eq(productFeatureValue.slug, slug)
        )
      )
      .limit(1);

    return result[0] ?? null;
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
          eq(productFeatureValue.projectId, this.storeId),
          inArray(productFeatureValue.featureId, featureIds)
        )
      )
      .orderBy(productFeatureValue.index);

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
    data: { slug: string; index: number }
  ): Promise<ProductFeatureValue> {
    const id = randomUUID();

    const newValue: NewProductFeatureValue = {
      id,
      projectId: this.storeId,
      featureId,
      slug: data.slug,
      index: data.index,
    };

    const result = await this.connection
      .insert(productFeatureValue)
      .values(newValue)
      .returning();

    return result[0];
  }

  async updateValue(
    featureId: string,
    valueId: string,
    data: { slug?: string; index?: number }
  ): Promise<void> {
    const updateData: Partial<NewProductFeatureValue> = {};
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.index !== undefined) updateData.index = data.index;

    if (Object.keys(updateData).length === 0) {
      return;
    }

    await this.connection
      .update(productFeatureValue)
      .set(updateData)
      .where(
        and(
          eq(productFeatureValue.projectId, this.storeId),
          eq(productFeatureValue.id, valueId),
          eq(productFeatureValue.featureId, featureId)
        )
      );
  }

  async deleteValuesExcept(featureId: string, keepIds: string[]): Promise<void> {
    if (keepIds.length === 0) {
      await this.connection
        .delete(productFeatureValue)
        .where(
          and(
            eq(productFeatureValue.projectId, this.storeId),
            eq(productFeatureValue.featureId, featureId)
          )
        );
    } else {
      await this.connection
        .delete(productFeatureValue)
        .where(
          and(
            eq(productFeatureValue.projectId, this.storeId),
            eq(productFeatureValue.featureId, featureId),
            notInArray(productFeatureValue.id, keepIds)
          )
        );
    }
  }

  async deleteValue(id: string): Promise<boolean> {
    const result = await this.connection
      .delete(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.storeId),
          eq(productFeatureValue.id, id)
        )
      )
      .returning({ id: productFeatureValue.id });

    return result.length > 0;
  }

  // ============ Loaders ============

  async getTranslationsByFeatureIds(
    featureIds: readonly string[]
  ): Promise<ProductFeatureTranslation[]> {
    return this.connection
      .select()
      .from(productFeatureTranslation)
      .where(
        and(
          eq(productFeatureTranslation.projectId, this.storeId),
          inArray(productFeatureTranslation.featureId, [...featureIds]),
          eq(productFeatureTranslation.locale, this.locale)
        )
      );
  }

  async getValueIdsByFeatureIds(
    featureIds: readonly string[]
  ): Promise<Array<{ id: string; featureId: string; index: number }>> {
    return this.connection
      .select({
        id: productFeatureValue.id,
        featureId: productFeatureValue.featureId,
        index: productFeatureValue.index,
      })
      .from(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.storeId),
          inArray(productFeatureValue.featureId, [...featureIds])
        )
      )
      .orderBy(productFeatureValue.index);
  }

  async getValuesByIds(valueIds: readonly string[]): Promise<ProductFeatureValue[]> {
    return this.connection
      .select()
      .from(productFeatureValue)
      .where(
        and(
          eq(productFeatureValue.projectId, this.storeId),
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
          eq(productFeatureValueTranslation.projectId, this.storeId),
          inArray(productFeatureValueTranslation.featureValueId, [...featureValueIds]),
          eq(productFeatureValueTranslation.locale, this.locale)
        )
      );
  }

  async getChildIdsByParentIds(
    productIds: readonly string[],
    parentIds: readonly string[]
  ): Promise<
    Array<{ id: string; productId: string; parentId: string | null; index: number[] }>
  > {
    if (productIds.length === 0 || parentIds.length === 0) return [];

    return this.connection
      .select({
        id: productFeature.id,
        productId: productFeature.productId,
        parentId: productFeature.parentId,
        index: productFeature.index,
      })
      .from(productFeature)
      .where(
        and(
          eq(productFeature.projectId, this.storeId),
          inArray(productFeature.productId, [...productIds]),
          inArray(productFeature.parentId, [...parentIds])
        )
      )
      .orderBy(productFeature.index);
  }
}
