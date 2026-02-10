import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "../BaseRepository.js";
import {
  bundleGroup,
  type BundleGroup,
  type NewBundleGroup,
} from "../models/index.js";

export class BundleGroupRepository extends BaseRepository {
  async findById(id: string): Promise<BundleGroup | null> {
    const rows = await this.connection
      .select()
      .from(bundleGroup)
      .where(and(eq(bundleGroup.projectId, this.storeId), eq(bundleGroup.id, id)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByProductId(productId: string): Promise<BundleGroup[]> {
    return this.connection
      .select()
      .from(bundleGroup)
      .where(
        and(
          eq(bundleGroup.projectId, this.storeId),
          eq(bundleGroup.productId, productId)
        )
      )
      .orderBy(asc(bundleGroup.sortIndex));
  }

  async findByProductIds(productIds: string[]): Promise<BundleGroup[]> {
    if (productIds.length === 0) return [];
    return this.connection
      .select()
      .from(bundleGroup)
      .where(
        and(
          eq(bundleGroup.projectId, this.storeId),
          inArray(bundleGroup.productId, productIds)
        )
      )
      .orderBy(asc(bundleGroup.sortIndex));
  }

  async getByIds(ids: readonly string[]): Promise<BundleGroup[]> {
    if (ids.length === 0) return [];
    return this.connection
      .select()
      .from(bundleGroup)
      .where(
        and(
          eq(bundleGroup.projectId, this.storeId),
          inArray(bundleGroup.id, [...ids])
        )
      );
  }

  async create(data: {
    productId: string;
    title: string;
    sortIndex?: number;
    minSelection?: number | null;
    maxSelection?: number | null;
  }): Promise<BundleGroup> {
    const now = new Date().toISOString();
    const insert: NewBundleGroup = {
      id: randomUUID(),
      projectId: this.storeId,
      productId: data.productId,
      title: data.title,
      sortIndex: data.sortIndex ?? 0,
      minSelection: data.minSelection ?? null,
      maxSelection: data.maxSelection ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const rows = await this.connection.insert(bundleGroup).values(insert).returning();
    return rows[0];
  }

  async update(
    id: string,
    data: Partial<{
      title: string;
      sortIndex: number;
      minSelection: number | null;
      maxSelection: number | null;
    }>
  ): Promise<BundleGroup | null> {
    const updates: Partial<NewBundleGroup> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.title !== undefined) updates.title = data.title;
    if (data.sortIndex !== undefined) updates.sortIndex = data.sortIndex;
    if (data.minSelection !== undefined) updates.minSelection = data.minSelection;
    if (data.maxSelection !== undefined) updates.maxSelection = data.maxSelection;

    const rows = await this.connection
      .update(bundleGroup)
      .set(updates)
      .where(and(eq(bundleGroup.projectId, this.storeId), eq(bundleGroup.id, id)))
      .returning();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.connection
      .delete(bundleGroup)
      .where(and(eq(bundleGroup.projectId, this.storeId), eq(bundleGroup.id, id)))
      .returning({ id: bundleGroup.id });
    return rows.length > 0;
  }

  async getMaxSortIndex(productId: string): Promise<number> {
    const result = await this.connection
      .select({ maxIndex: sql<number>`COALESCE(MAX(${bundleGroup.sortIndex}), -1)` })
      .from(bundleGroup)
      .where(
        and(
          eq(bundleGroup.projectId, this.storeId),
          eq(bundleGroup.productId, productId)
        )
      );
    return result[0]?.maxIndex ?? -1;
  }

  async updateSortIndex(id: string, sortIndex: number): Promise<void> {
    await this.connection
      .update(bundleGroup)
      .set({ sortIndex, updatedAt: new Date().toISOString() })
      .where(and(eq(bundleGroup.projectId, this.storeId), eq(bundleGroup.id, id)));
  }

  async batchUpdateSortIndex(
    updates: Array<{ id: string; sortIndex: number }>
  ): Promise<void> {
    if (updates.length === 0) return;

    const now = new Date().toISOString();
    for (const update of updates) {
      await this.connection
        .update(bundleGroup)
        .set({ sortIndex: update.sortIndex, updatedAt: now })
        .where(
          and(
            eq(bundleGroup.projectId, this.storeId),
            eq(bundleGroup.id, update.id)
          )
        );
    }
  }
}
