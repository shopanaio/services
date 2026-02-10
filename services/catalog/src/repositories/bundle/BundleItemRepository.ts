import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  bundleItem,
  type BundleItem,
  type NewBundleItem,
} from "../models/index.js";

export class BundleItemRepository extends BaseRepository {
  async findById(id: string): Promise<BundleItem | null> {
    const rows = await this.connection
      .select()
      .from(bundleItem)
      .where(and(eq(bundleItem.projectId, this.storeId), eq(bundleItem.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByGroupId(groupId: string): Promise<BundleItem[]> {
    return this.connection
      .select()
      .from(bundleItem)
      .where(
        and(
          eq(bundleItem.projectId, this.storeId),
          eq(bundleItem.groupId, groupId)
        )
      )
      .orderBy(asc(bundleItem.sortIndex));
  }

  async findByGroupIds(groupIds: readonly string[]): Promise<BundleItem[]> {
    if (groupIds.length === 0) return [];
    return this.connection
      .select()
      .from(bundleItem)
      .where(
        and(
          eq(bundleItem.projectId, this.storeId),
          inArray(bundleItem.groupId, [...groupIds])
        )
      )
      .orderBy(asc(bundleItem.sortIndex));
  }

  async getByIds(ids: readonly string[]): Promise<BundleItem[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(bundleItem)
      .where(
        and(
          eq(bundleItem.projectId, this.storeId),
          inArray(bundleItem.id, [...ids])
        )
      );
  }

  async create(data: {
    groupId: string;
    itemType: string;
    sortIndex?: number;
    refProductId?: string | null;
    refVariantId?: string | null;
    title?: string | null;
    featuredImageId?: string | null;
    excludedVariantIds?: string[] | null;
    minQty?: number;
    maxQty?: number | null;
    defaultQty?: number;
    priceType?: string | null;
    priceValue?: number | null;
    pricingTemplateId?: string | null;
    visible?: boolean;
    selected?: boolean;
  }): Promise<BundleItem> {
    const now = new Date().toISOString();
    const insert: NewBundleItem = {
      id: randomUUID(),
      projectId: this.storeId,
      groupId: data.groupId,
      itemType: data.itemType,
      sortIndex: data.sortIndex ?? 0,
      refProductId: data.refProductId ?? null,
      refVariantId: data.refVariantId ?? null,
      title: data.title ?? null,
      featuredImageId: data.featuredImageId ?? null,
      excludedVariantIds: data.excludedVariantIds ?? null,
      minQty: data.minQty ?? 1,
      maxQty: data.maxQty ?? null,
      defaultQty: data.defaultQty ?? 1,
      priceType: data.priceType ?? null,
      priceValue: data.priceValue ?? null,
      pricingTemplateId: data.pricingTemplateId ?? null,
      visible: data.visible ?? true,
      selected: data.selected ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const rows = await this.connection.insert(bundleItem).values(insert).returning();
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<{
      title: string | null;
      featuredImageId: string | null;
      excludedVariantIds: string[] | null;
      minQty: number;
      maxQty: number | null;
      defaultQty: number;
      priceType: string | null;
      priceValue: number | null;
      pricingTemplateId: string | null;
      visible: boolean;
      selected: boolean;
      sortIndex: number;
    }>
  ): Promise<BundleItem | null> {
    const updates: Partial<NewBundleItem> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.title !== undefined) updates.title = data.title;
    if (data.featuredImageId !== undefined) updates.featuredImageId = data.featuredImageId;
    if (data.excludedVariantIds !== undefined) updates.excludedVariantIds = data.excludedVariantIds;
    if (data.minQty !== undefined) updates.minQty = data.minQty;
    if (data.maxQty !== undefined) updates.maxQty = data.maxQty;
    if (data.defaultQty !== undefined) updates.defaultQty = data.defaultQty;
    if (data.priceType !== undefined) updates.priceType = data.priceType;
    if (data.priceValue !== undefined) updates.priceValue = data.priceValue;
    if (data.pricingTemplateId !== undefined) updates.pricingTemplateId = data.pricingTemplateId;
    if (data.visible !== undefined) updates.visible = data.visible;
    if (data.selected !== undefined) updates.selected = data.selected;
    if (data.sortIndex !== undefined) updates.sortIndex = data.sortIndex;

    const rows = await this.connection
      .update(bundleItem)
      .set(updates)
      .where(and(eq(bundleItem.projectId, this.storeId), eq(bundleItem.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(bundleItem)
      .where(and(eq(bundleItem.projectId, this.storeId), eq(bundleItem.id, id)))
      .returning({ id: bundleItem.id });
    return rows.length > 0;
  }

  async getMaxSortIndex(groupId: string): Promise<number> {
    const result = await this.connection
      .select({ maxIndex: sql<number>`COALESCE(MAX(${bundleItem.sortIndex}), -1)` })
      .from(bundleItem)
      .where(
        and(
          eq(bundleItem.projectId, this.storeId),
          eq(bundleItem.groupId, groupId)
        )
      );
    return result[0]?.maxIndex ?? -1;
  }

  async updateSortIndex(id: string, sortIndex: number): Promise<void> {
    await this.connection
      .update(bundleItem)
      .set({ sortIndex, updatedAt: new Date().toISOString() })
      .where(and(eq(bundleItem.projectId, this.storeId), eq(bundleItem.id, id)));
  }

  async batchUpdateSortIndex(
    updates: Array<{ id: string; sortIndex: number }>
  ): Promise<void> {
    if (updates.length === 0) return;

    const now = new Date().toISOString();
    for (const update of updates) {
      await this.connection
        .update(bundleItem)
        .set({ sortIndex: update.sortIndex, updatedAt: now })
        .where(
          and(
            eq(bundleItem.projectId, this.storeId),
            eq(bundleItem.id, update.id)
          )
        );
    }
  }
}
