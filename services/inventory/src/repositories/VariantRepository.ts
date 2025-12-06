import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "./BaseRepository.js";
import { variant, type Variant, type NewVariant } from "./models";

export class VariantRepository extends BaseRepository {
  /**
   * Check if variant exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: variant.id })
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.projectId),
          eq(variant.id, id),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Find variant by ID
   */
  async findById(id: string): Promise<Variant | null> {
    const result = await this.db
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.projectId),
          eq(variant.id, id),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find variant by SKU
   */
  async findBySku(sku: string): Promise<Variant | null> {
    const result = await this.db
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.projectId),
          eq(variant.sku, sku),
          isNull(variant.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Find variants by product ID
   */
  async findByProductId(productId: string): Promise<Variant[]> {
    const result = await this.db
      .select()
      .from(variant)
      .where(
        and(
          eq(variant.projectId, this.projectId),
          eq(variant.productId, productId),
          isNull(variant.deletedAt)
        )
      );

    return result;
  }

  /**
   * Create a new variant
   */
  async create(
    productId: string,
    data: {
      sku?: string | null;
      externalSystem?: string | null;
      externalId?: string | null;
    } = {}
  ): Promise<Variant> {
    const id = randomUUID();
    const now = new Date();

    const newVariant: NewVariant = {
      projectId: this.projectId,
      productId,
      id,
      sku: data.sku ?? null,
      externalSystem: data.externalSystem ?? null,
      externalId: data.externalId ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await this.db
      .insert(variant)
      .values(newVariant)
      .returning();

    return result[0];
  }

  /**
   * Update variant
   */
  async update(
    id: string,
    data: {
      sku?: string | null;
      externalSystem?: string | null;
      externalId?: string | null;
    }
  ): Promise<Variant | null> {
    const updateData: Partial<NewVariant> = {
      updatedAt: new Date(),
    };

    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.externalSystem !== undefined) updateData.externalSystem = data.externalSystem;
    if (data.externalId !== undefined) updateData.externalId = data.externalId;

    const result = await this.db
      .update(variant)
      .set(updateData)
      .where(
        and(
          eq(variant.projectId, this.projectId),
          eq(variant.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  /**
   * Soft delete variant (set deletedAt timestamp)
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await this.db
      .update(variant)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(variant.projectId, this.projectId),
          eq(variant.id, id),
          isNull(variant.deletedAt)
        )
      )
      .returning({ id: variant.id });

    return result.length > 0;
  }

  /**
   * Hard delete variant (permanent deletion)
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(variant)
      .where(
        and(
          eq(variant.projectId, this.projectId),
          eq(variant.id, id)
        )
      )
      .returning({ id: variant.id });

    return result.length > 0;
  }
}
