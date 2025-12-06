import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "./BaseRepository.js";
import {
  productFeature,
  productFeatureValue,
  type ProductFeature,
  type NewProductFeature,
  type ProductFeatureValue,
  type NewProductFeatureValue,
} from "./models";

export class FeatureRepository extends BaseRepository {
  // ─────────────────────────────────────────────────────────────────────────
  // Features
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Find feature by ID
   */
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

  /**
   * Find feature by slug for a product
   */
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

  /**
   * Find features by product ID
   */
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

  /**
   * Find features by multiple product IDs (batch)
   */
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

  /**
   * Create a new feature
   */
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

  /**
   * Update a feature
   */
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

  /**
   * Delete a feature (CASCADE will delete values, translations)
   */
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

  // ─────────────────────────────────────────────────────────────────────────
  // Feature Values
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Find value by ID
   */
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

  /**
   * Find values by feature ID
   */
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

  /**
   * Find values by multiple feature IDs (batch)
   */
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

  /**
   * Create a new feature value
   */
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

  /**
   * Update a feature value
   */
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

  /**
   * Delete a feature value
   */
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
}
