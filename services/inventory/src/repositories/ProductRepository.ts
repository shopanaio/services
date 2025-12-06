import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { BaseRepository } from "./BaseRepository.js";
import { product, type Product, type NewProduct } from "./models";

export class ProductRepository extends BaseRepository {
  /**
   * Check if product exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .limit(1);

    return result.length > 0;
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<Product | null> {
    const result = await this.db
      .select()
      .from(product)
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Create a new product
   */
  async create(data: { publishedAt?: Date | null } = {}): Promise<Product> {
    const id = randomUUID();
    const now = new Date();

    const newProduct: NewProduct = {
      projectId: this.projectId,
      id,
      publishedAt: data.publishedAt ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const result = await this.db
      .insert(product)
      .values(newProduct)
      .returning();

    return result[0];
  }

  /**
   * Touch product (update updatedAt timestamp)
   */
  async touch(id: string): Promise<void> {
    await this.db
      .update(product)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id)
        )
      );
  }

  /**
   * Update product
   */
  async update(
    id: string,
    data: { publishedAt?: Date | null }
  ): Promise<Product | null> {
    const updateData: Partial<NewProduct> = {
      updatedAt: new Date(),
    };

    if (data.publishedAt !== undefined) updateData.publishedAt = data.publishedAt;

    const result = await this.db
      .update(product)
      .set(updateData)
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  /**
   * Soft delete product (set deletedAt timestamp)
   */
  async softDelete(id: string): Promise<boolean> {
    const result = await this.db
      .update(product)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .returning({ id: product.id });

    return result.length > 0;
  }

  /**
   * Hard delete product (permanent deletion, CASCADE will delete variants)
   */
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(product)
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id)
        )
      )
      .returning({ id: product.id });

    return result.length > 0;
  }

  /**
   * Publish product (set publishedAt to now)
   */
  async publish(id: string): Promise<Product | null> {
    const now = new Date();
    const result = await this.db
      .update(product)
      .set({ publishedAt: now, updatedAt: now })
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .returning();

    return result[0] ?? null;
  }

  /**
   * Unpublish product (set publishedAt to null)
   */
  async unpublish(id: string): Promise<Product | null> {
    const result = await this.db
      .update(product)
      .set({ publishedAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(product.projectId, this.projectId),
          eq(product.id, id),
          isNull(product.deletedAt)
        )
      )
      .returning();

    return result[0] ?? null;
  }
}
