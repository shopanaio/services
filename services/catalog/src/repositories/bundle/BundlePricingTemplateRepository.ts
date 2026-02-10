import { and, asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  bundlePricingTemplate,
  type BundlePricingTemplate,
  type NewBundlePricingTemplate,
} from "../models/index.js";

export class BundlePricingTemplateRepository extends BaseRepository {
  async findById(id: string): Promise<BundlePricingTemplate | null> {
    const rows = await this.connection
      .select()
      .from(bundlePricingTemplate)
      .where(
        and(
          eq(bundlePricingTemplate.projectId, this.storeId),
          eq(bundlePricingTemplate.id, id)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByProductId(productId: string): Promise<BundlePricingTemplate[]> {
    return this.connection
      .select()
      .from(bundlePricingTemplate)
      .where(
        and(
          eq(bundlePricingTemplate.projectId, this.storeId),
          eq(bundlePricingTemplate.productId, productId)
        )
      )
      .orderBy(asc(bundlePricingTemplate.sortIndex));
  }

  async findByProductIds(productIds: string[]): Promise<BundlePricingTemplate[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(bundlePricingTemplate)
      .where(
        and(
          eq(bundlePricingTemplate.projectId, this.storeId),
          inArray(bundlePricingTemplate.productId, productIds)
        )
      )
      .orderBy(asc(bundlePricingTemplate.sortIndex));
  }

  async getByIds(ids: readonly string[]): Promise<BundlePricingTemplate[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(bundlePricingTemplate)
      .where(
        and(
          eq(bundlePricingTemplate.projectId, this.storeId),
          inArray(bundlePricingTemplate.id, [...ids])
        )
      );
  }

  async create(data: {
    productId: string;
    name: string;
    priceType: string;
    priceValue?: number | null;
    sortIndex?: number;
  }): Promise<BundlePricingTemplate> {
    const insert: NewBundlePricingTemplate = {
      id: randomUUID(),
      projectId: this.storeId,
      productId: data.productId,
      name: data.name,
      priceType: data.priceType,
      priceValue: data.priceValue ?? null,
      sortIndex: data.sortIndex ?? 0,
    };

    const rows = await this.connection
      .insert(bundlePricingTemplate)
      .values(insert)
      .returning();
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      priceType: string;
      priceValue: number | null;
      sortIndex: number;
    }>
  ): Promise<BundlePricingTemplate | null> {
    const updates: Partial<NewBundlePricingTemplate> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.priceType !== undefined) updates.priceType = data.priceType;
    if (data.priceValue !== undefined) updates.priceValue = data.priceValue;
    if (data.sortIndex !== undefined) updates.sortIndex = data.sortIndex;

    if (Object.keys(updates).length === 0) {
      return this.findById(id);
    }

    const rows = await this.connection
      .update(bundlePricingTemplate)
      .set(updates)
      .where(
        and(
          eq(bundlePricingTemplate.projectId, this.storeId),
          eq(bundlePricingTemplate.id, id)
        )
      )
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(bundlePricingTemplate)
      .where(
        and(
          eq(bundlePricingTemplate.projectId, this.storeId),
          eq(bundlePricingTemplate.id, id)
        )
      )
      .returning({ id: bundlePricingTemplate.id });
    return rows.length > 0;
  }
}
