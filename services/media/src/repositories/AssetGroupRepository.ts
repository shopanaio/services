import { eq, and } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database";
import {
  assetGroups,
  type AssetGroup,
  type NewAssetGroup,
  type AssetOwnerType,
} from "./models";

// ---- Types ----

export interface CreateAssetGroupInput {
  id?: string;
  ownerType: AssetOwnerType;
  ownerId: string;
}

// ---- Repository ----

export class AssetGroupRepository {
  constructor(private readonly db: Database) {}

  // ---- Read methods ----

  /**
   * Find an asset group by ID
   */
  async findById(id: string): Promise<AssetGroup | null> {
    const result = await this.db
      .select()
      .from(assetGroups)
      .where(eq(assetGroups.id, id))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find an asset group by owner (type + id)
   */
  async findByOwner(
    ownerType: AssetOwnerType,
    ownerId: string
  ): Promise<AssetGroup | null> {
    const result = await this.db
      .select()
      .from(assetGroups)
      .where(
        and(
          eq(assetGroups.ownerType, ownerType),
          eq(assetGroups.ownerId, ownerId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Check if an asset group exists for owner
   */
  async existsByOwner(
    ownerType: AssetOwnerType,
    ownerId: string
  ): Promise<boolean> {
    const result = await this.db
      .select({ id: assetGroups.id })
      .from(assetGroups)
      .where(
        and(
          eq(assetGroups.ownerType, ownerType),
          eq(assetGroups.ownerId, ownerId)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  // ---- Write methods ----

  /**
   * Create a new asset group
   */
  async create(data: CreateAssetGroupInput): Promise<AssetGroup> {
    const id = data.id ?? crypto.randomUUID();

    const newAssetGroup: NewAssetGroup = {
      id,
      ownerType: data.ownerType,
      ownerId: data.ownerId,
    };

    const result = await this.db
      .insert(assetGroups)
      .values(newAssetGroup)
      .returning();

    return result[0];
  }

  /**
   * Delete an asset group by ID
   * Note: Files with this asset_group_id will be deleted via CASCADE
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(assetGroups).where(eq(assetGroups.id, id));
  }

  /**
   * Delete an asset group by owner (type + id)
   * Note: Files with this asset_group_id will be deleted via CASCADE
   */
  async deleteByOwner(
    ownerType: AssetOwnerType,
    ownerId: string
  ): Promise<void> {
    await this.db
      .delete(assetGroups)
      .where(
        and(
          eq(assetGroups.ownerType, ownerType),
          eq(assetGroups.ownerId, ownerId)
        )
      );
  }
}
