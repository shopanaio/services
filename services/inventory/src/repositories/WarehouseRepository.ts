import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "./BaseRepository.js";
import { warehouses, type Warehouse, type NewWarehouse } from "./models";

export class WarehouseRepository extends BaseRepository {
  /**
   * Check if warehouse exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: warehouses.id })
      .from(warehouses)
      .where(and(eq(warehouses.projectId, this.projectId), eq(warehouses.id, id)))
      .limit(1);

    return result.length > 0;
  }

  /**
   * Find warehouse by ID
   */
  async findById(id: string): Promise<Warehouse | null> {
    const result = await this.db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.projectId, this.projectId), eq(warehouses.id, id)))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find warehouse by code
   */
  async findByCode(code: string): Promise<Warehouse | null> {
    const result = await this.db
      .select()
      .from(warehouses)
      .where(and(eq(warehouses.projectId, this.projectId), eq(warehouses.code, code)))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Clear default flag from all warehouses in project
   */
  async clearDefault(): Promise<void> {
    await this.db
      .update(warehouses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(eq(warehouses.projectId, this.projectId), eq(warehouses.isDefault, true))
      );
  }

  /**
   * Create a new warehouse
   */
  async create(data: { code: string; name: string; isDefault?: boolean }): Promise<Warehouse> {
    const id = randomUUID();
    const now = new Date();

    const newWarehouse: NewWarehouse = {
      projectId: this.projectId,
      id,
      code: data.code,
      name: data.name,
      isDefault: data.isDefault ?? false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.db
      .insert(warehouses)
      .values(newWarehouse)
      .returning();

    return result[0];
  }

  /**
   * Update an existing warehouse
   */
  async update(
    id: string,
    data: { code?: string; name?: string; isDefault?: boolean }
  ): Promise<Warehouse | null> {
    const updateData: Partial<NewWarehouse> = {
      updatedAt: new Date(),
    };

    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    const result = await this.db
      .update(warehouses)
      .set(updateData)
      .where(and(eq(warehouses.projectId, this.projectId), eq(warehouses.id, id)))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Delete a warehouse (CASCADE will delete warehouse_stock)
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(warehouses)
      .where(and(eq(warehouses.projectId, this.projectId), eq(warehouses.id, id)))
      .returning({ id: warehouses.id });

    return result.length > 0;
  }
}
