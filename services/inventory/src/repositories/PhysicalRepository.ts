import { BaseRepository } from "./BaseRepository.js";
import {
  itemDimensions,
  itemWeight,
  type ItemDimensions,
  type ItemWeight,
  type NewItemDimensions,
  type NewItemWeight,
} from "./models";

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
      projectId: this.projectId,
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
      projectId: this.projectId,
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
}
