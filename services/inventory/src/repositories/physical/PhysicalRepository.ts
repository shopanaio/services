import { and, eq, inArray } from "drizzle-orm";
import { BaseRepository } from "../BaseRepository.js";
import {
  itemDimensions,
  itemWeight,
  type ItemDimensions,
  type ItemWeight,
  type NewItemDimensions,
  type NewItemWeight,
} from "../models";

export class PhysicalRepository extends BaseRepository {
  /**
   * Upsert dimensions for a variant (variantId is PK)
   */
  async upsertDimensions(
    variantId: string,
    data: { wMm: number; lMm: number; hMm: number }
  ): Promise<ItemDimensions> {
    const newDimensions: NewItemDimensions = {
      variantId,
      projectId: this.storeId,
      wMm: data.wMm,
      lMm: data.lMm,
      hMm: data.hMm,
      displayUnit: "mm",
    };

    const result = await this.connection
      .insert(itemDimensions)
      .values(newDimensions)
      .onConflictDoUpdate({
        target: itemDimensions.variantId,
        set: {
          wMm: data.wMm,
          lMm: data.lMm,
          hMm: data.hMm,
        },
      })
      .returning();

    return result[0];
  }

  /**
   * Upsert weight for a variant (variantId is PK)
   */
  async upsertWeight(
    variantId: string,
    data: { weightGr: number }
  ): Promise<ItemWeight> {
    const newWeight: NewItemWeight = {
      variantId,
      projectId: this.storeId,
      weightGr: data.weightGr,
      displayUnit: "g",
    };

    const result = await this.connection
      .insert(itemWeight)
      .values(newWeight)
      .onConflictDoUpdate({
        target: itemWeight.variantId,
        set: {
          weightGr: data.weightGr,
        },
      })
      .returning();

    return result[0];
  }

  /**
   * Get dimensions for multiple variants (batch loader)
   */
  async getDimensionsByVariantIds(
    variantIds: readonly string[]
  ): Promise<ItemDimensions[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select()
      .from(itemDimensions)
      .where(
        and(
          eq(itemDimensions.projectId, this.storeId),
          inArray(itemDimensions.variantId, [...variantIds])
        )
      );
  }

  /**
   * Get weights for multiple variants (batch loader)
   */
  async getWeightsByVariantIds(
    variantIds: readonly string[]
  ): Promise<ItemWeight[]> {
    if (variantIds.length === 0) return [];

    return this.connection
      .select()
      .from(itemWeight)
      .where(
        and(
          eq(itemWeight.projectId, this.storeId),
          inArray(itemWeight.variantId, [...variantIds])
        )
      );
  }
}
